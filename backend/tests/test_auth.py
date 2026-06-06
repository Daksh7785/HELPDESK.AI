"""
Tests for auth endpoint email/password validation.
"""

import os
import sys
from unittest.mock import MagicMock, patch

for _mod in ["torch", "torch.nn", "torch.nn.functional", "transformers", "sentence_transformers"]:
    sys.modules[_mod] = MagicMock()

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture()
def client():
    with patch("backend.auth_cookie._anon_supabase") as mock_anon:
        mock_client = MagicMock()
        mock_anon.return_value = mock_client
        mock_client.auth.sign_in_with_password.side_effect = Exception("Invalid email or password.")
        mock_client.auth.sign_up.side_effect = Exception("Invalid signup details or email already in use.")
        yield TestClient(app), mock_client


@pytest.mark.parametrize("email", [
    "john@gmail.com",
    "john.doe@gmail.com",
    "john+test@gmail.com",
    "user.name+alias@domain.com",
    "dev_team+support@example.org",
    "x@y.co",
    "user@subdomain.example.com",
])
def test_login_valid_email_accepted(client, email):
    tc, _ = client
    response = tc.post("/auth/login", json={"email": email, "password": "password123"})
    assert response.status_code in (401, 503)
    if response.status_code == 401:
        assert response.json()["detail"] == "Invalid email or password."
    elif response.status_code == 503:
        assert response.json().get("detail")


@pytest.mark.parametrize("email", [
    "john@",
    "@gmail.com",
    "invalid-email",
    "john@gmail",
    "john doe@gmail.com",
    "john%2Btest@gmail.com",
    "",
    "   ",
    "' OR '1'='1@evil.com",
    "<script>alert(1)</script>@x.com",
    "a" * 255 + "@example.com",
])
def test_login_invalid_email_rejected(client, email):
    tc, _ = client
    response = tc.post("/auth/login", json={"email": email, "password": "password123"})
    assert response.status_code == 422
    assert "Invalid email format" in str(response.json())


@pytest.mark.parametrize("email", [
    "new.user+alias@gmail.com",
    "signup_test@example.org",
])
def test_signup_valid_email_accepted(client, email):
    tc, _ = client
    response = tc.post("/auth/signup", json={"email": email, "password": "password123"})
    assert response.status_code in (400, 503)
    if response.status_code == 400:
        assert response.json()["detail"] == "Invalid signup details or email already in use."
    elif response.status_code == 503:
        assert response.json().get("detail")


@pytest.mark.parametrize("email", [
    "invalid@",
    "@domain.com",
    "no-at-sign",
    "john%2Bencoded@example.com",
    "a" * 255 + "@example.com",
])
def test_signup_invalid_email_rejected(client, email):
    tc, _ = client
    response = tc.post("/auth/signup", json={"email": email, "password": "password123"})
    assert response.status_code == 422
    assert "Invalid email format" in str(response.json())


@pytest.mark.parametrize("password,description", [
    ("",        "empty password"),
    ("   ",     "whitespace-only password"),
    ("abc",     "too short"),
    ("1234567", "7-char below minimum"),
])
def test_login_invalid_password_rejected(client, password, description):
    tc, _ = client
    response = tc.post("/auth/login", json={"email": "user@example.com", "password": password})
    assert response.status_code == 422, f"{description} was accepted"


@pytest.mark.parametrize("password,description", [
    ("",      "empty password"),
    ("short", "too short"),
    ("   ",   "whitespace only"),
])
def test_signup_invalid_password_rejected(client, password, description):
    tc, _ = client
    response = tc.post("/auth/signup", json={"email": "user@example.com", "password": password})
    assert response.status_code == 422, f"{description} was accepted"


@pytest.mark.parametrize("payload,description", [
    ({},                          "empty body"),
    ({"email": "a@b.com"},        "missing password"),
    ({"password": "password123"}, "missing email"),
])
def test_login_missing_fields_rejected(client, payload, description):
    tc, _ = client
    response = tc.post("/auth/login", json=payload)
    assert response.status_code == 422, f"Login {description} returned {response.status_code}"


@pytest.mark.parametrize("payload,description", [
    ({},                          "empty body"),
    ({"email": "a@b.com"},        "missing password"),
    ({"password": "password123"}, "missing email"),
])
def test_signup_missing_fields_rejected(client, payload, description):
    tc, _ = client
    response = tc.post("/auth/signup", json=payload)
    assert response.status_code == 422, f"Signup {description} returned {response.status_code}"
