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


@pytest.fixture
def sample_extended_lifter_profile():
    """Sample extended lifter profile for multi-agent testing"""
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
        },
        "trainingAge": "intermediate",
        "weakPoints": ["lockout", "off_chest"],
        "equipmentAccess": "commercial",
        "preferredSessionLength": 60,
        "competitionDate": None,
        "methodologyId": "westside"
    }


@pytest.fixture
def sample_extended_profile():
    """Alias for sample_extended_lifter_profile (for consistency)"""
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
        },
        "trainingAge": "intermediate",
        "weakPoints": ["lockout", "off_chest"],
        "equipmentAccess": "commercial",
        "preferredSessionLength": 60,
        "competitionDate": None,
        "methodologyId": "westside"
    }


@pytest.fixture
def sample_methodology():
    """Sample methodology for testing"""
    from datetime import datetime
    from src.models.tables import TrainingMethodology

    return TrainingMethodology(
        id="test_westside",
        name="Westside Conjugate",
        description="Max effort and dynamic effort training system",
        category="advanced",
        system_prompt_template="You are a Westside Barbell coach specializing in conjugate method.",
        programming_rules={
            "max_effort_rotation": "weekly",
            "dynamic_effort_percentage": "50-60",
            "accessory_volume": "high",
            "sets_range": "3-5",
        },
        knowledge_base={
            "quote": "Special exercises cure special weaknesses - Louie Simmons",
            "principles": ["Rotating max effort exercises", "Speed work with accommodating resistance"],
        },
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )


@pytest.fixture
def sample_exercises():
    """Sample exercise list for testing"""
    from datetime import datetime
    from src.models.tables import Exercise

    return [
        Exercise(
            id="floor_press",
            name="Floor Press",
            category="bench",
            variation_type="floor",
            equipment=["barbell", "bench"],
            targets_weak_points=["lockout"],
            movement_pattern="horizontal_push",
            complexity="intermediate",
            coaching_cues="No leg drive, focus on triceps",
            created_at=datetime.utcnow(),
        ),
        Exercise(
            id="box_squat",
            name="Box Squat",
            category="squat",
            variation_type="box",
            equipment=["barbell", "rack", "box"],
            targets_weak_points=["hole", "explosiveness"],
            movement_pattern="squat",
            complexity="intermediate",
            coaching_cues="Sit back, explode up",
            created_at=datetime.utcnow(),
        ),
        Exercise(
            id="deficit_deadlift",
            name="Deficit Deadlift",
            category="deadlift",
            variation_type="deficit",
            equipment=["barbell", "platform"],
            targets_weak_points=["starting_strength"],
            movement_pattern="hinge",
            complexity="advanced",
            coaching_cues="Maintain position from lower starting point",
            created_at=datetime.utcnow(),
        ),
    ]


@pytest_asyncio.fixture
async def mock_db_session():
    """Mock database session for unit tests that don't need real DB"""
    from unittest.mock import AsyncMock, MagicMock

    mock_session = MagicMock()
    mock_session.execute = AsyncMock()
    mock_session.commit = AsyncMock()
    mock_session.rollback = AsyncMock()
    mock_session.add = MagicMock()

    return mock_session


@pytest.fixture
def sample_readiness_check():
    """Sample readiness check data"""
    from uuid import uuid4

    return {
        "userId": str(uuid4()),
        "programId": str(uuid4()),
        "weekNumber": 1,
        "dayNumber": 1,
        "sleepQuality": 4,
        "stressLevel": 2,
        "soreness_fatigue": 4,
    }


@pytest.fixture
def sample_agent_message():
    """Sample agent message request"""
    return {
        "message": "How do I improve my bench lockout?",
        "currentProgramId": None,
    }
