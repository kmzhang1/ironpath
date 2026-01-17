# IronPath AI - Backend API

Backend API for IronPath AI, an AI-powered powerlifting program generator using Google Gemini.

## Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL with SQLAlchemy (async)
- **AI/LLM**: Google Gemini (via `google-genai` SDK)
- **Validation**: Pydantic v2
- **Package Manager**: UV

## Project Structure

```
backend/
├── src/
│   ├── models/          # Database models & Pydantic schemas
│   │   ├── tables.py    # SQLAlchemy models (User, LifterProfile, Program)
│   │   └── schemas.py   # Pydantic request/response models
│   ├── routes/          # API endpoints
│   │   └── programs.py  # POST /generate, GET /programs
│   ├── services/        # Business logic
│   │   ├── agent.py     # AI agent for program generation
│   │   ├── agent_prompts.py  # System prompts
│   │   └── math.py      # RPE & DOTS calculations
│   ├── core/            # Configuration
│   │   ├── config.py    # Settings (env vars)
│   │   └── database.py  # DB connection
│   └── main.py          # FastAPI app entry point
├── pyproject.toml       # Dependencies
├── docker-compose.yml   # PostgreSQL container
└── .env.example         # Environment variables template
```

## Quick Start

### 1. Install UV (if not installed)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Install Dependencies

```bash
cd backend
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -e .
```

### 3. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### 4. Start PostgreSQL (Optional - for Phase 2)

```bash
docker-compose up -d
```

### 5. Run the Server

```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

Or using Python:

```bash
python -m src.main
```

The API will be available at:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## API Endpoints

### Phase 1 (Current)

#### `POST /api/programs/generate`
Generate a new powerlifting program using AI.

**Request Body**:
```json
{
  "profile": {
    "id": "user-123",
    "name": "John Powerlifter",
    "biometrics": {
      "bodyweight": 75,
      "unit": "kg",
      "sex": "male",
      "age": 25
    },
    "oneRepMax": {
      "squat": 150,
      "bench": 100,
      "deadlift": 180
    }
  },
  "request": {
    "goal": "strength_block",
    "weeks": 8,
    "daysPerWeek": 4,
    "limitations": ["Low back pain"],
    "focusAreas": ["Lockout strength"]
  }
}
```

**Response**:
```json
{
  "program": {
    "id": "prog-uuid",
    "createdAt": "2026-01-14T00:00:00Z",
    "title": "8-Week Strength Development",
    "weeks": [...]
  },
  "message": "Program generated successfully"
}
```

### Phase 2 (Coming Soon)
- `POST /api/auth/google` - Google OAuth login
- User session management

### Phase 3 (Coming Soon)
- `GET /api/programs` - List user's programs
- `GET /api/programs/{id}` - Get specific program

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://postgres:postgres@localhost:5432/ironpath_db` |
| `GEMINI_API_KEY` | Google Gemini API key | (required) |
| `GEMINI_MODEL` | Gemini model name | `gemini-2.5-flash` |
| `ENVIRONMENT` | Environment (development/production) | `development` |
| `DEBUG` | Enable debug mode | `true` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:5173,http://localhost:3000` |
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `8000` |

## Development

### Run Tests (Coming Soon)

```bash
pytest
```

### Format Code

```bash
ruff check --fix src/
```

### Type Checking

The project uses Pydantic for runtime validation. For static type checking:

```bash
uv pip install mypy
mypy src/
```

## Key Features

### 1. AI Program Generation
Uses Google Gemini with structured output to generate scientifically-sound powerlifting programs. The AI acts as an elite powerlifting coach with expertise in:
- Block periodization
- RPE-based autoregulation
- Exercise variation selection
- Fatigue management

### 2. RPE & DOTS Calculations
Implements industry-standard formulas:
- **RPE (Rate of Perceived Exertion)**: Tuscherer's RTS chart for load calculations
- **DOTS**: IPF formula for comparing relative strength across bodyweights

### 3. Structured Output Validation
All AI-generated programs are validated against Pydantic schemas to ensure data integrity and type safety.

## Troubleshooting

### "No Gemini API key configured"
Add your Google Gemini API key to `.env`:
```bash
GEMINI_API_KEY=your_key_here
```

Get an API key at: https://ai.google.dev/

### Database Connection Errors
Ensure PostgreSQL is running:
```bash
docker-compose up -d
docker-compose ps
```

### Port Already in Use
Change the port in `.env`:
```bash
PORT=8001
```

## License

MIT
