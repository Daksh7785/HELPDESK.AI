import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    """Returns a FastAPI TestClient instance."""
    with TestClient(app) as c:
        yield c
