import pytest
import sys
from unittest.mock import MagicMock, patch
from fastapi import HTTPException

# Prevent heavy ML loading
sys.modules['backend.services.classifier_service'] = MagicMock()
sys.modules['backend.services.classifier_v2'] = MagicMock()
sys.modules['backend.services.classifier_v3'] = MagicMock()
sys.modules['backend.services.ner_service'] = MagicMock()
sys.modules['backend.services.duplicate_service'] = MagicMock()
sys.modules['backend.services.rag_service'] = MagicMock()
sys.modules['backend.services.sla_service'] = MagicMock()
sys.modules['backend.services.spam_detector_service'] = MagicMock()
sys.modules['backend.services.gemini_service'] = MagicMock()
sys.modules['backend.services.ocr_service'] = MagicMock()
sys.modules['supabase'] = MagicMock()
sys.modules['backend.auth.crypto'] = MagicMock()

# Now import main app
from fastapi.testclient import TestClient
from main import app, get_user_profile

client = TestClient(app)

def mock_unauthenticated():
    raise HTTPException(status_code=401, detail="Not authenticated")

def mock_standard_user():
    return {"role": "user", "company_id": "co_123"}

def mock_company_admin_co123():
    return {"role": "admin", "company_id": "co_123"}

def mock_company_admin_co999():
    return {"role": "admin", "company_id": "co_999"}

def mock_master_admin():
    return {"role": "master_admin", "company_id": "co_123"}

@pytest.fixture(autouse=True)
def clear_overrides():
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()

def test_unauthenticated_access_denied():
    app.dependency_overrides[get_user_profile] = mock_unauthenticated
    response = client.get("/admin/analytics/overview")
    assert response.status_code == 401

def test_standard_user_access_denied():
    app.dependency_overrides[get_user_profile] = mock_standard_user
    response = client.get("/admin/analytics/overview")
    assert response.status_code == 403
    response = client.get("/admin/analytics/overview?company_id=co_123")
    assert response.status_code == 403

def test_company_admin_platform_wide_access_denied():
    app.dependency_overrides[get_user_profile] = mock_company_admin_co123
    response = client.get("/admin/analytics/overview")
    assert response.status_code == 403
    
def test_company_admin_cross_tenant_access_denied():
    app.dependency_overrides[get_user_profile] = mock_company_admin_co123
    response = client.get("/admin/analytics/overview?company_id=co_999")
    assert response.status_code == 403

def test_company_admin_tenant_access_allowed():
    app.dependency_overrides[get_user_profile] = mock_company_admin_co123
    with patch("main.supabase", MagicMock()):
        response = client.get("/admin/analytics/overview?company_id=co_123")
        assert response.status_code != 403

def test_master_admin_platform_wide_access_allowed():
    app.dependency_overrides[get_user_profile] = mock_master_admin
    with patch("main.supabase", MagicMock()):
        response = client.get("/admin/analytics/overview")
        assert response.status_code != 403

def test_master_admin_cross_tenant_access_allowed():
    app.dependency_overrides[get_user_profile] = mock_master_admin
    with patch("main.supabase", MagicMock()):
        response = client.get("/admin/analytics/overview?company_id=co_999")
        assert response.status_code != 403
