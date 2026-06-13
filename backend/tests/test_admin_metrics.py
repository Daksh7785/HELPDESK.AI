import pytest
from unittest.mock import patch, MagicMock

# Import the FastAPI app
import main
from fastapi.testclient import TestClient

client = TestClient(main.app)

# Mock user data for dependency override
mock_admin_user = {
    "id": "admin-123",
    "email": "admin@example.com",
    "role": "admin",
    "company_id": "company-123",
}

mock_regular_user = {
    "id": "user-456",
    "email": "user@example.com",
    "role": "user",
    "company_id": "company-123",
}

def override_get_admin_user():
    return mock_admin_user

def override_get_regular_user():
    return mock_regular_user

# The mock CTE return structure
mock_cte_response = {
    "volume": [{"day": "2026-06-01T00:00:00", "count": 5}],
    "sla": [{"priority": "High", "sla_status": "breached", "count": 2}],
    "categories": [{"category": "Billing", "count": 10}],
    "agents": [{"assigned_team": "Billing Team", "open_tickets": 3}],
    "resolution": [{"bucket": "1-4h", "count": 7}],
    "overview": [{"status": "open", "count": 12}],
}


@pytest.fixture(autouse=True)
def force_mock_supabase():
    """Mock supabase to prevent actual DB calls."""
    original = main.supabase
    
    mock_supabase = MagicMock()
    # Mock the RPC call response
    mock_rpc_result = MagicMock()
    mock_rpc_result.execute.return_value = MagicMock(data=mock_cte_response)
    mock_supabase.rpc.return_value = mock_rpc_result
    
    main.supabase = mock_supabase
    yield
    main.supabase = original


def test_admin_metrics_success():
    """Test that an admin user can successfully fetch metrics via the CTE RPC."""
    # Override the dependency to return an admin user
    main.app.dependency_overrides[main.security_manager.get_current_user_profile] = override_get_admin_user
    
    response = client.get("/admin/metrics")
    assert response.status_code == 200
    
    data = response.json()
    assert "volume" in data
    assert "sla" in data
    assert "categories" in data
    assert "agents" in data
    assert "resolution" in data
    assert "overview" in data
    
    assert data["volume"][0]["count"] == 5
    assert data["categories"][0]["category"] == "Billing"
    
    # Clean up override
    main.app.dependency_overrides.clear()


def test_admin_metrics_forbidden_for_regular_user():
    """Test that a non-admin user gets a 403 Forbidden."""
    main.app.dependency_overrides[main.security_manager.get_current_user_profile] = override_get_regular_user
    
    response = client.get("/admin/metrics")
    assert response.status_code == 403
    assert "Admins only" in response.json()["detail"]
    
    # Clean up override
    main.app.dependency_overrides.clear()
