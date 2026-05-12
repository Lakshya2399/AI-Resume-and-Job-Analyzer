import pytest
from fastapi.testclient import TestClient
from app.core.database import init_db
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def initialise_db():
    """Initialise in-memory test database once for the whole test session."""
    init_db(":memory:")


@pytest.fixture
def client():
    return TestClient(app)
