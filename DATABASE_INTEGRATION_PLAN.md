# IronPath Database Integration Plan

## Executive Summary

This document outlines the plan to fully integrate database tables into IronPath's program creation and data storage workflows. Currently, critical user data (workout progress, feedback) is stored only in frontend state, creating risks of data loss and limiting cross-device functionality.

---

## Current State Analysis

### What's Working ✅

1. **User Management**
   - OAuth authentication via Supabase
   - User creation and retrieval working correctly
   - Profile setup saves to both `user_profile_data` and `lifter_profiles`

2. **Program Generation**
   - AI-powered program generation functional
   - Programs saved to database with full JSON structure
   - Program retrieval working

3. **Methodology System**
   - Training methodologies stored in database
   - Used by programmer agent for program generation

### What's Broken ❌

1. **ProgressLog Table - COMPLETELY UNUSED**
   - Table exists but never imported
   - Workout completions not persisted
   - Feedback not saved to database
   - Progress history sent from client instead of queried from DB

2. **Data Architecture Issues**
   - Frontend stores critical data in Zustand (local state)
   - Users lose progress if they clear browser data
   - No cross-device sync
   - No historical analytics possible

3. **Missing Database Commits**
   - Several endpoints use `db.flush()` but never `db.commit()`
   - Changes may not persist to database

---

## Implementation Plan

### Phase 1: Fix Core Data Persistence (HIGH PRIORITY)

#### 1.1 Add Missing Database Commits

**Files to Update:**
- `backend/src/routes/profiles.py`

**Changes:**
```python
# Lines 87-88 and 137-138
await db.flush()  # REMOVE
await db.commit()  # ADD
```

**Why:** `flush()` sends SQL to database but doesn't commit the transaction. Need `commit()` for persistence.

---

#### 1.2 Implement ProgressLog for Workout Tracking

**File:** `backend/src/routes/feedback.py`

**Implementation Tasks:**

##### A. Add ProgressLog Import and Dependencies
```python
from ..models.tables import ProgressLog, Program
from sqlalchemy import select, and_
import uuid
```

##### B. Update `schedule_workout` Endpoint (Lines 116-158)

**Current State:**
```python
# TODO: Persist to database in Phase 3
# For now, just return success (frontend handles via Zustand)
```

**New Implementation:**
```python
@router.post("/schedule-workout")
async def schedule_workout(
    update: SessionDateUpdate,
    user_id: str,  # ADD: Get from auth token
    program_id: str,  # ADD: Get from request body
    db: AsyncSession = Depends(get_db),
):
    """Schedule a workout and persist to database."""

    # Check if program exists
    program_result = await db.execute(
        select(Program).where(Program.id == program_id)
    )
    program = program_result.scalar_one_or_none()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    # Check if progress log exists for this session
    result = await db.execute(
        select(ProgressLog).where(
            and_(
                ProgressLog.user_id == user_id,
                ProgressLog.program_id == program_id,
                ProgressLog.week_number == update.weekNumber,
                ProgressLog.day_number == update.dayNumber
            )
        )
    )
    progress_log = result.scalar_one_or_none()

    if not progress_log:
        # Create new progress log entry
        progress_log = ProgressLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            program_id=program_id,
            week_number=update.weekNumber,
            day_number=update.dayNumber,
            completed=False
        )
        db.add(progress_log)

    await db.commit()

    return {
        "message": "Workout scheduled successfully",
        "sessionId": f"{update.weekNumber}-{update.dayNumber}",
        "scheduledDate": update.scheduledDate,
        "progressLogId": progress_log.id
    }
```

##### C. Update `submit_workout_feedback` Endpoint (Lines 29-113)

**Add After Line 92 (after successful adjustment):**
```python
# Persist feedback to database
result = await db.execute(
    select(ProgressLog).where(
        and_(
            ProgressLog.user_id == user_id,  # Need to get from auth
            ProgressLog.program_id == program_id,  # Need from request
            ProgressLog.week_number == feedback.weekNumber,
            ProgressLog.day_number == feedback.dayNumber
        )
    )
)
progress_log = result.scalar_one_or_none()

if progress_log:
    # Update existing log
    progress_log.completed = True
    progress_log.completed_at = datetime.utcnow()
    progress_log.feedback = {
        "categories": [cat.value for cat in feedback.categories],
        "feedbackText": feedback.feedbackText,
        "adjustmentReason": adjustment_reason,
        "originalSession": session.model_dump(),
        "adjustedSession": adjusted_session.model_dump()
    }
else:
    # Create new log if it doesn't exist
    progress_log = ProgressLog(
        id=str(uuid.uuid4()),
        user_id=user_id,
        program_id=program_id,
        week_number=feedback.weekNumber,
        day_number=feedback.dayNumber,
        completed=True,
        completed_at=datetime.utcnow(),
        feedback={
            "categories": [cat.value for cat in feedback.categories],
            "feedbackText": feedback.feedbackText,
            "adjustmentReason": adjustment_reason
        }
    )
    db.add(progress_log)

await db.commit()
logger.info(f"Saved workout feedback to database: {progress_log.id}")
```

##### D. Update `perform_check_in` Endpoint (Lines 161-293)

**Replace Lines 200-208 (progress history calculation):**

**Current:**
```python
# Calculate metrics from progress history
sessions = progress_history.get("sessions", [])

# Filter sessions in period
sessions_in_period = [
    s for s in sessions
    if s.get("completedAt") and
    start_date <= datetime.fromisoformat(s["completedAt"].replace("Z", "+00:00")) <= end_date
]
```

**New:**
```python
# Query actual progress from database
result = await db.execute(
    select(ProgressLog)
    .where(ProgressLog.user_id == user_id)  # Get from auth
    .where(ProgressLog.program_id == current_program.get("id"))
    .where(ProgressLog.created_at >= start_date)
    .where(ProgressLog.created_at <= end_date)
)
sessions_in_period = result.scalars().all()

# Calculate metrics from database records
sessions_completed = sum(1 for s in sessions_in_period if s.completed)

# Get planned sessions from program structure
weeks_in_period = set(s.week_number for s in sessions_in_period)
sessions_planned = 0
for week in current_program.get("weeks", []):
    if week["weekNumber"] in weeks_in_period:
        sessions_planned += len(week["sessions"])

adherence_rate = (
    sessions_completed / sessions_planned if sessions_planned > 0 else 0.0
)

# Calculate average RPE from feedback
all_rpes = []
for log in sessions_in_period:
    if log.feedback and log.feedback.get("adjustedSession"):
        for exercise in log.feedback["adjustedSession"].get("exercises", []):
            if exercise.get("rpeTarget"):
                all_rpes.append(exercise["rpeTarget"])

avg_rpe = sum(all_rpes) / len(all_rpes) if all_rpes else None
```

---

### Phase 2: Add ProgressLog Query Endpoints (MEDIUM PRIORITY)

**File:** `backend/src/routes/progress.py` (NEW FILE)

**Create New Router:**

```python
"""
Progress tracking endpoints
"""
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from pydantic import BaseModel

from ..core.database import get_db
from ..models.tables import ProgressLog, Program

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/progress", tags=["progress"])


class ProgressLogResponse(BaseModel):
    """Single progress log entry"""
    id: str
    program_id: str
    week_number: int
    day_number: int
    completed: bool
    completed_at: Optional[datetime]
    feedback: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True


class ProgramProgressResponse(BaseModel):
    """Program progress summary"""
    program_id: str
    total_sessions: int
    completed_sessions: int
    completion_rate: float
    logs: List[ProgressLogResponse]


@router.get("/{program_id}", response_model=ProgramProgressResponse)
async def get_program_progress(
    program_id: str,
    user_id: str,  # TODO: Get from auth token
    db: AsyncSession = Depends(get_db),
):
    """Get all progress logs for a program."""

    # Verify program exists and belongs to user
    program_result = await db.execute(
        select(Program).where(
            and_(
                Program.id == program_id,
                Program.user_id == user_id
            )
        )
    )
    program = program_result.scalar_one_or_none()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    # Get all progress logs
    result = await db.execute(
        select(ProgressLog)
        .where(
            and_(
                ProgressLog.program_id == program_id,
                ProgressLog.user_id == user_id
            )
        )
        .order_by(ProgressLog.week_number, ProgressLog.day_number)
    )
    logs = result.scalars().all()

    # Calculate total sessions from program
    total_sessions = 0
    for week in program.program_json.get("weeks", []):
        total_sessions += len(week.get("sessions", []))

    completed_sessions = sum(1 for log in logs if log.completed)
    completion_rate = completed_sessions / total_sessions if total_sessions > 0 else 0.0

    return ProgramProgressResponse(
        program_id=program_id,
        total_sessions=total_sessions,
        completed_sessions=completed_sessions,
        completion_rate=completion_rate,
        logs=[ProgressLogResponse.model_validate(log) for log in logs]
    )


@router.get("/{program_id}/week/{week_number}", response_model=List[ProgressLogResponse])
async def get_week_progress(
    program_id: str,
    week_number: int,
    user_id: str,  # TODO: Get from auth token
    db: AsyncSession = Depends(get_db),
):
    """Get progress logs for a specific week."""

    result = await db.execute(
        select(ProgressLog)
        .where(
            and_(
                ProgressLog.program_id == program_id,
                ProgressLog.user_id == user_id,
                ProgressLog.week_number == week_number
            )
        )
        .order_by(ProgressLog.day_number)
    )
    logs = result.scalars().all()

    return [ProgressLogResponse.model_validate(log) for log in logs]


@router.post("/{program_id}/mark-complete")
async def mark_session_complete(
    program_id: str,
    week_number: int,
    day_number: int,
    user_id: str,  # TODO: Get from auth token
    db: AsyncSession = Depends(get_db),
):
    """Mark a session as completed."""

    result = await db.execute(
        select(ProgressLog).where(
            and_(
                ProgressLog.program_id == program_id,
                ProgressLog.user_id == user_id,
                ProgressLog.week_number == week_number,
                ProgressLog.day_number == day_number
            )
        )
    )
    progress_log = result.scalar_one_or_none()

    if not progress_log:
        # Create if doesn't exist
        progress_log = ProgressLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            program_id=program_id,
            week_number=week_number,
            day_number=day_number,
            completed=True,
            completed_at=datetime.utcnow()
        )
        db.add(progress_log)
    else:
        progress_log.completed = True
        progress_log.completed_at = datetime.utcnow()

    await db.commit()

    return {"message": "Session marked as complete", "id": progress_log.id}
```

**Register Router in `main.py`:**
```python
from .routes.progress import router as progress_router

app.include_router(progress_router, prefix="/api")
```

---

### Phase 3: Initialize ProgressLog on Program Creation (MEDIUM PRIORITY)

**File:** `backend/src/routes/programs.py`

**Update `generate_program` or `save_program` endpoint:**

**Add After Program is Saved:**
```python
# Create ProgressLog entries for all sessions
progress_logs = []
for week in program_json["weeks"]:
    for session in week["sessions"]:
        progress_log = ProgressLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            program_id=program.id,
            week_number=week["weekNumber"],
            day_number=session["dayNumber"],
            completed=False
        )
        progress_logs.append(progress_log)

db.add_all(progress_logs)
await db.commit()

logger.info(f"Created {len(progress_logs)} progress log entries for program {program.id}")
```

**Benefits:**
- Pre-populate progress tracking structure
- Simplifies frontend logic
- Ensures every session has a tracking record

---

### Phase 4: Add User Authentication Context (HIGH PRIORITY)

**Problem:** Currently, `user_id` and `program_id` need to be passed in request bodies

**Solution:** Implement JWT token authentication

**Files to Create/Update:**

#### A. Create Auth Dependency
**File:** `backend/src/core/auth.py` (NEW)

```python
"""
Authentication and authorization utilities
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel
from typing import Optional

from .config import settings

security = HTTPBearer()


class CurrentUser(BaseModel):
    """Current authenticated user"""
    id: str
    email: str


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> CurrentUser:
    """
    Validate JWT token and return current user.

    Token should be from Supabase OAuth.
    """
    token = credentials.credentials

    try:
        # Decode Supabase JWT
        # Note: Need to verify with Supabase public key
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,  # Add to config
            algorithms=["HS256"],
            options={"verify_signature": True}
        )

        user_id: str = payload.get("sub")
        email: str = payload.get("email")

        if user_id is None or email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )

        return CurrentUser(id=user_id, email=email)

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
```

#### B. Update Endpoints to Use Auth
```python
from ..core.auth import get_current_user, CurrentUser

@router.post("/schedule-workout")
async def schedule_workout(
    update: SessionDateUpdate,
    program_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.id
    # ... rest of implementation
```

---

### Phase 5: Frontend Integration (MEDIUM PRIORITY)

**Update Frontend to Use Database Instead of Zustand**

#### Files to Update:

##### A. `frontend/src/services/api.ts`

Add new API functions:
```typescript
// Progress tracking
export const getProgress = async (programId: string) => {
  return api.get(`/progress/${programId}`);
};

export const getWeekProgress = async (programId: string, weekNumber: number) => {
  return api.get(`/progress/${programId}/week/${weekNumber}`);
};

export const markSessionComplete = async (
  programId: string,
  weekNumber: number,
  dayNumber: number
) => {
  return api.post(`/progress/${programId}/mark-complete`, {
    week_number: weekNumber,
    day_number: dayNumber
  });
};

export const scheduleWorkout = async (
  programId: string,
  weekNumber: number,
  dayNumber: number,
  scheduledDate: string
) => {
  return api.post('/feedback/schedule-workout', {
    program_id: programId,
    weekNumber,
    dayNumber,
    scheduledDate
  });
};
```

##### B. `frontend/src/store/index.ts`

Update Zustand store to sync with backend:
```typescript
// Add effects to sync progress with backend
completeWorkout: async (weekNumber: number, dayNumber: number) => {
  const { currentProgram } = get();
  if (!currentProgram) return;

  // Update local state
  set((state) => ({
    completedSessions: [
      ...state.completedSessions,
      { weekNumber, dayNumber, completedAt: new Date().toISOString() }
    ]
  }));

  // Sync with backend
  try {
    await markSessionComplete(currentProgram.id, weekNumber, dayNumber);
  } catch (error) {
    console.error('Failed to sync workout completion:', error);
    // Could implement retry logic or offline queue
  }
}
```

##### C. Update Program Loading
```typescript
// When loading program, also fetch progress
const loadProgram = async (programId: string) => {
  const [program, progress] = await Promise.all([
    getProgram(programId),
    getProgress(programId)
  ]);

  set({
    currentProgram: program,
    completedSessions: progress.logs
      .filter(log => log.completed)
      .map(log => ({
        weekNumber: log.week_number,
        dayNumber: log.day_number,
        completedAt: log.completed_at
      }))
  });
};
```

---

### Phase 6: ReadinessCheck Persistence Verification (LOW PRIORITY)

**File:** `backend/src/routes/readiness.py`

**Tasks:**
1. Review existing implementation
2. Verify data is being committed to database
3. Add query endpoints if needed

---

### Phase 7: Enhanced Program Metadata (LOW PRIORITY)

**Update Program Creation to Store More Metadata**

**File:** `backend/src/routes/programs.py`

```python
# When creating program, store generation metadata
program = Program(
    id=str(uuid.uuid4()),
    user_id=user_id,
    title=generated_program.title,
    program_json=generated_program.model_dump(),
    methodology_id=methodology_id,  # If methodology was selected
    generation_metadata={
        "goal": request.goal,
        "weeks": request.weeks,
        "daysPerWeek": request.daysPerWeek,
        "limitations": request.limitations,
        "focusAreas": request.focusAreas,
        "profile_snapshot": {
            "bodyweight": profile.biometrics.bodyweight,
            "squat_1rm": profile.oneRepMax.squat,
            "bench_1rm": profile.oneRepMax.bench,
            "deadlift_1rm": profile.oneRepMax.deadlift
        },
        "generated_at": datetime.utcnow().isoformat(),
        "model_used": settings.GEMINI_MODEL
    }
)
```

---

## Implementation Checklist

### Phase 1: Core Fixes (Week 1)
- [ ] Replace `db.flush()` with `db.commit()` in profiles.py
- [ ] Add ProgressLog import to feedback.py
- [ ] Implement schedule_workout with database persistence
- [ ] Implement submit_workout_feedback with database persistence
- [ ] Update perform_check_in to query database instead of client data
- [ ] Test all feedback endpoints with database

### Phase 2: Progress Endpoints (Week 1)
- [ ] Create progress.py router file
- [ ] Implement get_program_progress endpoint
- [ ] Implement get_week_progress endpoint
- [ ] Implement mark_session_complete endpoint
- [ ] Register progress router in main.py
- [ ] Test all progress endpoints

### Phase 3: Program Initialization (Week 2)
- [ ] Update program creation to initialize ProgressLog entries
- [ ] Test program creation creates all expected logs
- [ ] Verify logs are queryable immediately after program creation

### Phase 4: Authentication (Week 2)
- [ ] Create auth.py with JWT validation
- [ ] Add SUPABASE_JWT_SECRET to config
- [ ] Update all protected endpoints to use get_current_user
- [ ] Test authentication flow end-to-end
- [ ] Update frontend to send auth tokens

### Phase 5: Frontend Integration (Week 3)
- [ ] Add progress API functions to frontend
- [ ] Update Zustand store to sync with backend
- [ ] Update program loading to fetch progress
- [ ] Update workout completion to call backend
- [ ] Test offline handling
- [ ] Test cross-device sync

### Phase 6: Additional Features (Week 3)
- [ ] Verify ReadinessCheck persistence
- [ ] Add program metadata storage
- [ ] Add analytics endpoints

---

## Database Migration Checklist

### Required Migrations
- [x] ProgressLog table exists (already migrated)
- [x] LifterProfile extended fields (already migrated)
- [x] Program extended fields (already migrated)
- [ ] Verify all migrations applied to production database

### Index Optimization
Consider adding indexes for common queries:

```sql
CREATE INDEX idx_progress_logs_user_program ON progress_logs(user_id, program_id);
CREATE INDEX idx_progress_logs_week_day ON progress_logs(week_number, day_number);
CREATE INDEX idx_progress_logs_completed ON progress_logs(completed, completed_at);
```

---

## Testing Strategy

### Unit Tests
1. Test ProgressLog CRUD operations
2. Test feedback submission persists to database
3. Test check-in queries database correctly
4. Test program initialization creates all logs

### Integration Tests
1. Test full workout flow: schedule → complete → feedback
2. Test cross-device sync
3. Test offline queue (if implemented)

### Manual Testing
1. Create new program → verify logs created
2. Complete workout → verify log updated
3. Submit feedback → verify feedback saved
4. Perform check-in → verify uses database data
5. Clear browser data → verify data persists
6. Switch devices → verify progress synced

---

## Success Metrics

1. **Data Persistence:** 100% of workout completions persisted to database
2. **Cross-Device Sync:** Users can access progress from any device
3. **Zero Data Loss:** No progress lost on browser clear
4. **Performance:** Progress queries complete in <100ms
5. **Code Quality:** All database operations use proper commit/rollback

---

## Rollback Plan

If issues arise during implementation:

1. **Database Changes:** Can rollback migrations
2. **API Changes:** Keep old endpoints alongside new ones initially
3. **Frontend Changes:** Feature flag new sync logic
4. **Gradual Rollout:** Deploy to small percentage of users first

---

## Future Enhancements

1. **Offline Support:** Queue progress updates for offline users
2. **Conflict Resolution:** Handle concurrent edits from multiple devices
3. **Real-time Sync:** WebSocket for live progress updates
4. **Analytics Dashboard:** Visualize adherence trends
5. **Export Data:** Allow users to export their progress
6. **Social Features:** Share progress with coach/training partner

---

## Questions to Resolve

1. **Authentication:** Confirm Supabase JWT validation approach
2. **Offline Handling:** What happens if user completes workout offline?
3. **Data Retention:** How long to keep old progress logs?
4. **Privacy:** Who can view user progress data?
5. **Rate Limiting:** Prevent abuse of progress endpoints

---

## Dependencies

### Backend
- `python-jose[cryptography]` - JWT validation (if not already installed)
- Existing SQLAlchemy, FastAPI, etc.

### Frontend
- No new dependencies required
- May want to add retry logic library for offline support

---

## Documentation Updates Needed

1. Update API documentation with new progress endpoints
2. Document authentication flow
3. Update frontend state management docs
4. Create database schema diagram
5. Write migration guide for existing users

---

## Timeline Estimate

- **Phase 1 (Core Fixes):** 3-4 days
- **Phase 2 (Progress Endpoints):** 2-3 days
- **Phase 3 (Program Init):** 1-2 days
- **Phase 4 (Authentication):** 2-3 days
- **Phase 5 (Frontend Integration):** 5-7 days
- **Phase 6 (Additional Features):** 2-3 days

**Total:** ~3-4 weeks for complete implementation and testing

---

*Last Updated: 2026-01-26*
*Author: Claude Code Analysis*
