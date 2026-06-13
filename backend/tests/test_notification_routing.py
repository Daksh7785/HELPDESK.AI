import sys
import os
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# Ensure project root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.services.notification_routing import (
    NotificationRoutingMiddleware,
    EmailDeliveryStatus,
    map_error_to_user_message,
)
from backend.main import app

class MockSupabaseClient:
    def __init__(self):
        self.table_name = None
        self.query_chain = []
        
        self.table_mock = MagicMock(return_value=self)
        self.select_mock = MagicMock(return_value=self)
        self.eq_mock = MagicMock(return_value=self)
        self.single_mock = MagicMock(return_value=self)
        self.upsert_mock = MagicMock(return_value=self)
        self.execute_mock = MagicMock()

    def table(self, name):
        self.table_name = name
        return self.table_mock(name)

    def select(self, *args, **kwargs):
        self.query_chain.append(("select", args, kwargs))
        return self.select_mock(*args, **kwargs)

    def eq(self, *args, **kwargs):
        self.query_chain.append(("eq", args, kwargs))
        return self.eq_mock(*args, **kwargs)

    def single(self, *args, **kwargs):
        self.query_chain.append(("single", args, kwargs))
        return self.single_mock(*args, **kwargs)

    def execute(self, *args, **kwargs):
        self.query_chain.append(("execute", args, kwargs))
        return self.execute_mock(*args, **kwargs)

    def upsert(self, *args, **kwargs):
        self.query_chain.append(("upsert", args, kwargs))
        return self.upsert_mock(*args, **kwargs)

@pytest.fixture
def mock_supabase():
    with patch("backend.services.notification_routing.create_client") as mock_create:
        client = MockSupabaseClient()
        mock_create.return_value = client
        yield client

def test_map_error_to_user_message():
    # Test known SMTP errors
    assert map_error_to_user_message("SMTP_550") == "Recipient email address appears invalid."
    assert map_error_to_user_message("smtp_421 ") == "Email service is temporarily unavailable. Please try again shortly."
    assert map_error_to_user_message("RATE_LIMIT") == "Too many emails sent recently. Please wait before retrying."
    
    # Test unknown error fallback
    assert map_error_to_user_message("SOME_WEIRD_ERROR") == "We couldn't deliver this email. Please try again."
    assert map_error_to_user_message(None) == "We couldn't deliver this email. Please try again."

def test_record_delivery_status_sent(mock_supabase):
    middleware = NotificationRoutingMiddleware()
    mock_supabase.execute_mock.return_value = MagicMock(data={"ok": True})
    
    res = middleware.record_delivery_status("test-notif-uuid", EmailDeliveryStatus.SENT)
    
    assert res["notification_id"] == "test-notif-uuid"
    assert res["status"] == "sent"
    assert "sent_at" in res
    assert "delivered_at" not in res
    assert "failed_at" not in res
    
    mock_supabase.table_mock.assert_called_with("notification_delivery_status")
    mock_supabase.upsert_mock.assert_called_once()

def test_record_delivery_status_failed(mock_supabase):
    middleware = NotificationRoutingMiddleware()
    mock_supabase.execute_mock.return_value = MagicMock(data={"ok": True})
    
    res = middleware.record_delivery_status(
        "test-notif-uuid",
        EmailDeliveryStatus.FAILED,
        error_code="SMTP_550",
        error_message="Hard bounce"
    )
    
    assert res["notification_id"] == "test-notif-uuid"
    assert res["status"] == "failed"
    assert res["error_code"] == "SMTP_550"
    assert res["error_message"] == "Hard bounce"
    assert res["user_error_message"] == "Recipient email address appears invalid."
    assert "failed_at" in res

def test_get_delivery_status(mock_supabase):
    middleware = NotificationRoutingMiddleware()
    mock_supabase.execute_mock.return_value = MagicMock(data={"notification_id": "123", "status": "delivered"})
    
    status = middleware.get_delivery_status("123")
    assert status == {"notification_id": "123", "status": "delivered"}
    
    # Check query construction
    mock_supabase.table_mock.assert_called_with("notification_delivery_status")
    mock_supabase.select_mock.assert_called_with("*")
    mock_supabase.eq_mock.assert_called_with("notification_id", "123")

def test_resend_notification_not_found(mock_supabase):
    middleware = NotificationRoutingMiddleware()
    # Mock notifications table returning no data
    mock_supabase.execute_mock.return_value = MagicMock(data=None)
    
    res = middleware.resend_notification("not-exist-uuid", "user-uuid")
    assert res["success"] is False
    assert res["status"] == "not_found"

def test_resend_notification_forbidden(mock_supabase):
    middleware = NotificationRoutingMiddleware()
    # Mock notifications table returning notification owned by someone else
    mock_supabase.execute_mock.return_value = MagicMock(data={"id": "notif-uuid", "user_id": "other-user-uuid", "status": "sent"})
    
    res = middleware.resend_notification("notif-uuid", "my-user-uuid")
    assert res["success"] is False
    assert res["status"] == "forbidden"

def test_resend_notification_not_failed(mock_supabase):
    middleware = NotificationRoutingMiddleware()
    
    # We mock execute to return:
    # 1. The notifications table record (owned by me)
    # 2. The delivery status record (status is delivered, not failed)
    mock_supabase.execute_mock.side_effect = [
        MagicMock(data={"id": "notif-uuid", "user_id": "my-user-uuid", "status": "sent"}),
        MagicMock(data={"notification_id": "notif-uuid", "status": "delivered"})
    ]
    
    res = middleware.resend_notification("notif-uuid", "my-user-uuid")
    assert res["success"] is False
    assert res["status"] == "delivered"
    assert "Only failed notifications can be resent" in res["message"]

def test_resend_notification_success(mock_supabase):
    middleware = NotificationRoutingMiddleware()
    
    # Mock notifications query returning ownership match
    # Mock get_delivery_status query returning status failed
    # Mock upsert execute returning success
    mock_supabase.execute_mock.side_effect = [
        MagicMock(data={"id": "notif-uuid", "user_id": "my-user-uuid", "status": "sent"}),
        MagicMock(data={"notification_id": "notif-uuid", "status": "failed", "error_code": "SMTP_550"}),
        MagicMock(data={"ok": True}) # upsert execution
    ]
    
    res = middleware.resend_notification("notif-uuid", "my-user-uuid")
    assert res["success"] is True
    assert res["status"] == "pending"

# ---------------------------------------------------------------------------
# API Endpoint Tests
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    return TestClient(app)

@patch("backend.main.supabase")
@patch("backend.services.notification_routing.load")
def test_endpoint_get_delivery_status_success(mock_load_router, mock_main_supabase, client):
    mock_router = MagicMock()
    mock_load_router.return_value = mock_router
    
    # Setup mock status
    mock_router.get_delivery_status.return_value = {
        "notification_id": "notif-uuid",
        "status": "failed",
        "error_code": "SMTP_550",
        "user_error_message": "Recipient email address appears invalid."
    }
    
    response = client.get("/notifications/notif-uuid/delivery-status")
    assert response.status_code == 200
    assert response.json()["status"] == "failed"
    mock_router.get_delivery_status.assert_called_once_with("notif-uuid")

@patch("backend.main.supabase")
@patch("backend.services.notification_routing.load")
def test_endpoint_get_delivery_status_not_found(mock_load_router, mock_main_supabase, client):
    mock_router = MagicMock()
    mock_load_router.return_value = mock_router
    mock_router.get_delivery_status.return_value = None
    
    response = client.get("/notifications/nonexistent/delivery-status")
    assert response.status_code == 404
    assert "Delivery status not found" in response.json()["detail"]

@patch("backend.main.supabase")
@patch("backend.services.notification_routing.load")
def test_endpoint_resend_notification_success(mock_load_router, mock_main_supabase, client):
    mock_router = MagicMock()
    mock_load_router.return_value = mock_router
    
    mock_router.resend_notification.return_value = {
        "success": True,
        "message": "Resend initiated. Status will update shortly.",
        "status": "pending"
    }
    
    response = client.post(
        "/notifications/notif-uuid/resend",
        json={"user_id": "my-user-uuid"}
    )
    assert response.status_code == 200
    assert response.json()["success"] is True
    mock_router.resend_notification.assert_called_once_with("notif-uuid", "my-user-uuid")

@patch("backend.main.supabase")
@patch("backend.services.notification_routing.load")
def test_endpoint_resend_notification_forbidden(mock_load_router, mock_main_supabase, client):
    mock_router = MagicMock()
    mock_load_router.return_value = mock_router
    
    mock_router.resend_notification.return_value = {
        "success": False,
        "message": "Not authorized.",
        "status": "forbidden"
    }
    
    response = client.post(
        "/notifications/notif-uuid/resend",
        json={"user_id": "other-user-uuid"}
    )
    assert response.status_code == 403
    assert "Not authorized." in response.json()["detail"]
