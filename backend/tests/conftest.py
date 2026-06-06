import pytest
import sys
import os
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app

@pytest.fixture
def client():
    """Returns a FastAPI TestClient instance."""
    with TestClient(app) as c:
        yield c
