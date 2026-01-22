# Phase 2 Quick Reference Guide

## Agent Classes Overview

### BaseAgent (Abstract)
```python
from src.services.base_agent import BaseAgent

class YourAgent(BaseAgent):
    def __init__(self, api_key: str, db_session: AsyncSession,
                 model_name: str = "gemini-2.5-flash-lite",
                 temperature: float = 0.7, max_retries: int = 3):
        super().__init__(api_key, db_session, model_name, temperature, max_retries)

    def get_system_prompt(self, context: dict) -> str:
        return "Your system prompt here"

    async def process(self, user_input: dict, context: dict) -> dict:
        # Your logic here
        return {}
```

**Methods:**
- `_call_gemini(system_prompt, user_prompt, response_schema?, response_mime_type?)` - Call Gemini API
- `_log_conversation(user_id, agent_type, user_message, agent_response, intent?, context?)` - Log to DB
- `cache_get(key)` - Get from cache
- `cache_set(key, value)` - Set cache value

---

## RouterAgent

### Usage
```python
from src.services import RouterAgent
from src.core.database import get_db
from src.core.config import settings

async def classify_user_message(message: str, db: AsyncSession):
    router = RouterAgent(
        api_key=settings.GEMINI_API_KEY,
        db_session=db,
        temperature=0.3  # Low temp for consistent classification
    )

    classification = await router.process(
        user_input={"message": message},
        context={
            "has_program": True,  # User has existing program
            "methodology": "westside_conjugate"
        }
    )

    # classification = {
    #     "intent": "technique_question",
    #     "confidence": 0.95,
    #     "reasoning": "...",
    #     "suggestedAgent": "analyst_mentor",
    #     "requiresProgramContext": False
    # }

    # Route based on intent
    if router.should_route_to_analyst(classification):
        # Send to AnalystMentorAgent
        pass
    elif router.should_route_to_programmer(classification):
        # Send to ProgrammerAgent
        pass
    elif router.should_route_to_feedback(classification):
        # Send to FeedbackAgent
        pass
```

### Intent Types
- `program_generation` → ProgrammerAgent
- `technique_question` → AnalystMentorAgent
- `motivation_support` → AnalystMentorAgent
- `program_adjustment` → FeedbackAgent
- `general_chat` → AnalystMentorAgent (fallback)

---

## ProgrammerAgent

### Usage
```python
from src.services import ProgrammerAgent
from src.models.schemas import ExtendedLifterProfileSchema, ProgramGenerationRequest

async def generate_methodology_program(
    profile: ExtendedLifterProfileSchema,
    request: ProgramGenerationRequest,
    db: AsyncSession
):
    programmer = ProgrammerAgent(
        api_key=settings.GEMINI_API_KEY,
        db_session=db,
        temperature=0.8  # Higher temp for creativity
    )

    result = await programmer.process(
        user_input={},
        context={
            "profile": profile,
            "request": request
        }
    )

    # result = {
    #     "program": FullProgramSchema(...),
    #     "methodology_used": "Westside Conjugate"
    # }

    return result["program"]
```

### Profile Requirements
```python
profile = ExtendedLifterProfileSchema(
    id="user_123",
    name="John Doe",
    biometrics={"bodyweight": 185, "unit": "lbs", "sex": "male", "age": 28},
    oneRepMax={"squat": 405, "bench": 285, "deadlift": 495},
    trainingAge="intermediate",  # novice/intermediate/advanced
    weakPoints=["lockout", "off_chest"],
    equipmentAccess="commercial",  # garage/commercial/hardcore
    preferredSessionLength=90,  # minutes
    methodologyId="westside_conjugate"  # Must exist in DB
)
```

### Equipment Filtering
- **Garage:** barbell, rack, bench
- **Commercial:** garage + dumbbells, cable, machines
- **Hardcore:** commercial + bands, chains, specialty_bars

**Filtering Logic:** Exercise equipment must be **subset** of available equipment.

---

## AnalystMentorAgent

### Usage
```python
from src.services import AnalystMentorAgent

async def get_coaching_advice(
    user_message: str,
    profile: ExtendedLifterProfileSchema,
    db: AsyncSession
):
    analyst = AnalystMentorAgent(
        api_key=settings.GEMINI_API_KEY,
        db_session=db,
        temperature=0.7  # Balanced for helpful advice
    )

    result = await analyst.process(
        user_input={"message": user_message},
        context={"profile": profile}
    )

    # result = {
    #     "response": "To improve your bench lockout, focus on...",
    #     "agent_type": "analyst_mentor"
    # }

    return result["response"]
```

### Use Cases
1. Technique questions: "How do I improve my lockout?"
2. Injury management: "My back hurts after squats"
3. Exercise substitutions: "Alternative to deadlifts?"
4. Motivation: "I missed my last lift"
5. Weak point strategies

**Important:** Agent is READ-ONLY. Cannot modify programs.

---

## Testing with Mocked Gemini

```python
import pytest
from unittest.mock import patch
from src.services import RouterAgent

@pytest.mark.asyncio
async def test_router_classification(mock_db_session):
    router = RouterAgent(api_key="test_key", db_session=mock_db_session)

    mock_response = json.dumps({
        "intent": "technique_question",
        "confidence": 0.95,
        "reasoning": "User asking about technique",
        "suggestedAgent": "analyst_mentor",
        "requiresProgramContext": False
    })

    with patch.object(router, '_call_gemini', return_value=mock_response):
        result = await router.process(
            user_input={"message": "How do I improve lockout?"},
            context={"has_program": False, "methodology": None}
        )

    assert result["intent"] == "technique_question"
```

---

## Database Conversation Logging

All agents automatically log to `agent_conversations` table:

```python
# Logged automatically when using BaseAgent._log_conversation()
{
    "id": "uuid",
    "user_id": "user_123",
    "agent_type": "router",  # or programmer, analyst_mentor
    "user_message": "How do I improve my bench?",
    "intent_classification": {...},  # For router only
    "agent_response": "...",
    "context": {...},
    "created_at": "2026-01-21T12:00:00Z"
}
```

---

## Caching Strategy

**Request-Scoped Cache** (lives on agent instance):

```python
# In ProgrammerAgent
methodology = await self._load_methodology("westside_conjugate")
# First call: loads from DB, caches with key "methodology_westside_conjugate"

methodology2 = await self._load_methodology("westside_conjugate")
# Second call: returns from cache, no DB query

# Cache cleared when agent instance is destroyed (end of request)
```

**What to Cache:**
- Methodologies (rarely change)
- Exercise lists filtered by profile (same filters = same results)
- Methodology knowledge bases

---

## Configuration

### Environment Variables (.env)
```bash
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite  # Default model
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/ironpath_db
```

### Temperature Defaults
- **RouterAgent:** 0.3 (consistent classification)
- **ProgrammerAgent:** 0.8 (creative exercise selection)
- **AnalystMentorAgent:** 0.7 (balanced advice)

Override via constructor:
```python
router = RouterAgent(api_key=key, db_session=db, temperature=0.5)
```

---

## Running Tests

```bash
cd backend
source .venv/bin/activate

# Run all agent tests
pytest tests/test_agents.py -v

# Run specific test
pytest tests/test_agents.py::test_router_classifies_technique_question -v

# Run with coverage
pytest tests/test_agents.py --cov=src/services --cov-report=term-missing
```

---

## Common Patterns

### 1. Error Handling
```python
try:
    result = await agent.process(user_input, context)
except Exception as e:
    logger.error(f"Agent failed: {str(e)}")
    # Error already logged to DB via BaseAgent
    raise
```

### 2. Routing Flow
```python
# Step 1: Classify
router = RouterAgent(...)
classification = await router.process(...)

# Step 2: Route
if router.should_route_to_analyst(classification):
    analyst = AnalystMentorAgent(...)
    response = await analyst.process(...)
elif router.should_route_to_programmer(classification):
    # Redirect to program generation endpoint
    pass
```

### 3. Exercise Filtering
```python
# ProgrammerAgent handles this internally
exercises = await programmer._get_exercises_for_profile(profile, methodology)

# Filters applied:
# 1. Training age complexity
# 2. Equipment availability (exact match)
# 3. Results cached per (equipment_access, training_age)
```

---

## Troubleshooting

### Issue: "No module named 'google.genai'"
**Solution:** Install Google Generative AI SDK
```bash
pip install google-generativeai
```

### Issue: "Empty response from Gemini"
**Cause:** API key invalid or rate limit hit
**Solution:** Check API key, wait and retry (automatic retry up to 3 times)

### Issue: "Validation failed" for program/intent
**Cause:** Gemini returned invalid JSON structure
**Solution:** Agent will retry up to 3 times, then raise exception

### Issue: Exercise filtering returns no results
**Cause:** No exercises match equipment + complexity constraints
**Solution:** Check exercise seed data, ensure exercises exist for user's equipment level

---

## Next Phase Preview

**Phase 3:** API Routes & Endpoints
- `POST /api/agent/message` - Router endpoint
- `POST /api/programs/generate-v2` - Enhanced generation
- `POST /api/readiness/check` - Pre-workout checks
- `GET /api/methodologies/list` - List methodologies

**Coming Soon:** Frontend integration, readiness modal, agent chat UI
