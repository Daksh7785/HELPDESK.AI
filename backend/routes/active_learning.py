"""
Active Learning API Router — Issue #1933
"""

from __future__ import annotations

import asyncio
import datetime
import os
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Header
from pydantic import BaseModel

from backend.services.active_learning_service import active_learning_service

router = APIRouter(prefix="/active-learning", tags=["Active Learning"])

_last_retrain_result: dict[str, Any] = {}
_retrain_in_progress: bool = False


def _require_admin(x_admin_key: str | None = Header(default=None)) -> None:
    secret = os.environ.get("ADMIN_SECRET", "")
    if secret and x_admin_key != secret:
        raise HTTPException(status_code=403, detail="Admin access required.")


class AnnotationRequest(BaseModel):
    human_label: str


class RetrainRequest(BaseModel):
    dry_run: bool = False
    force: bool = False


async def _run_retrain_background(dry_run: bool) -> None:
    global _retrain_in_progress, _last_retrain_result
    _retrain_in_progress = True
    _last_retrain_result = {
        "status": "running",
        "started_at": datetime.datetime.utcnow().isoformat() + "Z",
    }
    try:
        active_learning_service.prepare_training_dataset()
        from backend.training.retraining_pipeline import run_retraining_pipeline
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: run_retraining_pipeline(al_service=active_learning_service, dry_run=dry_run),
        )
        _last_retrain_result = {**result, "completed_at": datetime.datetime.utcnow().isoformat() + "Z"}
    except Exception as exc:
        _last_retrain_result = {
            "status": "error",
            "error": str(exc),
            "completed_at": datetime.datetime.utcnow().isoformat() + "Z",
        }
        print(f"[AL ROUTER] Retraining error: {exc}")
    finally:
        _retrain_in_progress = False


@router.get("/status")
async def pipeline_status():
    return {
        "pipeline_active": True,
        "retrain_in_progress": _retrain_in_progress,
        "current_model": active_learning_service.get_current_version(),
        "last_retrain": _last_retrain_result,
        "correction_stats": active_learning_service.get_correction_statistics(),
        "low_confidence_stats": active_learning_service.get_low_confidence_statistics(),
    }


@router.post("/retrain")
async def trigger_retrain(
    body: RetrainRequest,
    background_tasks: BackgroundTasks,
    _: None = Depends(_require_admin),
):
    global _retrain_in_progress
    if _retrain_in_progress and not body.force:
        raise HTTPException(
            status_code=409,
            detail="A retraining job is already in progress. Pass force=true to override.",
        )
    background_tasks.add_task(_run_retrain_background, body.dry_run)
    return {"status": "accepted", "dry_run": body.dry_run,
            "message": "Retraining queued. Poll /active-learning/retrain/status."}


@router.get("/retrain/status")
async def retrain_status():
    return {"in_progress": _retrain_in_progress, "result": _last_retrain_result}


@router.get("/dataset/prepare")
async def prepare_dataset(_: None = Depends(_require_admin)):
    try:
        summary = active_learning_service.prepare_training_dataset()
        return {"status": "ok", "summary": summary}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/model/registry")
async def get_model_registry(_: None = Depends(_require_admin)):
    return active_learning_service.get_registry()


@router.post("/model/rollback")
async def rollback_model(_: None = Depends(_require_admin)):
    restored = active_learning_service.rollback_to_previous()
    if restored is None:
        raise HTTPException(status_code=404, detail="No previous model version available.")
    return {"status": "rolled_back", "restored_version": restored}


@router.post("/model/promote/{version_tag}")
async def promote_model(version_tag: str, _: None = Depends(_require_admin)):
    success = active_learning_service.promote_model(version_tag)
    if not success:
        raise HTTPException(status_code=404, detail=f"Version '{version_tag}' not found.")
    return {"status": "promoted", "version_tag": version_tag}


@router.get("/pool")
async def get_annotation_pool(limit: int = 20, _: None = Depends(_require_admin)):
    pool = active_learning_service.get_unannotated_pool(limit=limit)
    return {"count": len(pool), "items": pool}


@router.post("/pool/{entry_id}/annotate")
async def annotate_pool_entry(
    entry_id: str, body: AnnotationRequest, _: None = Depends(_require_admin)
):
    ok = active_learning_service.mark_annotated(entry_id, body.human_label)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Pool entry '{entry_id}' not found.")
    return {"status": "annotated", "entry_id": entry_id, "label": body.human_label}


@router.get("/stats/corrections")
async def correction_statistics():
    return active_learning_service.get_correction_statistics()


@router.get("/stats/drift")
async def drift_statistics():
    return active_learning_service.get_low_confidence_statistics()
