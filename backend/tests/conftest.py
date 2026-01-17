"""
Pytest configuration and fixtures for testing
"""
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from src.main import app
from src.models.tables import Base
from src.core.database import get_db


# Use a test database URL (in-memory SQLite for tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def test_engine():
    """Create a test database engine"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def test_session(test_engine):
    """Create a test database session"""
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def client(test_session):
    """Create a test client with database override"""
    async def override_get_db():
        yield test_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def sample_lifter_profile():
    """Sample lifter profile for testing"""
    return {
        "id": "test_user_123",
        "name": "Test Lifter",
        "biometrics": {
            "bodyweight": 80.0,
            "unit": "kg",
            "sex": "male",
            "age": 28
        },
        "oneRepMax": {
            "squat": 180.0,
            "bench": 120.0,
            "deadlift": 220.0
        }
    }


@pytest.fixture
def sample_program_request():
    """Sample program generation request"""
    return {
        "goal": "strength_block",
        "weeks": 8,
        "daysPerWeek": 4,
        "limitations": ["Lower back tightness"],
        "focusAreas": ["Squat depth", "Bench lockout"]
    }


@pytest.fixture
def gemini_api_key():
    """Get Gemini API key from environment"""
    return os.getenv("GEMINI_API_KEY", "")


@pytest.fixture
def has_gemini_api_key(gemini_api_key):
    """Check if Gemini API key is available"""
    return gemini_api_key and gemini_api_key != ""
