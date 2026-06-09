import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import os

# Set environment variables for testing before importing anything else
os.environ["SUPABASE_URL"] = "http://localhost:8000"
os.environ["SUPABASE_SERVICE_KEY"] = "mock-key"
os.environ["GEMINI_API_KEY"] = "mock-gemini-key"
os.environ["ALLOW_DEGRADED_STARTUP"] = "1"
os.environ["REQUIRE_SUPABASE"] = "false"

def mock_classifier():
    with patch("backend.main.classifier_v3") as mock_cls_v3:
        yield mock_cls_v3

@pytest.fixture(autouse=True)
def mock_ml_models():
    with patch("backend.services.classifier_service.ClassifierService.load"), \
         patch("backend.services.ner_service.NERService.load"), \
         patch("backend.services.duplicate_service.DuplicateService.load"), \
         patch("backend.services.rag_service.RAGService.load"), \
         patch("backend.services.classifier_v3.ClassifierV3.load"):
        yield

@pytest.fixture(autouse=True)
def mock_supabase():
    with patch("backend.main.supabase") as mock_supa:
        # Provide default mock responses for Supabase
        mock_table = MagicMock()
        mock_supa.table.return_value = mock_table
        yield mock_supa

@pytest.fixture
def client():
    from backend.main import app
    with TestClient(app) as c:
        yield c

@pytest.fixture
def mock_gemini():
    with patch("backend.main.gemini_service") as mock_gemini_svc:
        mock_gemini_svc._initialized = True
        yield mock_gemini_svc

@pytest.fixture
def mock_classifier():
    with patch("backend.main.classifier_v3") as mock_cls_v3:
        yield mock_cls_v3
