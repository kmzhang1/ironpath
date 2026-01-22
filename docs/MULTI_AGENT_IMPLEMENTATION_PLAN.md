# IronPath AI: Multi-Agent Architecture Implementation Plan

> **Complete implementation guide for migrating to a sophisticated multi-agent coaching system**

---

## 📋 Table of Contents

- [Executive Summary](#executive-summary)
- [Architecture Overview](#architecture-overview)
- [Implementation Phases](#implementation-phases)
  - [Phase 1: Database Schema](#phase-1-database-schema--foundation)
  - [Phase 2: Agent Architecture](#phase-2-agent-architecture---base-classes)
  - [Phase 3: API Routes](#phase-3-api-routes--endpoints)
  - [Phase 4: Frontend Integration](#phase-4-frontend-integration)
  - [Phase 5: Testing](#phase-5-testing-strategy)
- [File Reference](#critical-files-to-modifycreate)
- [Migration Strategy](#migration-strategy)
- [Performance & Monitoring](#performance-targets)

---

## Executive Summary

**Goal:** Transform IronPath AI from a single-agent program generator into a sophisticated multi-agent coaching system with methodology-aware programming, intelligent routing, and comprehensive autoregulation.

**Key Design Decisions:**
- ✅ Router Agent on backend (FastAPI service)
- ✅ Knowledge bases in PostgreSQL (database-backed)
- ✅ Required pre-workout readiness checks
- ✅ Nutrition agent deferred to Phase 2

**Timeline:** 8 weeks, 6 phases

---

## Architecture Overview

### Current State
```
User → Single AIAgent → Gemini → Program
```

- Single `AIAgent` generates programs
- `FeedbackAgent` adjusts workouts
- `CheckInAgent` analyzes progress
- No methodology awareness
- No exercise library

### Target State
```
User Message → Router Agent (Backend)
                    ↓
        ┌───────────┼───────────┐
        ↓           ↓           ↓
    Programmer   Analyst    Feedback
      Agent      Agent       Agent
        ↓           ↓           ↓
    Exercise    Knowledge   Readiness
    Database      Base       Checks
```

### New Capabilities

| Component | Purpose | Status |
|-----------|---------|--------|
| **Router Agent** | Classifies user intent, routes to specialized agents | New |
| **Programmer Agent** | Methodology-aware program generation (Westside, Sheiko, DUP, etc.) | Enhanced |
| **Analyst/Mentor Agent** | Read-only coaching with knowledge retrieval (RAG) | New |
| **Readiness System** | Pre-workout checks with autoregulation | New |
| **Methodology Database** | Training system knowledge bases | New |
| **Exercise Library** | Filterable exercise database | New |

---

## Implementation Phases

## Phase 1: Database Schema & Foundation

### 1.1 Create Database Migration

**File:** `backend/alembic/versions/002_add_multi_agent_tables.py`

**New Tables:**

#### 1. `training_methodologies`
Stores methodology knowledge bases (Westside, Sheiko, DUP, Linear, Block)

```sql
CREATE TABLE training_methodologies (
    id VARCHAR PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL,
    description VARCHAR NOT NULL,
    category VARCHAR NOT NULL,
    system_prompt_template TEXT NOT NULL,  -- AI coaching persona
    programming_rules JSON NOT NULL,       -- Sets/reps/volume logic
    knowledge_base JSON NOT NULL,          -- Coaching tips, quotes
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

#### 2. `exercises`
Exercise library with metadata for filtering

```sql
CREATE TABLE exercises (
    id VARCHAR PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL,
    category VARCHAR NOT NULL,             -- squat, bench, deadlift, accessory
    variation_type VARCHAR NOT NULL,       -- competition, pause, deficit, etc.
    equipment JSON NOT NULL,               -- [barbell, rack, bands, chains]
    targets_weak_points JSON NOT NULL,     -- [lockout, hole, off_chest]
    movement_pattern VARCHAR NOT NULL,     -- vertical_push, horizontal_pull
    complexity VARCHAR NOT NULL,           -- beginner, intermediate, advanced
    coaching_cues TEXT,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_exercises_name ON exercises(name);
```

#### 3. `readiness_checks`
Pre-workout assessments for autoregulation

```sql
CREATE TABLE readiness_checks (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES profiles(id),
    program_id VARCHAR NOT NULL REFERENCES programs(id),
    week_number INTEGER NOT NULL,
    day_number INTEGER NOT NULL,
    sleep_quality INTEGER NOT NULL,        -- 1-5 scale
    stress_level INTEGER NOT NULL,         -- 1-5 scale
    soreness_fatigue INTEGER NOT NULL,     -- 1-5 scale
    overall_readiness FLOAT NOT NULL,      -- Calculated score
    adjustment_recommendation TEXT,
    created_at TIMESTAMP NOT NULL
);
```

#### 4. `agent_conversations`
Conversation history for analytics

```sql
CREATE TABLE agent_conversations (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES profiles(id),
    agent_type VARCHAR NOT NULL,           -- router, programmer, analyst_mentor
    user_message TEXT NOT NULL,
    intent_classification JSON,            -- Router decision metadata
    agent_response TEXT NOT NULL,
    context JSON NOT NULL,
    created_at TIMESTAMP NOT NULL
);
```

**Extensions to Existing Tables:**

#### `lifter_profiles` - Add multi-agent fields
```sql
ALTER TABLE lifter_profiles
    ADD COLUMN training_age VARCHAR NOT NULL DEFAULT 'novice',  -- novice/intermediate/advanced
    ADD COLUMN weak_points JSON NOT NULL DEFAULT '[]',
    ADD COLUMN equipment_access VARCHAR NOT NULL DEFAULT 'commercial',  -- garage/commercial/hardcore
    ADD COLUMN preferred_session_length INTEGER NOT NULL DEFAULT 60,
    ADD COLUMN competition_date TIMESTAMP,
    ADD COLUMN methodology_id VARCHAR REFERENCES training_methodologies(id);
```

#### `programs` - Track methodology used
```sql
ALTER TABLE programs
    ADD COLUMN methodology_id VARCHAR REFERENCES training_methodologies(id),
    ADD COLUMN generation_metadata JSON NOT NULL DEFAULT '{}';
```

**Commands:**
```bash
cd backend
alembic revision -m "add multi-agent tables"
# Edit the migration file with the schema above
alembic upgrade head
alembic current  # Verify
```

---

### 1.2 Seed Methodologies & Exercises

**File:** `backend/src/seed_methodologies.py`

**Methodologies to Seed:**

1. **Westside/Conjugate**
   - Max effort rotation (weekly exercise changes)
   - Dynamic effort (speed work with bands/chains)
   - Weak point accessories (high volume, 8-15 reps)

2. **Sheiko**
   - High frequency (squat/bench 2-3x per week)
   - Double sessions (squat → bench → squat in one workout)
   - Volume waves (increase 3 weeks, deload 1 week)
   - Technical precision (<90% intensity)

3. **Daily Undulating Periodization (DUP)**
   - Daily variation in intensity/volume
   - Heavy/Moderate/Light rotation
   - High frequency for all lifts

4. **Linear Progression**
   - For novices
   - Simple weekly weight increases
   - 3x5, 5x5 structures

5. **Block Periodization**
   - Traditional accumulation → intensification → realization
   - 4-week blocks
   - Progressive volume reduction

**Exercise Library (Minimum 85 exercises):**

| Category | Count | Examples |
|----------|-------|----------|
| Squat variations | 20 | Competition squat, pause squat, box squat, front squat, safety bar squat, tempo squat |
| Bench variations | 15 | Competition bench, pause bench, close-grip, floor press, board press, incline |
| Deadlift variations | 20 | Conventional, sumo, deficit, rack pull, Romanian, snatch grip, paused |
| Accessories | 30 | Good morning, rows, pulldowns, tricep work, leg press, hamstring curls |

**Each exercise includes:**
- Equipment requirements: `["barbell", "rack"]`, `["bands"]`, `["specialty_bar"]`
- Weak points targeted: `["lockout"]`, `["hole"]`, `["off_chest"]`, `["starting_strength"]`
- Complexity: `beginner`, `intermediate`, `advanced`
- Coaching cues: "Keep chest up", "Drive through heels"

**Execution:**
```bash
python -m src.seed_methodologies
```

---

## Phase 2: Agent Architecture - Base Classes

### 2.1 Base Agent Class

**File:** `backend/src/services/base_agent.py`

**Purpose:** Abstract base class providing common Gemini API functionality

```python
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from google import genai
from google.genai import types
import logging

class BaseAgent(ABC):
    """Base class for all AI agents"""

    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash",
                 temperature: float = 0.7, max_retries: int = 3):
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name
        self.temperature = temperature
        self.max_retries = max_retries
        self._cache: Dict[str, Any] = {}

    @abstractmethod
    def get_system_prompt(self, context: Dict[str, Any]) -> str:
        """Build agent-specific system prompt"""
        pass

    @abstractmethod
    async def process(self, user_input: Dict[str, Any],
                     context: Dict[str, Any]) -> Dict[str, Any]:
        """Main processing method"""
        pass

    async def _call_gemini(self, system_prompt: str, user_prompt: str,
                          response_schema: Optional[dict] = None,
                          response_mime_type: str = "text/plain") -> str:
        """Common Gemini API wrapper with retry logic"""
        for attempt in range(1, self.max_retries + 1):
            try:
                config = types.GenerateContentConfig(
                    temperature=self.temperature,
                    response_mime_type=response_mime_type,
                )
                if response_schema:
                    config.response_schema = response_schema

                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=[types.Content(role="user", parts=[
                        types.Part(text=system_prompt),
                        types.Part(text=user_prompt),
                    ])],
                    config=config
                )

                if not response.text:
                    raise ValueError("Empty response from Gemini")
                return response.text
            except Exception as e:
                logging.warning(f"Attempt {attempt}/{self.max_retries} failed: {e}")
                if attempt == self.max_retries:
                    raise

    # Cache utilities
    def cache_get(self, key: str) -> Optional[Any]:
        return self._cache.get(key)

    def cache_set(self, key: str, value: Any) -> None:
        self._cache[key] = value
```

**Temperature Defaults by Agent:**
- Router: **0.3** (consistent classification)
- Programmer: **0.8** (creative exercise selection)
- Analyst: **0.7** (balanced advice)

---

### 2.2 Router Agent

**File:** `backend/src/services/router_agent.py`

**Purpose:** Classify user intent and route to specialized agents

**Intent Classification:**

| Intent | Routes To | Examples |
|--------|-----------|----------|
| `program_generation` | Programmer Agent | "create program", "new workout", "generate training" |
| `technique_question` | Analyst/Mentor | "how do I improve lockout", "form check" |
| `motivation_support` | Analyst/Mentor | "missed lift", "feeling unmotivated" |
| `program_adjustment` | Feedback Agent | "workout too hard", "adjust session" |
| `nutrition_question` | (Phase 2) | "what should I eat", "macros" |
| `general_chat` | Analyst/Mentor (fallback) | Greetings, unclear questions |

**System Prompt:**
```python
def get_system_prompt(self, context: Dict[str, Any]) -> str:
    return f"""You are a Router Agent for IronPath AI, a powerlifting coaching system.

Classify user messages into intents to route to the correct specialized agent.

**Available Agents:**
1. Programmer Agent: Generate/modify workout programs
2. Analyst/Mentor Agent: Coaching advice, technique tips, motivation
3. Feedback Agent: Workout feedback and autoregulation

**Context:**
- User has existing program: {context.get("has_program", False)}
- Current methodology: {context.get("methodology", "None")}

Return JSON:
{{
  "intent": "<intent_type>",
  "confidence": <0.0-1.0>,
  "reasoning": "brief explanation",
  "suggested_agent": "<agent_name>",
  "requires_program_context": <boolean>
}}
"""
```

**Output Example:**
```json
{
  "intent": "technique_question",
  "confidence": 0.92,
  "reasoning": "User asking about improving specific lift aspect",
  "suggested_agent": "analyst_mentor",
  "requires_program_context": false
}
```

**Routing Logic:**
```python
def should_route_to_programmer(self, classification: dict) -> bool:
    return classification["intent"] == "program_generation"

def should_route_to_analyst(self, classification: dict) -> bool:
    return classification["intent"] in ["technique_question", "motivation_support", "general_chat"]

def should_route_to_feedback(self, classification: dict) -> bool:
    return classification["intent"] == "program_adjustment"
```

---

### 2.3 Enhanced Programmer Agent

**File:** `backend/src/services/programmer_agent.py`

**Purpose:** Generate methodology-aware training programs

**New Capabilities:**

1. **Methodology Loading** (with caching)
   ```python
   async def _load_methodology(self, methodology_id: str) -> TrainingMethodology:
       cache_key = f"methodology_{methodology_id}"
       if cached := self.cache_get(cache_key):
           return cached

       result = await self.db_session.execute(
           select(TrainingMethodology).where(TrainingMethodology.id == methodology_id)
       )
       methodology = result.scalar_one()
       self.cache_set(cache_key, methodology)
       return methodology
   ```

2. **Exercise Selection** (filtered by profile)
   ```python
   async def _get_exercises_for_profile(self, profile, methodology):
       query = select(Exercise).where(
           Exercise.equipment.contained_by(self._get_available_equipment(profile.equipment_access))
       )

       # Filter by complexity based on training age
       if profile.training_age == "novice":
           query = query.where(Exercise.complexity == "beginner")
       elif profile.training_age == "intermediate":
           query = query.where(Exercise.complexity.in_(["beginner", "intermediate"]))

       # Filter by weak points
       if profile.weak_points:
           query = query.where(Exercise.targets_weak_points.overlap(profile.weak_points))

       result = await self.db_session.execute(query)
       return result.scalars().all()
   ```

3. **Dynamic Prompt Building**
   ```python
   def get_system_prompt(self, context: Dict[str, Any]) -> str:
       methodology = context["methodology"]
       profile = context["profile"]
       exercises = context["available_exercises"]

       prompt = methodology.system_prompt_template  # e.g., "You are a Westside coach..."

       # Inject athlete profile
       prompt += f"""

   ## ATHLETE PROFILE
   - Training Age: {profile.training_age}
   - Weak Points: {", ".join(profile.weak_points)}
   - Equipment: {profile.equipment_access}
   - 1RMs: Squat {profile.squat_1rm}, Bench {profile.bench_1rm}, Deadlift {profile.deadlift_1rm}
   """

       # Inject exercise library
       prompt += "\n## AVAILABLE EXERCISES\n"
       for ex in exercises:
           prompt += f"- {ex.name} ({ex.category}) - Targets: {', '.join(ex.targets_weak_points)}\n"

       # Inject programming rules
       prompt += f"\n## PROGRAMMING RULES\n{json.dumps(methodology.programming_rules, indent=2)}"

       return prompt
   ```

**Example Injected Prompt:**
```
You are a Westside Barbell coach. You prioritize max effort rotation and dynamic effort...

ATHLETE PROFILE:
- Training Age: intermediate
- Weak Points: lockout, off chest
- Equipment: hardcore gym (bands, chains available)
- 1RMs: Squat 400lbs, Bench 285lbs, Deadlift 475lbs

AVAILABLE EXERCISES:
- Floor Press (bench, board variation) - Targets: lockout
- Board Press (bench, board variation) - Targets: lockout
- Box Squat (squat, box variation) - Targets: hole, explosiveness
...

PROGRAMMING RULES:
{
  "intensity_scheme": "conjugate_max_effort",
  "max_effort_rotation": "weekly",
  "dynamic_effort_percentage": "50-60",
  "accessory_volume": "high (8-15 reps)"
}
```

---

### 2.4 Analyst/Mentor Agent

**File:** `backend/src/services/analyst_agent.py`

**Purpose:** Read-only coaching with knowledge retrieval (RAG)

**Use Cases:**
1. Technique questions: "How do I improve my lockout?"
2. Injury management: "My back hurts after squats"
3. Exercise substitutions: "Alternative to deadlifts?"
4. Motivation: "I missed my last lift"
5. Weak point strategies

**Knowledge Retrieval:**
```python
async def _load_methodology_knowledge(self, methodology_id: str) -> dict:
    result = await self.db_session.execute(
        select(TrainingMethodology).where(TrainingMethodology.id == methodology_id)
    )
    methodology = result.scalar_one_or_none()

    return {
        "methodology_name": methodology.name,
        "knowledge_base": methodology.knowledge_base  # Tips, quotes, principles
    }
```

**System Prompt:**
```python
def get_system_prompt(self, context: Dict[str, Any]) -> str:
    kb = context.get("methodology_knowledge", {})

    return f"""You are an expert powerlifting coach and mentor.

Provide:
1. Technique advice (form, cues, movement patterns)
2. Injury prevention guidance
3. Weak point analysis and strategies
4. Motivation and support

CRITICAL: You are READ-ONLY. You CANNOT modify programs.
If user wants changes, direct them to use the feedback system.

ATHLETE'S METHODOLOGY: {kb.get('methodology_name', 'Unknown')}
KNOWLEDGE BASE: {json.dumps(kb.get('knowledge_base', {}), indent=2)}
"""
```

**Example Response:**
```
To improve your bench lockout, focus on:

1. Board Press (2-board): Overload the top range of motion
2. Floor Press: Eliminate leg drive, pure lockout strength
3. Close-Grip Bench: Target triceps directly

Since you're following Westside Conjugate, rotate one of these as
your max effort movement for 3 weeks. Your weak lockout suggests
we should add JM Press as an accessory (3x8-12 reps).

Remember Louie Simmons' principle: "Special exercises cure special
weaknesses." Don't just bench more - attack the specific weakness.
```

---

## Phase 3: API Routes & Endpoints

### 3.1 Router Endpoint

**File:** `backend/src/routes/router.py`

**Route:** `POST /api/agent/message`

**Request:**
```python
class AgentMessageRequest(BaseModel):
    message: str
    profile: ExtendedLifterProfileSchema
    current_program_id: Optional[str] = None
```

**Response:**
```python
class AgentMessageResponse(BaseModel):
    agent_used: str
    intent_classification: dict
    response: dict  # Agent-specific response
    timestamp: str
```

**Handler Flow:**
```python
@router.post("/message")
async def handle_agent_message(request: AgentMessageRequest, db: AsyncSession = Depends(get_db)):
    # 1. Initialize Router
    router_agent = RouterAgent(api_key=settings.GEMINI_API_KEY)

    # 2. Classify intent
    classification = await router_agent.process(
        user_input={"message": request.message},
        context={"has_program": request.current_program_id is not None}
    )

    # 3. Route to appropriate agent
    if router_agent.should_route_to_analyst(classification):
        analyst = AnalystMentorAgent(api_key=settings.GEMINI_API_KEY, db_session=db)
        response = await analyst.process(
            user_input={"message": request.message},
            context={"profile": request.profile}
        )
    elif router_agent.should_route_to_programmer(classification):
        response = {"message": "Please use the program generator", "requires_program_generation": True}
    # ... other routes

    # 4. Save conversation
    conversation = AgentConversation(
        user_message=request.message,
        intent_classification=classification,
        agent_response=response
    )
    db.add(conversation)
    await db.commit()

    return AgentMessageResponse(...)
```

---

### 3.2 Enhanced Program Generation

**File:** `backend/src/routes/programs.py`

**Route:** `POST /api/programs/generate-v2`

**Changes from v1:**
```python
@router.post("/generate-v2")
async def generate_program_v2(
    profile: ExtendedLifterProfileSchema,  # Now includes methodology_id, weak_points, etc.
    request: ProgramGenerationRequest,
    db: AsyncSession = Depends(get_db)
):
    # Initialize Programmer Agent with DB session
    programmer = ProgrammerAgent(
        api_key=settings.GEMINI_API_KEY,
        db_session=db
    )

    # Generate program (loads methodology and exercises internally)
    result = await programmer.process(
        user_input={},
        context={"profile": profile, "request": request}
    )

    # Save with methodology metadata
    program = Program(
        id=str(uuid4()),
        user_id=profile.id,
        program_json=result["program"].model_dump(),
        methodology_id=profile.methodology_id,
        generation_metadata={
            "agent_version": "2.0",
            "methodology_used": result["methodology_used"]
        }
    )
    db.add(program)
    await db.commit()

    return ProgramResponse(program=result["program"])
```

**Backward Compatibility:**
- Keep `POST /api/programs/generate` (v1) functional
- Frontend chooses v1 or v2 based on user profile

---

### 3.3 Readiness Check Endpoints

**File:** `backend/src/routes/readiness.py`

**Route:** `POST /api/readiness/check`

**Request:**
```python
class ReadinessCheckRequest(BaseModel):
    user_id: str
    program_id: str
    week_number: int
    day_number: int
    sleep_quality: int = Field(..., ge=1, le=5)
    stress_level: int = Field(..., ge=1, le=5)
    soreness_fatigue: int = Field(..., ge=1, le=5)
```

**Response:**
```python
class ReadinessCheckResponse(BaseModel):
    check_id: str
    overall_readiness: float  # 0-1 scale
    recommendation: str
    should_adjust_workout: bool
    adjustment_type: Optional[str]  # "reduce_volume", "reduce_intensity", "recovery_session"
```

**Logic:**
```python
@router.post("/check")
async def submit_readiness_check(request: ReadinessCheckRequest, db: AsyncSession = Depends(get_db)):
    # Calculate readiness score (weighted average)
    score = (
        (request.sleep_quality / 5.0) * 0.4 +
        (request.stress_level / 5.0) * 0.3 +
        (request.soreness_fatigue / 5.0) * 0.3
    )

    # Determine adjustment
    if score < 0.5:
        recommendation = "Reduce volume by 30-40% or switch to recovery session"
        should_adjust = True
        adjustment_type = "reduce_volume"
    elif score < 0.7:
        recommendation = "Reduce intensity (RPE -1) or cut 1-2 sets per exercise"
        should_adjust = True
        adjustment_type = "reduce_intensity"
    else:
        recommendation = "Readiness is good. Proceed with planned workout"
        should_adjust = False
        adjustment_type = None

    # Save to DB
    check = ReadinessCheck(
        id=str(uuid4()),
        user_id=request.user_id,
        overall_readiness=score,
        adjustment_recommendation=recommendation
    )
    db.add(check)
    await db.commit()

    return ReadinessCheckResponse(...)
```

---

### 3.4 Methodology Management

**File:** `backend/src/routes/methodologies.py`

**Routes:**

1. **`GET /api/methodologies/list`** - List all methodologies
   ```python
   @router.get("/list")
   async def list_methodologies(db: AsyncSession = Depends(get_db)):
       result = await db.execute(select(TrainingMethodology))
       return [{"id": m.id, "name": m.name, "description": m.description}
               for m in result.scalars()]
   ```

2. **`GET /api/methodologies/{id}`** - Get methodology details
   ```python
   @router.get("/{methodology_id}")
   async def get_methodology(methodology_id: str, db: AsyncSession = Depends(get_db)):
       result = await db.execute(
           select(TrainingMethodology).where(TrainingMethodology.id == methodology_id)
       )
       methodology = result.scalar_one_or_none()
       return {
           "id": methodology.id,
           "name": methodology.name,
           "programming_rules": methodology.programming_rules,
           "knowledge_base": methodology.knowledge_base
       }
   ```

---

### 3.5 Route Registration

**File:** `backend/src/main.py`

```python
from .routes import (
    programs as programs_routes,
    feedback as feedback_routes,
    users as users_routes,
    router as router_routes,          # NEW
    readiness as readiness_routes,    # NEW
    methodologies as methodology_routes  # NEW
)

app.include_router(programs_routes.router, prefix="/api")
app.include_router(feedback_routes.router, prefix="/api")
app.include_router(users_routes.router, prefix="/api")
app.include_router(router_routes.router, prefix="/api")           # NEW
app.include_router(readiness_routes.router, prefix="/api")        # NEW
app.include_router(methodology_routes.router, prefix="/api")      # NEW
```

---

## Phase 4: Frontend Integration

### 4.1 Enhanced Wizard - Methodology Step

**File:** `frontend/src/pages/Wizard.tsx`

**New Step 3.5:** "Methodology & Experience" (after 1RM input)

**Fields:**
1. **Training Age** (required)
   - Radio: Novice (0-2y) | Intermediate (2-5y) | Advanced (5y+)

2. **Methodology** (required)
   - Dropdown from `GET /api/methodologies/list`
   - Show description on selection
   - Badge: "Recommended for Beginners" on Linear/Block

3. **Weak Points** (optional, show if intermediate/advanced)
   - Multi-select: lockout, off chest, hole, starting strength, speed
   - Or comma-separated input

4. **Equipment Access** (required)
   - Radio: Garage | Commercial | Hardcore

5. **Preferred Session Length** (required)
   - Slider: 30-180 min (default 60)

6. **Competition Date** (optional, show if goal = peaking)
   - Date picker
   - Warn if <6 weeks or >16 weeks out

**State:**
```typescript
const [step3_5Data, setStep3_5Data] = useState({
  trainingAge: 'novice',
  methodologyId: '',
  weakPoints: [],
  equipmentAccess: 'commercial',
  preferredSessionLength: 60,
  competitionDate: null
});
```

---

### 4.2 Readiness Check Modal

**File:** `frontend/src/components/ui/ReadinessCheckModal.tsx`

**Trigger:** Before starting workout

**UI:**
```tsx
<Modal>
  <h2>Pre-Workout Check</h2>
  <p>Week {weekNumber}, Day {dayNumber}</p>

  {/* Sleep Quality */}
  <Label>Sleep Quality</Label>
  <ButtonGroup>
    {[1,2,3,4,5].map(n => (
      <Button
        selected={sleepQuality === n}
        onClick={() => setSleepQuality(n)}
      >
        {n}
      </Button>
    ))}
  </ButtonGroup>
  <Hint>1 = Poor, 5 = Excellent</Hint>

  {/* Stress Level */}
  <Label>Stress Level</Label>
  <ButtonGroup>...</ButtonGroup>
  <Hint>1 = Very Stressed, 5 = Relaxed</Hint>

  {/* Soreness/Fatigue */}
  <Label>Soreness/Fatigue</Label>
  <ButtonGroup>...</ButtonGroup>
  <Hint>1 = Extremely Sore, 5 = Fresh</Hint>

  <Button onClick={handleSubmit}>Continue Workout</Button>
</Modal>
```

**Flow:**
1. User clicks "Start Workout"
2. Modal opens (required, cannot skip)
3. Submit → `POST /api/readiness/check`
4. If `should_adjust_workout = true`:
   - Show adjustment recommendation
   - Display original vs adjusted workout
   - User chooses: Accept Adjustment | Continue as Planned
5. Proceed to workout

---

### 4.3 Agent Chat Interface

**File:** `frontend/src/components/ui/AgentChatModal.tsx`

**UI:**
```tsx
<Modal className="h-[600px] flex flex-col">
  <Header>
    <h2>Coach AI</h2>
    <p>Ask me anything about training</p>
  </Header>

  <Messages>
    {messages.map(msg => (
      <Message align={msg.role === 'user' ? 'right' : 'left'}>
        {msg.role === 'agent' && <Badge>{msg.agentType}</Badge>}
        <Text>{msg.content}</Text>
      </Message>
    ))}

    {messages.length === 0 && (
      <EmptyState>
        <p>Try asking:</p>
        <ul>
          <li>"How do I improve my lockout?"</li>
          <li>"My lower back hurts after squats"</li>
          <li>"What's the best accessory for weak quads?"</li>
        </ul>
      </EmptyState>
    )}
  </Messages>

  <Input>
    <TextField value={input} onChange={setInput} />
    <Button onClick={handleSend}>Send</Button>
  </Input>
</Modal>
```

**Handler:**
```typescript
const handleSend = async (input: string) => {
  setMessages(prev => [...prev, { role: 'user', content: input }]);

  const response = await fetch('/api/agent/message', {
    method: 'POST',
    body: JSON.stringify({ message: input, profile })
  });

  const data = await response.json();

  setMessages(prev => [...prev, {
    role: 'agent',
    content: data.response.response || data.response.message,
    agentType: data.agent_used
  }]);
};
```

---

### 4.4 Enhanced RPE Feedback (Emoji System)

**File:** `frontend/src/components/SessionView.tsx`

**UI:**
```tsx
<Card>
  <p>How did that feel?</p>

  <ButtonGroup>
    <Button onClick={() => setRPE('too_easy')}>
      🔥 Too Easy
    </Button>
    <Button onClick={() => setRPE('just_right')}>
      👍 Just Right
    </Button>
    <Button onClick={() => setRPE('too_hard')}>
      💩 Too Hard
    </Button>
  </ButtonGroup>

  <Collapsible>
    <Label>Precise RPE (optional)</Label>
    <Slider min={6} max={10} step={0.5} />
  </Collapsible>
</Card>
```

**Mapping:**
- 🔥 Too Easy → RPE 6-7 → Increase weight 3-5% next set
- 👍 Just Right → RPE 7.5-8.5 → Continue as planned
- 💩 Too Hard → RPE 9-10 → Reduce weight 5-10% next set

---

### 4.5 API Service Updates

**File:** `frontend/src/services/api.ts`

```typescript
export async function sendAgentMessage(
  message: string,
  profile: LifterProfile
): Promise<AgentMessageResponse> {
  const response = await fetch(`${API_URL}/api/agent/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, profile })
  });
  return response.json();
}

export async function submitReadinessCheck(
  data: ReadinessCheckRequest
): Promise<ReadinessCheckResponse> {
  const response = await fetch(`${API_URL}/api/readiness/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function listMethodologies(): Promise<Methodology[]> {
  const response = await fetch(`${API_URL}/api/methodologies/list`);
  return response.json();
}

export async function generateProgramV2(
  request: ProgramGenerationRequest,
  profile: ExtendedLifterProfile
): Promise<FullProgram> {
  const response = await fetch(`${API_URL}/api/programs/generate-v2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, request })
  });
  const data = await response.json();
  return data.program;
}
```

---

### 4.6 Type Definitions

**File:** `frontend/src/types/index.ts`

```typescript
interface ExtendedLifterProfile extends LifterProfile {
  trainingAge: 'novice' | 'intermediate' | 'advanced';
  weakPoints: string[];
  equipmentAccess: 'garage' | 'commercial' | 'hardcore';
  preferredSessionLength: number;
  competitionDate?: string;
  methodologyId?: string;
}

interface Methodology {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface ReadinessCheckResponse {
  checkId: string;
  overallReadiness: number;
  recommendation: string;
  shouldAdjustWorkout: boolean;
  adjustmentType?: 'reduce_volume' | 'reduce_intensity' | 'recovery_session';
}

interface AgentMessageResponse {
  agentUsed: string;
  intentClassification: {
    intent: string;
    confidence: number;
    reasoning: string;
  };
  response: {
    message?: string;
    response?: string;
    requiresProgramGeneration?: boolean;
    requiresFeedbackForm?: boolean;
  };
  timestamp: string;
}
```

---

## Phase 5: Testing Strategy

### 5.1 Unit Tests

**File:** `backend/tests/test_agents.py`

```python
import pytest
from unittest.mock import AsyncMock
from src.services.router_agent import RouterAgent

@pytest.mark.asyncio
async def test_router_classifies_technique_question():
    router = RouterAgent(api_key="test")
    router._call_gemini = AsyncMock(return_value='{"intent": "technique_question", ...}')

    result = await router.process(
        user_input={"message": "How do I improve my bench lockout?"},
        context={}
    )

    assert result["intent"] == "technique_question"
    assert router.should_route_to_analyst(result)

@pytest.mark.asyncio
async def test_programmer_loads_methodology():
    programmer = ProgrammerAgent(api_key="test", db_session=mock_db)
    methodology = await programmer._load_methodology("westside")

    assert methodology.name == "Westside Conjugate"
    assert "max_effort" in methodology.programming_rules
```

---

### 5.2 Integration Tests

**File:** `backend/tests/test_integration.py`

```python
@pytest.mark.asyncio
async def test_poor_readiness_triggers_adjustment():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/readiness/check", json={
            "user_id": "test",
            "program_id": "test",
            "week_number": 1,
            "day_number": 1,
            "sleep_quality": 1,
            "stress_level": 1,
            "soreness_fatigue": 2
        })

        assert response.status_code == 200
        data = response.json()
        assert data["should_adjust_workout"] == True
        assert data["overall_readiness"] < 0.5
```

---

### 5.3 Manual Testing Checklist

**Wizard Flow:**
- [ ] Complete wizard with all new fields
- [ ] Select each methodology and verify descriptions
- [ ] Test weak point input
- [ ] Verify competition date validation
- [ ] Generate v2 program successfully

**Readiness System:**
- [ ] Submit poor readiness (all 1s) → verify adjustment
- [ ] Submit good readiness (all 5s) → verify proceed
- [ ] Test adjustment acceptance flow
- [ ] Verify data saved to database

**Agent Chat:**
- [ ] Ask technique question → verify Analyst response
- [ ] Request program → verify redirect
- [ ] Test conversation history

---

## Critical Files to Modify/Create

### Backend (New Files)

| File | Purpose |
|------|---------|
| `backend/alembic/versions/002_add_multi_agent_tables.py` | Database migration |
| `backend/src/seed_methodologies.py` | Seed data script |
| `backend/src/services/base_agent.py` | Abstract base class |
| `backend/src/services/router_agent.py` | Router agent |
| `backend/src/services/programmer_agent.py` | Enhanced programmer |
| `backend/src/services/analyst_agent.py` | Analyst/mentor |
| `backend/src/routes/router.py` | Router endpoints |
| `backend/src/routes/readiness.py` | Readiness endpoints |
| `backend/src/routes/methodologies.py` | Methodology endpoints |
| `backend/tests/test_agents.py` | Agent unit tests |
| `backend/tests/test_integration.py` | Integration tests |

### Backend (Modified Files)

| File | Changes |
|------|---------|
| `backend/src/models/tables.py` | Add new table classes |
| `backend/src/models/schemas.py` | Add new Pydantic schemas |
| `backend/src/routes/programs.py` | Add v2 generation endpoint |
| `backend/src/main.py` | Register new routes |

### Frontend (New Files)

| File | Purpose |
|------|---------|
| `frontend/src/components/ui/ReadinessCheckModal.tsx` | Readiness UI |
| `frontend/src/components/ui/AgentChatModal.tsx` | Chat interface |

### Frontend (Modified Files)

| File | Changes |
|------|---------|
| `frontend/src/pages/Wizard.tsx` | Add methodology step |
| `frontend/src/types/index.ts` | Add new interfaces |
| `frontend/src/services/api.ts` | Add new API functions |
| `frontend/src/store/index.ts` | Extend state types |
| `frontend/src/components/SessionView.tsx` | Add emoji feedback |

---

## Migration Strategy

### Backward Compatibility

1. **Dual Endpoint Strategy**
   - Keep `/api/programs/generate` (v1) functional
   - Add `/api/programs/generate-v2` with new features
   - Frontend uses v2 for new users, v1 for existing

2. **Gradual User Migration**
   - New users → enhanced wizard → v2
   - Existing users see banner: "Upgrade to Methodology-Aware Programming"
   - Allow regeneration with methodology

3. **Database Defaults**
   - New columns have defaults: `novice`, `commercial`, `60min`
   - Existing programs continue working
   - Methodology nullable (existing = NULL)

---

## Performance Targets

### API Response Times

| Endpoint | Target | Notes |
|----------|--------|-------|
| Router Agent | <500ms | Classification only |
| Programmer Agent | <5s | Acceptable for generation |
| Analyst Agent | <2s | Conversational response |
| Readiness Check | <200ms | No AI, just calculation |

### Database Optimization

**Indexes:**
```sql
CREATE INDEX idx_exercises_name ON exercises(name);
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_lifter_profiles_methodology_id ON lifter_profiles(methodology_id);
CREATE INDEX idx_programs_methodology_id ON programs(methodology_id);
```

**Caching:**
- Methodology data: Application-level cache (refresh daily)
- Exercise library: Per-request cache (agent instance)

### Monitoring

**Metrics to Track:**
- Agent routing decisions (intent distribution)
- Response times per agent (p50, p95, p99)
- Gemini API costs per agent
- Readiness check usage
- Failure rates per endpoint

**Alerts:**
- Failure rate >5%
- Response time >2x target
- Database query time >500ms

---

## Risk Mitigation

| Risk | Mitigation | Fallback |
|------|------------|----------|
| **Gemini API Failures** | Retry logic (3 attempts), exponential backoff | Generic response (Analyst), mock program (Programmer) |
| **Database Migration Issues** | Test on staging, validate FK constraints | Alembic downgrade script |
| **User Confusion** | Smart defaults, recommended badges, progressive disclosure | In-app tutorials, tooltips |
| **Performance Degradation** | Caching, DB indexes, load testing | Horizontal scaling, connection pooling |
| **Methodology Knowledge Quality** | Review with coaching experts | Allow methodology updates without deployment |

---

## Verification Plan

### End-to-End Scenarios

**Scenario 1: New User Onboarding**
1. Complete wizard with methodology selection
2. Generate program with v2 endpoint
3. Verify exercises match equipment/weak points
4. Check program follows methodology rules
5. Confirm program saved with metadata

**Scenario 2: Readiness Check**
1. Submit poor readiness (all 1s)
2. Verify adjustment recommended
3. Accept adjustment
4. Confirm workout modified
5. Check data persisted

**Scenario 3: Agent Chat**
1. Ask technique question
2. Verify routed to Analyst
3. Confirm methodology-specific advice
4. Test conversation continuity
5. Check conversation saved

### Success Criteria

- ✅ All database migrations apply without errors
- ✅ All unit tests pass (>80% coverage)
- ✅ All integration tests pass
- ✅ Router classifies intents with >85% accuracy
- ✅ Programmer generates valid programs for all methodologies
- ✅ Analyst provides helpful responses (manual review)
- ✅ Readiness checks trigger appropriate adjustments
- ✅ Frontend wizard completes successfully
- ✅ API response times meet targets
- ✅ No breaking changes to existing functionality

---

## Post-Implementation: Phase 2 (Future)

### Nutrition Agent (Deferred)
- TDEE calculation and tracking
- Daily weight/calorie logging
- Macro recommendations based on training phase
- Expenditure algorithm (MacroFactor-style)

### Advanced Features
- Weak point auto-detection from RPE patterns
- Automatic deload week insertion
- Program regeneration triggers (stagnation detection)
- Social features (share programs, coach annotations)
- Mobile app (React Native)
- Wearable integration

---

## Summary

This implementation plan transforms IronPath AI into a sophisticated multi-agent coaching system:

**Architecture:**
- Modular agent design (BaseAgent → specialized agents)
- Database-backed knowledge and exercise library
- Intelligent routing with confidence scoring
- Required pre-workout autoregulation

**Timeline:** 8 weeks, 6 phases

**Extensibility:**
- Easy to add new methodologies (database seed)
- Simple to add new agents (inherit BaseAgent)
- Future-ready for nutrition agent (Phase 2)

**Key Principles:**
- Backward compatibility (dual endpoints)
- Gradual migration (v1 → v2)
- Performance monitoring
- Comprehensive testing

The system maintains the elegant prompt-based architecture while adding structured knowledge, exercise selection logic, and intelligent autoregulation for a world-class powerlifting coaching experience.
