"""
Unit tests for Multi-Agent System
Tests BaseAgent, RouterAgent, ProgrammerAgent, and AnalystAgent with mocked Gemini calls
"""
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import json

from src.services.base_agent import BaseAgent
from src.services.router_agent import RouterAgent
from src.services.programmer_agent import ProgrammerAgent
from src.services.analyst_agent import AnalystMentorAgent
from src.models.tables import TrainingMethodology, Exercise
from src.models.schemas import ExtendedLifterProfileSchema, ProgramGenerationRequest


@pytest_asyncio.fixture
async def mock_db_session():
    """Create a mock database session"""
    session = AsyncMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.execute = AsyncMock()
    return session


@pytest_asyncio.fixture
def sample_extended_profile():
    """Sample extended lifter profile"""
    return ExtendedLifterProfileSchema(
        id="test_user_123",
        name="Test Lifter",
        biometrics={
            "bodyweight": 185.0,
            "unit": "lbs",
            "sex": "male",
            "age": 28
        },
        oneRepMax={
            "squat": 405.0,
            "bench": 285.0,
            "deadlift": 495.0
        },
        trainingAge="intermediate",
        weakPoints=["lockout", "off_chest"],
        equipmentAccess="commercial",
        preferredSessionLength=90,
        methodologyId="westside_conjugate"
    )


@pytest_asyncio.fixture
def sample_methodology():
    """Sample training methodology"""
    return TrainingMethodology(
        id="westside_conjugate",
        name="Westside Conjugate",
        description="Max effort and dynamic effort training",
        category="advanced",
        system_prompt_template="You are a Westside coach...",
        programming_rules={
            "frequency": "4x per week",
            "max_effort_rotation": "weekly"
        },
        knowledge_base={
            "quotes": ["Special exercises cure special weaknesses"],
            "weak_point_strategies": {
                "lockout": "Board press, floor press"
            }
        }
    )


@pytest_asyncio.fixture
def sample_exercises():
    """Sample exercise list"""
    return [
        Exercise(
            id="competition_squat",
            name="Competition Squat",
            category="squat",
            variation_type="competition",
            equipment=["barbell", "rack"],
            targets_weak_points=["hole", "quad_strength"],
            movement_pattern="vertical",
            complexity="beginner",
            coaching_cues="Keep chest up"
        ),
        Exercise(
            id="pause_bench",
            name="Pause Bench Press",
            category="bench",
            variation_type="pause",
            equipment=["barbell", "bench"],
            targets_weak_points=["off_chest"],
            movement_pattern="horizontal_push",
            complexity="intermediate",
            coaching_cues="Hold at chest"
        )
    ]


# ============================================================================
# RouterAgent Tests
# ============================================================================

@pytest.mark.asyncio
async def test_router_classifies_technique_question(mock_db_session):
    """Test router correctly classifies technique questions"""
    router = RouterAgent(api_key="test_key", db_session=mock_db_session)

    mock_response = json.dumps({
        "intent": "technique_question",
        "confidence": 0.95,
        "reasoning": "User asking about improving bench lockout",
        "suggestedAgent": "analyst_mentor",
        "requiresProgramContext": False
    })

    with patch.object(router, '_call_gemini', return_value=mock_response):
        result = await router.process(
            user_input={"message": "How do I improve my bench lockout?"},
            context={"has_program": False, "methodology": None}
        )

    assert result["intent"] == "technique_question"
    assert result["suggestedAgent"] == "analyst_mentor"
    assert router.should_route_to_analyst(result) is True


@pytest.mark.asyncio
async def test_router_classifies_program_generation(mock_db_session):
    """Test router correctly classifies program generation requests"""
    router = RouterAgent(api_key="test_key", db_session=mock_db_session)

    mock_response = json.dumps({
        "intent": "program_generation",
        "confidence": 0.98,
        "reasoning": "User wants to create a new training program",
        "suggestedAgent": "programmer",
        "requiresProgramContext": False
    })

    with patch.object(router, '_call_gemini', return_value=mock_response):
        result = await router.process(
            user_input={"message": "Generate a 12-week powerlifting program"},
            context={"has_program": False, "methodology": None}
        )

    assert result["intent"] == "program_generation"
    assert result["suggestedAgent"] == "programmer"
    assert router.should_route_to_programmer(result) is True


@pytest.mark.asyncio
async def test_router_classifies_program_adjustment(mock_db_session):
    """Test router correctly classifies program adjustment requests"""
    router = RouterAgent(api_key="test_key", db_session=mock_db_session)

    mock_response = json.dumps({
        "intent": "program_adjustment",
        "confidence": 0.92,
        "reasoning": "User wants to modify existing workout",
        "suggestedAgent": "feedback",
        "requiresProgramContext": True
    })

    with patch.object(router, '_call_gemini', return_value=mock_response):
        result = await router.process(
            user_input={"message": "Today's workout was too hard"},
            context={"has_program": True, "methodology": "westside"}
        )

    assert result["intent"] == "program_adjustment"
    assert result["requiresProgramContext"] is True
    assert router.should_route_to_feedback(result) is True


# ============================================================================
# ProgrammerAgent Tests
# ============================================================================

@pytest.mark.asyncio
async def test_programmer_loads_methodology_with_caching(
    mock_db_session, sample_methodology
):
    """Test programmer agent loads and caches methodology"""
    programmer = ProgrammerAgent(api_key="test_key", db_session=mock_db_session)

    mock_result = MagicMock()
    mock_result.scalar_one.return_value = sample_methodology
    mock_db_session.execute.return_value = mock_result

    methodology = await programmer._load_methodology("westside_conjugate")

    assert methodology.name == "Westside Conjugate"
    assert programmer.cache_get("methodology_westside_conjugate") is not None

    cached_methodology = await programmer._load_methodology("westside_conjugate")
    assert cached_methodology == methodology
    assert mock_db_session.execute.call_count == 1


@pytest.mark.asyncio
async def test_programmer_filters_exercises_by_equipment(
    mock_db_session, sample_extended_profile, sample_methodology, sample_exercises
):
    """Test programmer filters exercises based on equipment access"""
    programmer = ProgrammerAgent(api_key="test_key", db_session=mock_db_session)

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = sample_exercises
    mock_db_session.execute.return_value = mock_result

    exercises = await programmer._get_exercises_for_profile(
        sample_extended_profile, sample_methodology
    )

    assert len(exercises) == 2
    for ex in exercises:
        assert set(ex.equipment).issubset(
            {"barbell", "rack", "bench", "dumbbells", "cable", "machines"}
        )


@pytest.mark.asyncio
async def test_programmer_filters_by_training_age(mock_db_session):
    """Test programmer filters exercises by training age complexity"""
    programmer = ProgrammerAgent(api_key="test_key", db_session=mock_db_session)

    available_equipment = programmer._get_available_equipment("commercial")

    assert "barbell" in available_equipment
    assert "rack" in available_equipment
    assert "bands" not in available_equipment
    assert "chains" not in available_equipment


# ============================================================================
# AnalystAgent Tests
# ============================================================================

@pytest.mark.asyncio
async def test_analyst_loads_methodology_knowledge(
    mock_db_session, sample_methodology
):
    """Test analyst agent loads methodology knowledge base"""
    analyst = AnalystMentorAgent(api_key="test_key", db_session=mock_db_session)

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = sample_methodology
    mock_db_session.execute.return_value = mock_result

    knowledge = await analyst._load_methodology_knowledge("westside_conjugate")

    assert knowledge["methodology_name"] == "Westside Conjugate"
    assert "quotes" in knowledge["knowledge_base"]
    assert knowledge["knowledge_base"]["quotes"][0] == "Special exercises cure special weaknesses"


@pytest.mark.asyncio
async def test_analyst_responds_to_technique_question(
    mock_db_session, sample_extended_profile
):
    """Test analyst provides coaching advice"""
    analyst = AnalystMentorAgent(api_key="test_key", db_session=mock_db_session)

    mock_response = "To improve your bench lockout, focus on board press and floor press exercises..."

    with patch.object(analyst, '_call_gemini', return_value=mock_response):
        with patch.object(analyst, '_load_methodology_knowledge', return_value={}):
            result = await analyst.process(
                user_input={"message": "How do I improve my bench lockout?"},
                context={"profile": sample_extended_profile}
            )

    assert "response" in result
    assert len(result["response"]) > 0
    assert result["agent_type"] == "analyst_mentor"


@pytest.mark.asyncio
async def test_analyst_system_prompt_includes_methodology(
    mock_db_session
):
    """Test analyst system prompt includes methodology knowledge"""
    analyst = AnalystMentorAgent(api_key="test_key", db_session=mock_db_session)

    context = {
        "methodology_knowledge": {
            "methodology_name": "Westside Conjugate",
            "knowledge_base": {
                "quotes": ["Special exercises cure special weaknesses"]
            }
        }
    }

    prompt = analyst.get_system_prompt(context)

    assert "Westside Conjugate" in prompt
    assert "READ-ONLY" in prompt
    assert "Special exercises cure special weaknesses" in prompt


# ============================================================================
# BaseAgent Tests
# ============================================================================

@pytest.mark.asyncio
async def test_base_agent_caching(mock_db_session):
    """Test base agent cache get/set functionality"""

    class TestAgent(BaseAgent):
        def get_system_prompt(self, context):
            return "test prompt"

        async def process(self, user_input, context):
            return {}

    agent = TestAgent(api_key="test_key", db_session=mock_db_session)

    assert agent.cache_get("test_key") is None

    agent.cache_set("test_key", "test_value")
    assert agent.cache_get("test_key") == "test_value"


@pytest.mark.asyncio
async def test_base_agent_logs_conversation(mock_db_session):
    """Test base agent logs conversations to database"""

    class TestAgent(BaseAgent):
        def get_system_prompt(self, context):
            return "test prompt"

        async def process(self, user_input, context):
            return {}

    agent = TestAgent(api_key="test_key", db_session=mock_db_session)

    await agent._log_conversation(
        user_id="user_123",
        agent_type="test_agent",
        user_message="test message",
        agent_response="test response",
        intent_classification={"intent": "test"},
        context={"key": "value"}
    )

    assert mock_db_session.add.called
    assert mock_db_session.commit.called


# ============================================================================
# Integration Tests (Mocked)
# ============================================================================

@pytest.mark.asyncio
async def test_full_routing_flow(
    mock_db_session, sample_extended_profile
):
    """Test complete flow from router to analyst"""
    router = RouterAgent(api_key="test_key", db_session=mock_db_session)
    analyst = AnalystMentorAgent(api_key="test_key", db_session=mock_db_session)

    router_response = json.dumps({
        "intent": "technique_question",
        "confidence": 0.95,
        "reasoning": "User asking about technique",
        "suggestedAgent": "analyst_mentor",
        "requiresProgramContext": False
    })

    analyst_response = "Focus on board press for lockout strength..."

    with patch.object(router, '_call_gemini', return_value=router_response):
        classification = await router.process(
            user_input={"message": "How do I improve lockout?"},
            context={"has_program": False, "methodology": None}
        )

    assert router.should_route_to_analyst(classification)

    with patch.object(analyst, '_call_gemini', return_value=analyst_response):
        with patch.object(analyst, '_load_methodology_knowledge', return_value={}):
            result = await analyst.process(
                user_input={"message": "How do I improve lockout?"},
                context={"profile": sample_extended_profile}
            )

    assert result["agent_type"] == "analyst_mentor"
    assert len(result["response"]) > 0


# ============================================================================
# Additional Edge Case Tests
# ============================================================================

@pytest.mark.asyncio
async def test_router_handles_low_confidence_classification(mock_db_session):
    """Test router behavior with low confidence scores"""
    router = RouterAgent(api_key="test_key", db_session=mock_db_session)

    mock_response = json.dumps({
        "intent": "general_chat",
        "confidence": 0.45,
        "reasoning": "Unclear user intent",
        "suggestedAgent": "analyst_mentor",
        "requiresProgramContext": False
    })

    with patch.object(router, '_call_gemini', return_value=mock_response):
        result = await router.process(
            user_input={"message": "umm, hey there"},
            context={"has_program": False, "methodology": None}
        )

    assert result["confidence"] < 0.5
    assert router.should_route_to_analyst(result)


@pytest.mark.asyncio
async def test_router_requires_program_context_flag(mock_db_session):
    """Test router correctly identifies when program context is needed"""
    router = RouterAgent(api_key="test_key", db_session=mock_db_session)

    mock_response = json.dumps({
        "intent": "program_adjustment",
        "confidence": 0.88,
        "reasoning": "User wants to adjust existing program",
        "suggestedAgent": "feedback",
        "requiresProgramContext": True
    })

    with patch.object(router, '_call_gemini', return_value=mock_response):
        result = await router.process(
            user_input={"message": "This workout is too hard"},
            context={"has_program": True, "methodology": "westside"}
        )

    assert result["requiresProgramContext"] is True


@pytest.mark.asyncio
async def test_programmer_handles_missing_methodology(mock_db_session):
    """Test programmer raises error when methodology not found"""
    programmer = ProgrammerAgent(api_key="test_key", db_session=mock_db_session)

    mock_result = MagicMock()
    mock_result.scalar_one.side_effect = Exception("Methodology not found")
    mock_db_session.execute.return_value = mock_result

    with pytest.raises(Exception, match="Methodology not found"):
        await programmer._load_methodology("nonexistent_methodology")


@pytest.mark.asyncio
async def test_programmer_filters_exercises_by_weak_points(
    mock_db_session, sample_extended_profile, sample_methodology
):
    """Test programmer prioritizes exercises targeting weak points"""
    programmer = ProgrammerAgent(api_key="test_key", db_session=mock_db_session)

    lockout_exercise = Exercise(
        id="floor_press",
        name="Floor Press",
        category="bench",
        variation_type="floor",
        equipment=["barbell", "bench"],
        targets_weak_points=["lockout"],
        movement_pattern="horizontal_push",
        complexity="intermediate",
        coaching_cues="No leg drive"
    )

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [lockout_exercise]
    mock_db_session.execute.return_value = mock_result

    exercises = await programmer._get_exercises_for_profile(
        sample_extended_profile, sample_methodology
    )

    assert len(exercises) == 1
    assert "lockout" in exercises[0].targets_weak_points


@pytest.mark.asyncio
async def test_programmer_system_prompt_includes_profile_data(
    mock_db_session, sample_extended_profile, sample_methodology, sample_exercises
):
    """Test programmer builds complete system prompt with profile data"""
    programmer = ProgrammerAgent(api_key="test_key", db_session=mock_db_session)

    context = {
        "methodology": sample_methodology,
        "profile": sample_extended_profile,
        "available_exercises": sample_exercises
    }

    prompt = programmer.get_system_prompt(context)

    assert "intermediate" in prompt
    assert "lockout" in prompt
    assert "commercial" in prompt
    assert sample_methodology.name in prompt


@pytest.mark.asyncio
async def test_analyst_read_only_constraint_in_prompt(mock_db_session):
    """Test analyst system prompt enforces read-only constraint"""
    analyst = AnalystMentorAgent(api_key="test_key", db_session=mock_db_session)

    context = {
        "methodology_knowledge": {
            "methodology_name": "Test Method",
            "knowledge_base": {}
        }
    }

    prompt = analyst.get_system_prompt(context)

    assert "READ-ONLY" in prompt or "read-only" in prompt.lower()
    assert "CANNOT modify" in prompt or "cannot modify" in prompt.lower()


@pytest.mark.asyncio
async def test_analyst_handles_missing_methodology_gracefully(
    mock_db_session
):
    """Test analyst works without methodology when user has none"""
    analyst = AnalystMentorAgent(api_key="test_key", db_session=mock_db_session)

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db_session.execute.return_value = mock_result

    knowledge = await analyst._load_methodology_knowledge(None)

    assert knowledge["methodology_name"] == "General Powerlifting"
    assert isinstance(knowledge["knowledge_base"], dict)


@pytest.mark.asyncio
async def test_base_agent_retry_logic_on_failure(mock_db_session):
    """Test base agent retries failed API calls"""

    class TestAgent(BaseAgent):
        def get_system_prompt(self, context):
            return "test prompt"

        async def process(self, user_input, context):
            return {}

    agent = TestAgent(api_key="test_key", db_session=mock_db_session, max_retries=3)

    call_count = 0

    async def failing_call(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise Exception("API Error")
        return "Success"

    with patch.object(agent.client.models, 'generate_content', side_effect=failing_call):
        with pytest.raises(Exception):
            await agent._call_gemini("system", "user")

    assert call_count == 3


@pytest.mark.asyncio
async def test_programmer_get_available_equipment_hardcore_gym(mock_db_session):
    """Test equipment filtering for hardcore gym includes specialty items"""
    programmer = ProgrammerAgent(api_key="test_key", db_session=mock_db_session)

    equipment = programmer._get_available_equipment("hardcore")

    assert "barbell" in equipment
    assert "bands" in equipment
    assert "chains" in equipment
    assert "specialty_bars" in equipment


@pytest.mark.asyncio
async def test_programmer_get_available_equipment_garage_gym(mock_db_session):
    """Test equipment filtering for garage gym excludes machines"""
    programmer = ProgrammerAgent(api_key="test_key", db_session=mock_db_session)

    equipment = programmer._get_available_equipment("garage")

    assert "barbell" in equipment
    assert "dumbbells" in equipment
    assert "machines" not in equipment
    assert "cable" not in equipment


@pytest.mark.asyncio
async def test_router_classification_with_context(mock_db_session):
    """Test router uses context to improve classification"""
    router = RouterAgent(api_key="test_key", db_session=mock_db_session)

    mock_response = json.dumps({
        "intent": "program_adjustment",
        "confidence": 0.93,
        "reasoning": "User has program and wants adjustment",
        "suggestedAgent": "feedback",
        "requiresProgramContext": True
    })

    with patch.object(router, '_call_gemini', return_value=mock_response):
        result = await router.process(
            user_input={"message": "reduce volume"},
            context={"has_program": True, "methodology": "sheiko"}
        )

    assert result["intent"] == "program_adjustment"
    assert result["requiresProgramContext"] is True
