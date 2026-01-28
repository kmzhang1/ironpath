# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IronPath is an AI-powered powerlifting program generator with a FastAPI backend and React/TypeScript frontend. The system uses Google Gemini for AI-driven program generation and features a multi-agent architecture for intelligent user interactions.

## Architecture

### Multi-Agent System (Backend)

The backend uses a specialized multi-agent architecture for handling different types of user requests:

- **RouterAgent** (`src/services/router_agent.py`): Classifies user intent and routes to appropriate specialized agent (temperature: 0.3)
- **AnalystAgent** (`src/services/analyst_agent.py`): Analyzes lifter data, readiness checks, and provides insights
- **ProgrammerAgent** (`src/services/programmer_agent.py`): Generates personalized training programs using methodologies from database
- **FeedbackAgent** (`src/services/feedback_agent.py`): Processes workout feedback and suggests program adjustments
- **BaseAgent** (`src/services/base_agent.py`): Abstract base class providing common Gemini API functionality, retry logic, and conversation caching

All agents inherit from `BaseAgent` and store conversation history in the `agent_conversations` database table for context persistence.

### Database Architecture

- **PostgreSQL** with async SQLAlchemy
- **Models** in `backend/src/models/tables.py`:
  - `User` - OAuth authentication via Supabase
  - `LifterProfile` - Biometrics, 1RMs, training history
  - `Program` - Generated training programs (stored as JSON)
  - `ProgressLog` - Workout completion tracking (currently underutilized)
  - `TrainingMethodology` - Seeded methodologies used by ProgrammerAgent
  - `AgentConversation` - Multi-agent conversation history and caching
- **Alembic** for migrations (`backend/alembic/`)

### Frontend State Management

- **Zustand** store (`frontend/src/store/index.ts`) with persistence middleware
- Currently stores critical data (progress, feedback) in local state - see `DATABASE_INTEGRATION_PLAN.md` for planned improvements
- **React Query** for server state management
- **Supabase** client for OAuth authentication

### API Routing

Frontend uses path aliases: `@/` maps to `frontend/src/`

Backend routes (all prefixed with `/api`):
- `/programs` - Program generation and retrieval
- `/feedback` - Workout feedback submission
- `/users` - User management
- `/profiles` - Lifter profile CRUD
- `/router` - Multi-agent chat endpoint
- `/readiness` - Readiness check analysis
- `/methodologies` - Training methodology listing

## Development Commands

### Backend (FastAPI + Python)

```bash
cd backend

# Install dependencies (using UV package manager)
uv venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"

# Run development server
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
# Alternative:
python -m src.main

# Database setup
docker-compose up -d  # Start PostgreSQL
alembic upgrade head  # Run migrations

# Seed data
python src/seed_exercises.py
python src/seed_methodologies.py

# Testing
pytest                                              # Run all tests
pytest --cov=src --cov-report=html --cov-report=term  # With coverage
pytest -m "not real_api"                            # Skip real API tests
pytest tests/test_agents.py -v                      # Specific test file
pytest -k router                                    # Tests matching pattern

# Code quality
ruff check --fix src/    # Lint and auto-fix
mypy src/                # Type checking
```

### Frontend (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Development server
npm run dev     # Runs on http://localhost:5173

# Build for production
npm run build   # TypeScript compilation + Vite build
npm run preview # Preview production build
```

### Database Migrations

```bash
cd backend

# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history
```

## Environment Configuration

### Backend (.env)

Required variables:
```bash
GEMINI_API_KEY=your_api_key_here
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/ironpath_db
```

Optional (with defaults):
- `GEMINI_MODEL=gemini-2.5-flash-lite`
- `ENVIRONMENT=development`
- `DEBUG=true`
- `CORS_ORIGINS=http://localhost:5173,http://localhost:3000`
- `HOST=0.0.0.0`
- `PORT=8000`

### Frontend (.env)

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_API_BASE_URL=http://localhost:8000
```

## Key Implementation Patterns

### Agent System

When adding or modifying agents:
1. Inherit from `BaseAgent` class
2. Override `get_system_prompt()` for agent-specific prompts (in `agent_prompts.py`)
3. Implement `process()` method with proper error handling
4. Use Pydantic schemas for structured output validation
5. Call `save_conversation()` to persist agent interactions
6. Use appropriate temperature (0.3 for classification, 0.7-1.0 for generation)

### Adding API Endpoints

1. Create route in `backend/src/routes/`
2. Define Pydantic request/response schemas in `backend/src/models/schemas.py`
3. Register router in `backend/src/main.py`
4. Add corresponding TypeScript types in `frontend/src/types/`
5. Implement API client function in `frontend/src/services/api.ts`

### Database Operations

- Always use async sessions: `async with get_session() as db:`
- Use `db.commit()` after modifications (not just `db.flush()`)
- Handle transactions properly with try/except blocks
- Remember to `db.refresh(obj)` after commit if you need updated values

### Frontend Component Structure

- **Pages** (`src/pages/`) - Route-level components
- **Features** (`src/components/features/`) - Feature-specific components organized by domain
- **UI Components** (`src/components/ui/`) - Reusable shadcn/ui components
- **Layout** (`src/components/layout/`) - Layout components (sidebars, sheets)

## Testing

The project has comprehensive test coverage (>80%):
- Unit tests for agents, math utilities, models
- API route tests with FastAPI TestClient
- Integration tests for E2E workflows
- Performance tests validating response times

Target coverage:
- Overall: >80%
- Agent classes: >90%
- API routes: >85%

See `backend/TESTING.md` for detailed testing guide.

## Known Issues & Future Work

See `DATABASE_INTEGRATION_PLAN.md` for detailed improvement roadmap:
- `ProgressLog` table is currently unused; workout data stored only in frontend Zustand state
- Need to persist workout completions and feedback to database
- Some endpoints use `db.flush()` without `db.commit()` - changes may not persist

## AI/LLM Integration

- Uses **Google Gemini API** via `google-genai` SDK
- All agents use structured output with Pydantic schema validation
- Conversation history stored in DB for context preservation
- Retry logic and error handling built into `BaseAgent`
- Get API key at: https://ai.google.dev/

## Technology Stack

**Backend:**
- FastAPI, SQLAlchemy (async), PostgreSQL
- Google Gemini (via `google-genai`)
- Pydantic v2, Alembic
- pytest, pytest-asyncio, pytest-cov

**Frontend:**
- React 19, TypeScript, Vite
- TanStack Query, Zustand, React Router
- Tailwind CSS, shadcn/ui, Radix UI
- Supabase Auth

**Package Managers:**
- Backend: UV (recommended) or pip
- Frontend: npm
