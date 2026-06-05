"""
Active Learning API Router — Issue #1931
========================================
REST endpoints for the active-learning & continuous retraining pipeline.

  GET  /active-learning/status                 — pipeline + model status
  POST /active-learning/retrain                — trigger async retraining
  GET  /active-learning/retrain/status         — poll last retrain job result
  GET  /active-learning/dataset/prepare        — prepare training dataset
  GET  /active-learning/model/registry         — full model version history
  POST /active-learning/model/rollback         — rollback to previous version
  POST /active-learning/model/promote/{tag}    — manually promote a version
  GET  /active-learning/pool                   — unannotated low-conf pool
  POST /active-learning/pool/{id}/annotate     — submit human annotation
  GET  /active-learning/stats/corrections      — correction statistics
  GET  /active-learning/stats/drift            — low-confidence pool stats
"""

from __future__ import annotations

import asyncio
import datetime
import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.services.active_learning_service import active_learning_service

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/active-learning", tags=["Active Learning"])

# ---------------------------------------------------------------------------
# In-memory last-retrain job state (lives for server lifetime)
# ---------------------------------------------------------------------------
_last_retrain_result: dict[str, Any] = {}
_retrain_in_progress: bool = False


# ---------------------------------------------------------------------------
# Auth helper — reuses the same admin-key pattern as the rest of the app
# ---------------------------------------------------------------------------
def _require_admin(x_admin_key: str | None = Header(default=None)) -> None:
    """
    Lightweight admin guard.  The frontend sends X-Admin-Key matching
    the ADMIN_SECRET env var set in backend/.env.
    If no secret is configured, all requests pass (dev mode).
    """
    import os
    secret = os.environ.get("ADMIN_SECRET", "")
    if secret and x_admin_key != secret:
        raise HTTPException(status_code=403, detail="Admin access required.")


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class AnnotationRequest(BaseModel):
    human_label: str


class RetrainRequest(BaseModel):
    dry_run: bool = False
    force: bool = False  # skip in-progress guard


# ---------------------------------------------------------------------------
# Background task helper
# ---------------------------------------------------------------------------
async def _run_retrain_background(dry_run: bool) -> None:
    global _retrain_in_progress, _last_retrain_result

    _retrain_in_progress = True
    _last_retrain_result = {"status": "running", "started_at": datetime.datetime.utcnow().isoformat() + "Z"}

    try:
        # Prepare dataset first
        active_learning_service.prepare_training_dataset()

        # Import pipeline lazily to avoid slowing down startup
        from backend.training.retraining_pipeline import run_retraining_pipeline

        # Run in thread pool so we don't block the event loop
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: run_retraining_pipeline(
                al_service=active_learning_service,
                dry_run=dry_run,
            ),
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


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/status")
async def pipeline_status():
    """
    High-level health check for the active-learning pipeline:
    current model version, last retrain outcome, pool sizes.
    """
    current_model = active_learning_service.get_current_version()
    corr_stats = active_learning_service.get_correction_statistics()
    lc_stats = active_learning_service.get_low_confidence_statistics()

    return {
        "pipeline_active": True,
        "retrain_in_progress": _retrain_in_progress,
        "current_model": current_model,
        "last_retrain": _last_retrain_result,
        "correction_stats": corr_stats,
        "low_confidence_stats": lc_stats,
    }


@router.post("/retrain")
async def trigger_retrain(
    body: RetrainRequest,
    background_tasks: BackgroundTasks,
    _: None = Depends(_require_admin),
):
    """
    Kick off an async retraining job.
    Returns immediately with a job token; poll /active-learning/retrain/status.
    """
    global _retrain_in_progress

    if _retrain_in_progress and not body.force:
        raise HTTPException(
            status_code=409,
            detail="A retraining job is already in progress. Pass force=true to override.",
        )

    background_tasks.add_task(_run_retrain_background, body.dry_run)
    return {
        "status": "accepted",
        "dry_run": body.dry_run,
        "message": "Retraining job queued. Poll /active-learning/retrain/status for progress.",
    }


@router.get("/retrain/status")
async def retrain_status():
    """Poll the result of the last retraining job."""
    return {
        "in_progress": _retrain_in_progress,
        "result": _last_retrain_result,
    }


@router.get("/dataset/prepare")
async def prepare_dataset(_: None = Depends(_require_admin)):
    """
    Synchronously prepare the active-learning training dataset from
    corrections + annotated low-confidence pool.
    """
    try:
        summary = active_learning_service.prepare_training_dataset()
        return {"status": "ok", "summary": summary}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/model/registry")
async def get_model_registry(_: None = Depends(_require_admin)):
    """Return the complete model version registry."""
    return active_learning_service.get_registry()


@router.post("/model/rollback")
async def rollback_model(_: None = Depends(_require_admin)):
    """
    Roll back production to the previously promoted model version.
    Returns the restored version tag.
    """
    restored = active_learning_service.rollback_to_previous()
    if restored is None:
        raise HTTPException(
            status_code=404,
            detail="No previous model version available for rollback.",
        )
    return {"status": "rolled_back", "restored_version": restored}


@router.post("/model/promote/{version_tag}")
async def promote_model(version_tag: str, _: None = Depends(_require_admin)):
    """Manually promote a registered model version to production."""
    success = active_learning_service.promote_model(version_tag)
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Version '{version_tag}' not found in registry.",
        )
    return {"status": "promoted", "version_tag": version_tag}


@router.get("/pool")
async def get_annotation_pool(
    limit: int = 20,
    _: None = Depends(_require_admin),
):
    """
    Return the top `limit` unannotated low-confidence predictions
    sorted by ascending confidence (most uncertain first).
    """
    pool = active_learning_service.get_unannotated_pool(limit=limit)
    return {"count": len(pool), "items": pool}


@router.post("/pool/{entry_id}/annotate")
async def annotate_pool_entry(
    entry_id: str,
    body: AnnotationRequest,
    _: None = Depends(_require_admin),
):
    """Submit a human annotation for a low-confidence prediction."""
    ok = active_learning_service.mark_annotated(entry_id, body.human_label)
    if not ok:
        raise HTTPException(
            status_code=404,
            detail=f"Pool entry '{entry_id}' not found or already annotated.",
        )
    return {"status": "annotated", "entry_id": entry_id, "label": body.human_label}


@router.get("/stats/corrections")
async def correction_statistics():
    """Aggregate statistics over the corrections log."""
    return active_learning_service.get_correction_statistics()


@router.get("/stats/drift")
async def drift_statistics():
    """Low-confidence pool statistics — proxy for data drift signal."""
    return active_learning_service.get_low_confidence_statistics()
