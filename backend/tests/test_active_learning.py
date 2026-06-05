"""
Tests — Active Learning Pipeline (Issue #1931)
==============================================
Covers:
  - ActiveLearningService: correction logging, telemetry, hard-negative detection
  - Dataset preparation: dedup, noise filter, hard-negative mining, class balance
  - Model version registry: register, promote, rollback
  - Low-confidence pool: log, retrieve, annotate
  - Correction & drift statistics
  - Retraining pipeline: dataset-too-small guard, dry-run mode
  - API router: all endpoints (mocked AL service)

Run with:
    pytest backend/tests/test_active_learning.py -v
"""

from __future__ import annotations

import datetime
import json
import os
import sys
import uuid
import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient

# Ensure project root is on path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))


# ---------------------------------------------------------------------------
# Fixtures — temporary filesystem
# ---------------------------------------------------------------------------

@pytest.fixture()
def tmp_data_dir(tmp_path):
    """Patch all data paths inside active_learning_service to tmp_path."""
    import backend.services.active_learning_service as als_module

    original_paths = {
        "CORRECTIONS_LOG_PATH": als_module.CORRECTIONS_LOG_PATH,
        "LOW_CONFIDENCE_LOG_PATH": als_module.LOW_CONFIDENCE_LOG_PATH,
        "TRAINING_DATASET_PATH": als_module.TRAINING_DATASET_PATH,
        "MODEL_REGISTRY_PATH": als_module.MODEL_REGISTRY_PATH,
    }

    als_module.CORRECTIONS_LOG_PATH = tmp_path / "corrections_log.json"
    als_module.LOW_CONFIDENCE_LOG_PATH = tmp_path / "low_confidence_log.json"
    als_module.TRAINING_DATASET_PATH = tmp_path / "active_learning_dataset.json"
    als_module.MODEL_REGISTRY_PATH = tmp_path / "model_registry.json"

    yield tmp_path

    # Restore
    for k, v in original_paths.items():
        setattr(als_module, k, v)


@pytest.fixture()
def al_service(tmp_data_dir):
    from backend.services.active_learning_service import ActiveLearningService
    svc = ActiveLearningService()
    # Patch the paths on the instance as well (module-level vars already patched)
    import backend.services.active_learning_service as als_module
    svc  # re-uses module-level patched paths
    return svc


# ---------------------------------------------------------------------------
# Helper — seed corrections
# ---------------------------------------------------------------------------

def _seed_correction(svc, *, text="VPN not working", confidence=0.6, is_hard=False):
    conf = 0.85 if is_hard else confidence
    return svc.log_correction_with_telemetry(
        ticket_id=str(uuid.uuid4()),
        original_text=text,
        ocr_text="",
        original_prediction={"category": "General", "subcategory": "Incomplete Information"},
        corrected_prediction={"category": "Network", "subcategory": "VPN Connection"},
        changed_fields=["category"],
        confidence=conf,
        classifier_version="v1",
        tenant_id="test-tenant",
    )


# ===========================================================================
# 1. Correction logging & telemetry
# ===========================================================================

class TestCorrectionLogging:

    def test_logs_basic_correction(self, al_service, tmp_data_dir):
        entry = _seed_correction(al_service)
        assert entry["original_text"] == "VPN not working"
        assert entry["corrected_prediction"]["category"] == "Network"
        assert "timestamp" in entry
        assert "classifier_version" in entry
        assert "tenant_id" in entry

    def test_hard_negative_flagged_correctly(self, al_service, tmp_data_dir):
        """Confidence >= 0.75 → is_hard_negative should be True."""
        entry = _seed_correction(al_service, confidence=0.85, is_hard=True)
        assert entry["is_hard_negative"] is True

    def test_non_hard_negative(self, al_service, tmp_data_dir):
        entry = _seed_correction(al_service, confidence=0.55)
        assert entry["is_hard_negative"] is False

    def test_multiple_corrections_persisted(self, al_service, tmp_data_dir):
        for i in range(5):
            _seed_correction(al_service, text=f"Issue number {i} with VPN access")
        import backend.services.active_learning_service as m
        data = json.loads(m.CORRECTIONS_LOG_PATH.read_text())
        assert len(data) == 5

    def test_correction_survives_reload(self, al_service, tmp_data_dir):
        _seed_correction(al_service, text="Printer not found on network drive")
        from backend.services.active_learning_service import ActiveLearningService, _load_json
        import backend.services.active_learning_service as m
        reloaded = _load_json(m.CORRECTIONS_LOG_PATH, [])
        assert len(reloaded) == 1
        assert reloaded[0]["original_text"] == "Printer not found on network drive"


# ===========================================================================
# 2. Low-confidence pool
# ===========================================================================

class TestLowConfidencePool:

    def test_logs_below_threshold(self, al_service, tmp_data_dir):
        al_service.log_low_confidence_prediction(
            text="Screen flickering randomly",
            ocr_text="",
            predicted_category="Hardware",
            predicted_subcategory="Monitor Problem",
            confidence=0.45,
        )
        pool = al_service.get_unannotated_pool(limit=10)
        assert len(pool) == 1

    def test_ignores_above_threshold(self, al_service, tmp_data_dir):
        al_service.log_low_confidence_prediction(
            text="Blue screen of death on startup",
            ocr_text="",
            predicted_category="Hardware",
            predicted_subcategory="Blue Screen",
            confidence=0.75,  # >= LOW_CONF_QUERY_THRESHOLD (0.60)
        )
        pool = al_service.get_unannotated_pool()
        assert len(pool) == 0

    def test_pool_sorted_by_confidence(self, al_service, tmp_data_dir):
        for conf in [0.55, 0.30, 0.45]:
            al_service.log_low_confidence_prediction(
                text=f"Issue conf={conf}",
                ocr_text="",
                predicted_category="General",
                predicted_subcategory="Incomplete Information",
                confidence=conf,
            )
        pool = al_service.get_unannotated_pool(limit=10)
        confidences = [e["confidence"] for e in pool]
        assert confidences == sorted(confidences)

    def test_annotate_marks_entry(self, al_service, tmp_data_dir):
        al_service.log_low_confidence_prediction(
            text="My keyboard is dead",
            ocr_text="",
            predicted_category="Hardware",
            predicted_subcategory="Keyboard/Mouse",
            confidence=0.40,
        )
        pool = al_service.get_unannotated_pool()
        entry_id = pool[0]["id"]
        ok = al_service.mark_annotated(entry_id, "Hardware")
        assert ok is True

        remaining = al_service.get_unannotated_pool()
        assert len(remaining) == 0

    def test_annotate_unknown_id_returns_false(self, al_service):
        result = al_service.mark_annotated("nonexistent-id", "Software")
        assert result is False


# ===========================================================================
# 3. Dataset preparation
# ===========================================================================

class TestDatasetPreparation:

    def _seed_multiple(self, al_service, n=15):
        categories = ["Network", "Hardware", "Software", "Access"]
        for i in range(n):
            cat = categories[i % len(categories)]
            al_service.log_correction_with_telemetry(
                ticket_id=str(uuid.uuid4()),
                original_text=f"Unique issue description number {i} which is long enough",
                ocr_text="",
                original_prediction={"category": "General", "subcategory": "Incomplete Information"},
                corrected_prediction={"category": cat, "subcategory": "Test Sub"},
                changed_fields=["category"],
                confidence=0.6 + (i % 3) * 0.1,
            )

    def test_dataset_created(self, al_service, tmp_data_dir):
        self._seed_multiple(al_service)
        summary = al_service.prepare_training_dataset()
        assert summary["total_samples"] > 0

    def test_noise_filtered(self, al_service, tmp_data_dir):
        """Short texts (< NOISE_FILTER_MIN_CHARS) should be excluded."""
        al_service.log_correction_with_telemetry(
            ticket_id="noise-1",
            original_text="hi",  # too short
            ocr_text="",
            original_prediction={},
            corrected_prediction={"category": "Network", "subcategory": "DNS Problem"},
            changed_fields=["category"],
            confidence=0.5,
        )
        summary = al_service.prepare_training_dataset()
        assert summary["total_samples"] == 0

    def test_dedup_removes_duplicates(self, al_service, tmp_data_dir):
        for _ in range(5):
            al_service.log_correction_with_telemetry(
                ticket_id=str(uuid.uuid4()),
                original_text="Exact same ticket text repeated verbatim",
                ocr_text="",
                original_prediction={},
                corrected_prediction={"category": "Software", "subcategory": "Application Crash"},
                changed_fields=["category"],
                confidence=0.7,
            )
        summary = al_service.prepare_training_dataset()
        # Only 1 unique fingerprint should survive
        assert summary["total_samples"] == 1

    def test_hard_negatives_counted(self, al_service, tmp_data_dir):
        # Texts MUST differ in their first 40 chars to survive the dedup fingerprint.
        unique_texts = [
            "VPN timeout on login — hard negative case A",
            "Printer offline hard negative unique text B",
            "Blue screen crash hard negative example C!",
            "DNS resolution failing hard negative case D",
            "MFA prompt loop hard negative unique text E",
        ]
        for i, text in enumerate(unique_texts):
            _seed_correction(al_service, text=text, confidence=0.85)
        summary = al_service.prepare_training_dataset()
        assert summary["hard_negatives"] == 5

    def test_class_distribution_present(self, al_service, tmp_data_dir):
        self._seed_multiple(al_service)
        summary = al_service.prepare_training_dataset()
        assert isinstance(summary["class_distribution"], dict)
        assert len(summary["class_distribution"]) > 0


# ===========================================================================
# 4. Model Version Registry
# ===========================================================================

class TestModelRegistry:

    def test_register_version(self, al_service, tmp_data_dir):
        entry = al_service.register_model_version(
            version_tag="al-20260101-120000",
            model_path="/models/classifier",
            accuracy=0.87,
            metrics={"accuracy": 0.87},
            training_samples=200,
            promoted=True,
        )
        assert entry["version_tag"] == "al-20260101-120000"
        assert entry["promoted"] is True

    def test_current_version_returned(self, al_service, tmp_data_dir):
        al_service.register_model_version(
            version_tag="v1.0",
            model_path="/models/v1",
            accuracy=0.85,
            metrics={},
            training_samples=100,
            promoted=True,
        )
        current = al_service.get_current_version()
        assert current is not None
        assert current["version_tag"] == "v1.0"

    def test_promote_switches_version(self, al_service, tmp_data_dir):
        al_service.register_model_version(
            version_tag="v1.0", model_path="/m1", accuracy=0.85,
            metrics={}, training_samples=100, promoted=True,
        )
        al_service.register_model_version(
            version_tag="v2.0", model_path="/m2", accuracy=0.87,
            metrics={}, training_samples=150, promoted=False,
        )
        al_service.promote_model("v2.0")
        current = al_service.get_current_version()
        assert current["version_tag"] == "v2.0"

    def test_rollback_to_previous(self, al_service, tmp_data_dir):
        al_service.register_model_version(
            version_tag="v1.0", model_path="/m1", accuracy=0.85,
            metrics={}, training_samples=100, promoted=True,
        )
        al_service.register_model_version(
            version_tag="v2.0", model_path="/m2", accuracy=0.87,
            metrics={}, training_samples=150, promoted=True,
        )
        restored = al_service.rollback_to_previous()
        assert restored == "v1.0"
        assert al_service.get_current_version()["version_tag"] == "v1.0"

    def test_rollback_with_no_previous_returns_none(self, al_service, tmp_data_dir):
        al_service.register_model_version(
            version_tag="v1.0", model_path="/m1", accuracy=0.85,
            metrics={}, training_samples=100, promoted=True,
        )
        result = al_service.rollback_to_previous()
        assert result is None


# ===========================================================================
# 5. Statistics
# ===========================================================================

class TestStatistics:

    def test_correction_stats_empty(self, al_service, tmp_data_dir):
        stats = al_service.get_correction_statistics()
        assert stats["total_corrections"] == 0

    def test_correction_stats_populated(self, al_service, tmp_data_dir):
        for i in range(6):
            _seed_correction(al_service, confidence=0.85 if i < 2 else 0.5)
        stats = al_service.get_correction_statistics()
        assert stats["total_corrections"] == 6
        assert stats["hard_negative_count"] == 2
        assert "avg_confidence_on_correction" in stats
        assert "corrections_by_category" in stats

    def test_low_conf_stats(self, al_service, tmp_data_dir):
        for conf in [0.30, 0.45, 0.55]:
            al_service.log_low_confidence_prediction(
                text=f"Text with confidence {conf} which is long enough",
                ocr_text="",
                predicted_category="Hardware",
                predicted_subcategory="Monitor Problem",
                confidence=conf,
            )
        stats = al_service.get_low_confidence_statistics()
        assert stats["total_in_pool"] == 3
        assert stats["pending_annotation"] == 3
        assert stats["annotated"] == 0


# ===========================================================================
# 6. Retraining Pipeline Guards
# ===========================================================================

class TestRetrainingPipelineGuards:

    def test_skips_if_no_dataset(self, tmp_path):
        """Pipeline should return 'skipped' when no dataset file exists."""
        import backend.training.retraining_pipeline as rp_module

        orig = rp_module.TRAINING_DATASET_PATH
        rp_module.TRAINING_DATASET_PATH = tmp_path / "nonexistent.json"
        try:
            from backend.training.retraining_pipeline import run_retraining_pipeline
            result = run_retraining_pipeline(al_service=None, dry_run=False)
            assert result["status"] == "skipped"
        finally:
            rp_module.TRAINING_DATASET_PATH = orig

    def test_skips_if_too_few_samples(self, tmp_path):
        """Pipeline should return 'skipped' when < 10 samples in dataset."""
        from backend.training.retraining_pipeline import run_retraining_pipeline
        import backend.training.retraining_pipeline as rp_module

        dataset = {
            "version": "test",
            "created_at": "2026-01-01T00:00:00Z",
            "samples": [
                {"text": f"s{i}", "category": "Network", "subcategory": "VPN", "weight": 1.0}
                for i in range(5)
            ],
        }
        ds_path = tmp_path / "active_learning_dataset.json"
        ds_path.write_text(json.dumps(dataset))

        orig = rp_module.TRAINING_DATASET_PATH
        rp_module.TRAINING_DATASET_PATH = ds_path
        try:
            result = run_retraining_pipeline(al_service=None, dry_run=False)
            assert result["status"] == "skipped"
        finally:
            rp_module.TRAINING_DATASET_PATH = orig

    def test_dry_run_skips_training(self, tmp_path):
        """dry_run=True should skip actual training and return 'skipped'."""
        from backend.training.retraining_pipeline import run_retraining_pipeline
        import backend.training.retraining_pipeline as rp_module

        dataset = {
            "version": "test",
            "created_at": "2026-01-01T00:00:00Z",
            "samples": [
                {
                    "text": f"Long enough sample text number {i} with proper content",
                    "category": "Network",
                    "subcategory": "VPN Connection",
                    "weight": 1.0,
                    "is_hard_negative": False,
                }
                for i in range(15)
            ],
        }
        ds_path = tmp_path / "active_learning_dataset.json"
        ds_path.write_text(json.dumps(dataset))

        orig = rp_module.TRAINING_DATASET_PATH
        rp_module.TRAINING_DATASET_PATH = ds_path
        try:
            result = run_retraining_pipeline(al_service=None, dry_run=True)
            assert result["status"] == "skipped"
            assert "Dry run" in result["message"]
        finally:
            rp_module.TRAINING_DATASET_PATH = orig


# ===========================================================================
# 7. API Router
# ===========================================================================

@pytest.fixture()
def test_client(tmp_data_dir):
    """Test client with active_learning_service patched to use tmp data dir."""
    from fastapi import FastAPI
    from backend.routes.active_learning import router

    app = FastAPI()
    app.include_router(router)

    with patch.dict(os.environ, {"ADMIN_SECRET": ""}):  # disable auth in tests
        with TestClient(app) as client:
            yield client


class TestActiveLearningRouter:

    def test_status_endpoint(self, test_client):
        resp = test_client.get("/active-learning/status")
        assert resp.status_code == 200
        data = resp.json()
        assert "pipeline_active" in data
        assert "current_model" in data

    def test_retrain_status_initial(self, test_client):
        resp = test_client.get("/active-learning/retrain/status")
        assert resp.status_code == 200
        assert "in_progress" in resp.json()

    def test_dataset_prepare_endpoint(self, test_client):
        resp = test_client.get("/active-learning/dataset/prepare")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_model_registry_endpoint(self, test_client):
        resp = test_client.get("/active-learning/model/registry")
        assert resp.status_code == 200
        data = resp.json()
        assert "versions" in data

    def test_rollback_no_previous(self, test_client):
        resp = test_client.post("/active-learning/model/rollback")
        assert resp.status_code == 404

    def test_promote_unknown_version(self, test_client):
        resp = test_client.post("/active-learning/model/promote/ghost-version")
        assert resp.status_code == 404

    def test_get_annotation_pool_empty(self, test_client):
        resp = test_client.get("/active-learning/pool")
        assert resp.status_code == 200
        assert resp.json()["count"] == 0

    def test_annotate_unknown_entry(self, test_client):
        resp = test_client.post(
            "/active-learning/pool/nonexistent-id/annotate",
            json={"human_label": "Network"},
        )
        assert resp.status_code == 404

    def test_correction_stats_endpoint(self, test_client):
        resp = test_client.get("/active-learning/stats/corrections")
        assert resp.status_code == 200
        assert "total_corrections" in resp.json()

    def test_drift_stats_endpoint(self, test_client):
        resp = test_client.get("/active-learning/stats/drift")
        assert resp.status_code == 200
        assert "total_in_pool" in resp.json()

    def test_retrain_trigger_queues_job(self, test_client):
        resp = test_client.post(
            "/active-learning/retrain",
            json={"dry_run": True, "force": True},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "accepted"

    def test_retrain_conflict_returns_409(self, test_client):
        import backend.routes.active_learning as al_router
        al_router._retrain_in_progress = True
        try:
            resp = test_client.post(
                "/active-learning/retrain",
                json={"dry_run": True, "force": False},
            )
            assert resp.status_code == 409
        finally:
            al_router._retrain_in_progress = False
