# Phase 1 Quick Reference Guide

## Alembic Commands

```bash
cd backend
source .venv/bin/activate

# Check current migration
alembic current

# View migration history
alembic history

# Upgrade to latest
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# Create new migration
alembic revision -m "description"

# Auto-generate migration from models
alembic revision --autogenerate -m "description"
```

## Seed Commands

```bash
# Seed methodologies (idempotent)
python -m src.seed_methodologies

# Seed exercises (idempotent)
python -m src.seed_exercises
```

## Database Schema Queries

### Check Methodology Count
```python
from sqlalchemy import select, func
from src.models.tables import TrainingMethodology

result = await session.execute(select(func.count()).select_from(TrainingMethodology))
count = result.scalar()
```

### Get All Methodologies
```python
from sqlalchemy import select
from src.models.tables import TrainingMethodology

result = await session.execute(select(TrainingMethodology))
methodologies = result.scalars().all()
```

### Filter Exercises by Category
```python
from sqlalchemy import select
from src.models.tables import Exercise

result = await session.execute(
    select(Exercise).where(Exercise.category == "squat")
)
exercises = result.scalars().all()
```

### Filter Exercises by Complexity
```python
result = await session.execute(
    select(Exercise).where(Exercise.complexity == "beginner")
)
exercises = result.scalars().all()
```

## Seeded Data IDs

### Methodologies
- `linear_progression` - Beginner
- `westside_conjugate` - Advanced
- `daily_undulating` - Intermediate

### Sample Exercise IDs
- `competition_squat`
- `pause_squat`
- `box_squat`
- `front_squat`
- `competition_bench`
- `pause_bench`
- `close_grip_bench`
- `floor_press`
- `competition_deadlift`
- `sumo_deadlift`
- `deficit_deadlift`
- `rack_pull`

See [seed_exercises.py](src/seed_exercises.py) for all 36 exercises.

## Extended Profile Fields

### Training Age Options
```python
from src.models.schemas import TrainingAgeEnum

TrainingAgeEnum.NOVICE       # "novice"
TrainingAgeEnum.INTERMEDIATE # "intermediate"
TrainingAgeEnum.ADVANCED     # "advanced"
```

### Equipment Access Options
```python
from src.models.schemas import EquipmentAccessEnum

EquipmentAccessEnum.GARAGE     # "garage"
EquipmentAccessEnum.COMMERCIAL # "commercial"
EquipmentAccessEnum.HARDCORE   # "hardcore"
```

### Weak Points (Array of Strings)
Common values:
- `"lockout"`
- `"off_chest"`
- `"hole"`
- `"starting_strength"`
- `"quad_strength"`
- `"hamstrings"`
- `"upper_back"`
- `"core_stability"`

## Example: Create Extended Profile

```python
from src.models.tables import LifterProfile
from datetime import datetime

profile = LifterProfile(
    id="user_profile_1",
    user_id="user_123",
    bodyweight=185.0,
    unit="lbs",
    sex="male",
    age=28,
    squat_1rm=405.0,
    bench_1rm=285.0,
    deadlift_1rm=495.0,
    training_age="intermediate",
    weak_points=["lockout", "off_chest"],
    equipment_access="commercial",
    preferred_session_length=90,
    methodology_id="westside_conjugate",
    competition_date=datetime(2026, 6, 15)
)
```

## Example: Query Exercises for Profile

```python
from sqlalchemy import select
from src.models.tables import Exercise

# Filter by equipment available
result = await session.execute(
    select(Exercise).where(
        Exercise.equipment.contains(["barbell", "rack"])
    )
)

# Filter by complexity
result = await session.execute(
    select(Exercise).where(
        Exercise.complexity.in_(["beginner", "intermediate"])
    )
)

# Filter by weak points targeted
result = await session.execute(
    select(Exercise).where(
        Exercise.targets_weak_points.overlap(["lockout", "off_chest"])
    )
)
```

## Schema Reference

### New Tables
- `training_methodologies` (3 rows)
- `exercises` (36 rows)
- `readiness_checks` (empty)
- `agent_conversations` (empty)

### Extended Columns
**lifter_profiles:**
- `training_age` VARCHAR (default: 'novice')
- `weak_points` JSON (default: [])
- `equipment_access` VARCHAR (default: 'commercial')
- `preferred_session_length` INTEGER (default: 60)
- `competition_date` TIMESTAMP (nullable)
- `methodology_id` VARCHAR (nullable, FK)

**programs:**
- `methodology_id` VARCHAR (nullable, FK)
- `generation_metadata` JSON (default: {})

## Testing Queries

### Verify All Tables Exist
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Check Indexes
```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Check Foreign Keys
```sql
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

## Next Phase Preview

Phase 2 will implement:
1. `BaseAgent` class with Gemini integration
2. `RouterAgent` for intent classification
3. `ProgrammerAgent` with methodology awareness
4. `AnalystMentorAgent` with knowledge retrieval

Prepare by reviewing:
- [MULTI_AGENT_IMPLEMENTATION_PLAN.md](../MULTI_AGENT_IMPLEMENTATION_PLAN.md#phase-2-agent-architecture---base-classes)
- Your Gemini API key in `.env`
