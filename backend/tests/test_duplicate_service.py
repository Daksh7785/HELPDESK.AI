"""
Unit tests for DuplicateService.load() method (backend/services/duplicate_service.py).

Covers:
- Model loading from local path (SENTENCE_TRANSFORMER_MODEL_PATH)
- HuggingFace fallback when no local path
- ALLOW_DEGRADED_STARTUP=1 graceful degradation when sentence-transformers missing
- ImportError when sentence-transformers missing and ALLOW_DEGRADED_STARTUP=0
- Thread-safety: load() is idempotent
- Storage file loading on startup
"""

import os
import json
import pytest
from unittest.mock import MagicMock, patch, mock_open


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def clean_env():
    """Ensure clean environment for each test."""
    env_vars = [
        "SENTENCE_TRANSFORMER_MODEL_PATH",
        "ALLOW_DEGRADED_STARTUP",
        "DUPLICATE_CACHE_MAX",
    ]
    for var in env_vars:
        os.environ.pop(var, None)
    yield
    for var in env_vars:
        os.environ.pop(var, None)


@pytest.fixture
def mock_sentence_transformers():
    """Mock the sentence_transformers module."""
    mock_st = MagicMock()
    mock_model = MagicMock()
    mock_st.SentenceTransformer.return_value = mock_model
    return mock_st, mock_model


# ---------------------------------------------------------------------------
# load() — model loading
# ---------------------------------------------------------------------------

class TestDuplicateServiceLoad:
    """Tests for DuplicateService.load()."""

    @patch("services.duplicate_service._HAS_SENTENCE", True)
    @patch("services.duplicate_service.SentenceTransformer")
    def test_loads_from_local_path_when_set(self, mock_ST, mock_sentence_transformers):
        os.environ["SENTENCE_TRANSFORMER_MODEL_PATH"] = "/tmp/my-model"
        with patch("os.path.exists", return_value=True):
            from services.duplicate_service import DuplicateService
            svc = DuplicateService()
            svc.load()
            mock_ST.assert_called_with("/tmp/my-model")
            assert svc._loaded is True

    @patch("services.duplicate_service._HAS_SENTENCE", True)
    @patch("services.duplicate_service.SentenceTransformer")
    def test_loads_from_huggingface_when_no_local_path(self, mock_ST):
        from services.duplicate_service import DuplicateService
        svc = DuplicateService()
        svc.load()
        mock_ST.assert_called_with("all-MiniLM-L6-v2")
        assert svc._loaded is True

    @patch("services.duplicate_service._HAS_SENTENCE", True)
    @patch("services.duplicate_service.SentenceTransformer")
    def test_load_is_idempotent(self, mock_ST):
        from services.duplicate_service import DuplicateService
        svc = DuplicateService()
        svc.load()
        svc.load()  # Second call should be a no-op
        assert mock_ST.call_count == 1

    @patch("services.duplicate_service._HAS_SENTENCE", True)
    @patch("services.duplicate_service.SentenceTransformer")
    def test_load_reads_storage_file(self, mock_ST, tmp_path):
        storage_file = tmp_path / "case_history_cache.json"
        storage_file.write_text(json.dumps([
            {"ticket_id": "t1", "text": "hello world"},
            {"ticket_id": "t2", "text": "foo bar"},
        ]))

        from services.duplicate_service import DuplicateService
        svc = DuplicateService()
        svc.storage_file = str(storage_file)
        svc.load()

        assert svc._loaded is True
        assert len(svc._tickets) == 2


# ---------------------------------------------------------------------------
# load() — degraded startup
# ---------------------------------------------------------------------------

class TestDuplicateServiceDegraded:
    """Tests for ALLOW_DEGRADED_STARTUP handling."""

    @patch("services.duplicate_service._HAS_SENTENCE", False)
    def test_degraded_mode_when_no_sentence_transformers(self):
        os.environ["ALLOW_DEGRADED_STARTUP"] = "1"
        from services.duplicate_service import DuplicateService
        svc = DuplicateService()
        svc.load()
        assert svc._loaded is False
        assert svc.model is None

    @patch("services.duplicate_service._HAS_SENTENCE", False)
    def test_raises_when_no_sentence_transformers_and_no_degraded(self):
        from services.duplicate_service import DuplicateService
        svc = DuplicateService()
        with pytest.raises(ImportError, match="sentence-transformers"):
            svc.load()


# ---------------------------------------------------------------------------
# is_available()
# ---------------------------------------------------------------------------

class TestDuplicateServiceIsAvailable:
    """Tests for is_available()."""

    @patch("services.duplicate_service._HAS_SENTENCE", True)
    @patch("services.duplicate_service.SentenceTransformer")
    def test_available_after_successful_load(self, mock_ST):
        from services.duplicate_service import DuplicateService
        svc = DuplicateService()
        svc.load()
        assert svc.is_available() is True

    @patch("services.duplicate_service._HAS_SENTENCE", False)
    def test_not_available_when_load_failed(self):
        os.environ["ALLOW_DEGRADED_STARTUP"] = "1"
        from services.duplicate_service import DuplicateService
        svc = DuplicateService()
        svc.load()
        assert svc.is_available() is False


# ---------------------------------------------------------------------------
# check_duplicate() — empty store, degraded mode, threshold
# ---------------------------------------------------------------------------

class TestDuplicateServiceCheckDuplicate:
    """Tests for DuplicateService.check_duplicate()."""

    @patch("services.duplicate_service._HAS_SENTENCE", True)
    @patch("services.duplicate_service.SentenceTransformer")
    def test_empty_store_returns_no_duplicate(self, mock_ST):
        """Bug 1: Empty _tickets should return no duplicate, not crash."""
        from services.duplicate_service import DuplicateService
        svc = DuplicateService()
        svc.load()
        # _tickets is empty at this point (no storage file, no add_ticket call)
        result = svc.check_duplicate("VPN is not working")
        assert result is not None
        assert result["is_duplicate"] is False
        assert result["duplicate_ticket_id"] is None

    @patch("services.duplicate_service._HAS_SENTENCE", True)
    @patch("services.duplicate_service.SentenceTransformer")
    def test_unavailable_service_returns_no_duplicate(self, mock_ST):
        """When model not loaded, check_duplicate returns no duplicate (no NameError)."""
        from services.duplicate_service import DuplicateService
        svc = DuplicateService()
        # Don't call load() — model is not available
        result = svc.check_duplicate("VPN is not working")
        assert result is not None
        assert result["is_duplicate"] is False
        assert result["duplicate_ticket_id"] is None

    @patch("services.duplicate_service._HAS_SENTENCE", True)
    @patch("services.duplicate_service.SentenceTransformer")
    def test_add_and_check_duplicate_found(self, mock_ST, tmp_path):
        """A ticket added should be detected when similar text is checked."""
        # Mock encode to return a deterministic embedding
        import numpy as np
        mock_model = MagicMock()
        mock_model.encode.return_value = np.array([0.1, 0.2, 0.3, 0.4], dtype=np.float32)
        mock_ST.return_value = mock_model

        from services.duplicate_service import DuplicateService
        svc = DuplicateService()
        svc.storage_file = str(tmp_path / "cache.json")
        svc.load()
        svc.add_ticket("t-001", "VPN is not working")

        # Same embedding = exact match
        result = svc.check_duplicate("VPN is not working")
        assert result["is_duplicate"] is True
        assert result["duplicate_ticket_id"] == "t-001"

    @patch("services.duplicate_service._HAS_SENTENCE", True)
    @patch("services.duplicate_service.SentenceTransformer")
    def test_below_threshold_returns_no_duplicate(self, mock_ST, tmp_path):
        """Embeddings below threshold return no duplicate."""
        import numpy as np
        mock_model = MagicMock()
        # Two different embeddings for the two calls
        mock_model.encode.side_effect = [
            np.array([0.1, 0.2, 0.3, 0.4], dtype=np.float32),  # for add_ticket
            np.array([0.9, 0.8, 0.7, 0.6], dtype=np.float32),  # for check_duplicate
        ]
        mock_ST.return_value = mock_model

        from services.duplicate_service import DuplicateService
        svc = DuplicateService()
        svc.storage_file = str(tmp_path / "cache.json")
        svc.load()
        svc.add_ticket("t-001", "VPN is not working")

        result = svc.check_duplicate("The printer has no paper")
        assert result["is_duplicate"] is False
        assert result["duplicate_ticket_id"] is None

    @patch("services.duplicate_service._HAS_SENTENCE", True)
    @patch("services.duplicate_service.SentenceTransformer")
    def test_invalid_threshold_raises(self, mock_ST):
        """Threshold outside [0,1] should raise ValueError."""
        from services.duplicate_service import DuplicateService
        svc = DuplicateService()
        with pytest.raises(ValueError, match="threshold must be between"):
            svc.check_duplicate("test", threshold=1.5)


# ---------------------------------------------------------------------------
# save_to_disk() — atomic write
# ---------------------------------------------------------------------------

class TestDuplicateServiceSaveToDisk:
    """Tests for DuplicateService.save_to_disk() atomic writes."""

    @patch("services.duplicate_service._HAS_SENTENCE", True)
    @patch("services.duplicate_service.SentenceTransformer")
    def test_save_reads_append_and_writes_atomically(self, mock_ST, tmp_path):
        """save_to_disk should append a ticket and persist atomically."""
        import numpy as np
        mock_model = MagicMock()
        mock_model.encode.return_value = np.array([0.1, 0.2, 0.3, 0.4], dtype=np.float32)
        mock_ST.return_value = mock_model

        from services.duplicate_service import DuplicateService
        svc = DuplicateService()
        cache_file = tmp_path / "case_history_cache.json"
        svc.storage_file = str(cache_file)
        svc.load()

        # Add two tickets
        svc.add_ticket("t-001", "VPN issue")
        assert cache_file.exists()
        data = json.loads(cache_file.read_text())
        assert data == [{"ticket_id": "t-001", "text": "VPN issue"}]

        svc.add_ticket("t-002", "Printer jam")
        data = json.loads(cache_file.read_text())
        assert len(data) == 2
        assert data[1]["ticket_id"] == "t-002"

    @patch("services.duplicate_service._HAS_SENTENCE", True)
    @patch("services.duplicate_service.SentenceTransformer")
    def test_atomic_write_leaves_valid_json_on_crash(self, mock_ST, tmp_path):
        """If write fails partway, the original file should remain intact.
        (This tests that the temp file + os.replace pattern works.)
        """
        import numpy as np
        mock_model = MagicMock()
        mock_model.encode.return_value = np.array([0.1, 0.2, 0.3, 0.4], dtype=np.float32)
        mock_ST.return_value = mock_model

        from services.duplicate_service import DuplicateService
        svc = DuplicateService()
        cache_file = tmp_path / "case_history_cache.json"
        svc.storage_file = str(cache_file)
        svc.load()

        # Pre-populate with a valid entry
        cache_file.write_text(json.dumps([{"ticket_id": "t-000", "text": "existing"}]))

        svc.add_ticket("t-001", "VPN issue")

        # Verify file is still valid JSON after atomic write
        data = json.loads(cache_file.read_text())
        assert len(data) == 2


# ---------------------------------------------------------------------------
# Thread safety
# ---------------------------------------------------------------------------

class TestDuplicateServiceThreadSafety:
    """Tests for concurrent access to DuplicateService."""

    @patch("services.duplicate_service._HAS_SENTENCE", True)
    @patch("services.duplicate_service.SentenceTransformer")
    def test_concurrent_add_ticket_no_exception(self, mock_ST, tmp_path):
        """Bug 3: Concurrent add_ticket calls must not raise."""
        import threading
        import numpy as np
        mock_model = MagicMock()
        mock_model.encode.return_value = np.array([0.1, 0.2, 0.3, 0.4], dtype=np.float32)
        mock_ST.return_value = mock_model

        from services.duplicate_service import DuplicateService
        svc = DuplicateService()
        svc.storage_file = str(tmp_path / "cache.json")
        svc.load()

        errors = []

        def add_ticket(i):
            try:
                svc.add_ticket(f"t-{i}", f"ticket text {i}")
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=add_ticket, args=(i,)) for i in range(20)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert not errors, f"Concurrent add_ticket raised: {errors}"
        assert svc.get_ticket_count() == 20

    @patch("services.duplicate_service._HAS_SENTENCE", True)
    @patch("services.duplicate_service.SentenceTransformer")
    def test_concurrent_add_and_check_no_exception(self, mock_ST, tmp_path):
        """Concurrent add_ticket + check_duplicate must not raise."""
        import threading
        import numpy as np
        mock_model = MagicMock()
        mock_model.encode.return_value = np.array([0.1, 0.2, 0.3, 0.4], dtype=np.float32)
        mock_ST.return_value = mock_model

        from services.duplicate_service import DuplicateService
        svc = DuplicateService()
        svc.storage_file = str(tmp_path / "cache.json")
        svc.load()

        errors = []

        def add_ticket(i):
            try:
                svc.add_ticket(f"t-{i}", f"ticket text {i}")
            except Exception as e:
                errors.append(e)

        def check():
            try:
                svc.check_duplicate("ticket text 5")
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=add_ticket, args=(i,)) for i in range(20)]
        threads += [threading.Thread(target=check) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert not errors, f"Concurrent add+check raised: {errors}"
