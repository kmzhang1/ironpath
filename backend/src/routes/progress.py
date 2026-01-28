"""
Progress tracking endpoints for workout completions and session data.

Handles:
- Marking sessions as complete
- Recording intensity ratings
- Scheduling workout dates
- Querying progress history
"""
import logging
import uuid
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel, Field

from ..core.database import get_db
from ..models.tables import ProgressLog, Program

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/progress", tags=["progress"])


# ============================================================================
# Request/Response Schemas
# ============================================================================

class SessionCompletionRequest(BaseModel):
    """Request to mark a session as complete."""
    week_number: int = Field(..., ge=1, description="Week number (1-based)")
    day_number: int = Field(..., ge=1, description="Day number within week (1-based)")
    completed_at: Optional[str] = Field(None, description="ISO timestamp of completion")
    intensity_rating: Optional[str] = Field(None, description="Intensity: easy, perfect, or hard")
    scheduled_date: Optional[str] = Field(None, description="ISO date when scheduled")


class IntensityRatingRequest(BaseModel):
    """Request to record intensity rating."""
    week_number: int = Field(..., ge=1)
    day_number: int = Field(..., ge=1)
    intensity_rating: str = Field(..., description="Intensity: easy, perfect, or hard")


class ScheduleDateRequest(BaseModel):
    """Request to schedule a workout date."""
    week_number: int = Field(..., ge=1)
    day_number: int = Field(..., ge=1)
    scheduled_date: str = Field(..., description="ISO date string")


class ProgressLogResponse(BaseModel):
    """Response model for a single progress log entry."""
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


class ProgramProgressSummary(BaseModel):
    """Summary of progress for an entire program."""
    program_id: str
    total_sessions: int
    completed_sessions: int
    completion_rate: float
    logs: List[ProgressLogResponse]


# ============================================================================
# Helper Functions
# ============================================================================

async def get_or_create_progress_log(
    db: AsyncSession,
    user_id: str,
    program_id: str,
    week_number: int,
    day_number: int
) -> ProgressLog:
    """Get existing progress log or create a new one."""
    # Try to find existing log
    result = await db.execute(
        select(ProgressLog).where(
            and_(
                ProgressLog.user_id == user_id,
                ProgressLog.program_id == program_id,
                ProgressLog.week_number == week_number,
                ProgressLog.day_number == day_number
            )
        )
    )
    progress_log = result.scalar_one_or_none()

    if not progress_log:
        # Create new log
        progress_log = ProgressLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            program_id=program_id,
            week_number=week_number,
            day_number=day_number,
            completed=False,
            feedback={}
        )
        db.add(progress_log)
        logger.info(f"Created new ProgressLog: {progress_log.id}")

    return progress_log


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/{program_id}/complete")
async def mark_session_complete(
    program_id: str,
    request: SessionCompletionRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a session as completed and optionally record intensity rating.

    This is the primary endpoint for workout completion tracking.
    """
    # TODO: Get user_id from auth token (Phase 4)
    # For now, get from program ownership
    program_result = await db.execute(
        select(Program).where(Program.id == program_id)
    )
    program = program_result.scalar_one_or_none()

    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    user_id = program.user_id

    # Get or create progress log
    progress_log = await get_or_create_progress_log(
        db, user_id, program_id, request.week_number, request.day_number
    )

    # Update completion status
    progress_log.completed = True
    progress_log.completed_at = (
        datetime.fromisoformat(request.completed_at.replace('Z', '+00:00'))
        if request.completed_at
        else datetime.utcnow()
    )

    # Store intensity rating in feedback JSON
    if request.intensity_rating:
        feedback_data = progress_log.feedback or {}
        feedback_data['intensityRating'] = request.intensity_rating
        progress_log.feedback = feedback_data

    # Store scheduled date if provided
    if request.scheduled_date:
        feedback_data = progress_log.feedback or {}
        feedback_data['scheduledDate'] = request.scheduled_date
        progress_log.feedback = feedback_data

    await db.commit()
    await db.refresh(progress_log)

    logger.info(
        f"Session completed: program={program_id}, week={request.week_number}, "
        f"day={request.day_number}, intensity={request.intensity_rating}"
    )

    return {
        "success": True,
        "message": "Session marked as complete",
        "progress_log": ProgressLogResponse.model_validate(progress_log)
    }


@router.post("/{program_id}/uncomplete")
async def mark_session_uncomplete(
    program_id: str,
    request: IntensityRatingRequest,  # Reuse this - only needs week/day
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a session as NOT completed (undo completion).

    Useful for accidental completions or corrections.
    """
    # Get program to find user_id
    program_result = await db.execute(
        select(Program).where(Program.id == program_id)
    )
    program = program_result.scalar_one_or_none()

    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    user_id = program.user_id

    # Find existing progress log
    result = await db.execute(
        select(ProgressLog).where(
            and_(
                ProgressLog.user_id == user_id,
                ProgressLog.program_id == program_id,
                ProgressLog.week_number == request.week_number,
                ProgressLog.day_number == request.day_number
            )
        )
    )
    progress_log = result.scalar_one_or_none()

    if not progress_log:
        raise HTTPException(
            status_code=404,
            detail="No progress log found for this session"
        )

    # Mark as not completed
    progress_log.completed = False
    progress_log.completed_at = None

    await db.commit()
    await db.refresh(progress_log)

    logger.info(
        f"Session unmarked as complete: program={program_id}, week={request.week_number}, "
        f"day={request.day_number}"
    )

    return {
        "success": True,
        "message": "Session marked as not complete",
        "progress_log": ProgressLogResponse.model_validate(progress_log)
    }


@router.post("/{program_id}/intensity")
async def record_intensity_rating(
    program_id: str,
    request: IntensityRatingRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Record intensity rating for a session (easy/perfect/hard).

    Can be called independently of completion.
    """
    # Get program to find user_id
    program_result = await db.execute(
        select(Program).where(Program.id == program_id)
    )
    program = program_result.scalar_one_or_none()

    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    user_id = program.user_id

    # Get or create progress log
    progress_log = await get_or_create_progress_log(
        db, user_id, program_id, request.week_number, request.day_number
    )

    # Update intensity rating in feedback
    feedback_data = progress_log.feedback or {}
    feedback_data['intensityRating'] = request.intensity_rating
    progress_log.feedback = feedback_data

    await db.commit()
    await db.refresh(progress_log)

    logger.info(
        f"Intensity rating recorded: program={program_id}, week={request.week_number}, "
        f"day={request.day_number}, rating={request.intensity_rating}"
    )

    return {
        "success": True,
        "message": "Intensity rating recorded",
        "intensity_rating": request.intensity_rating
    }


@router.post("/{program_id}/schedule")
async def schedule_workout_date(
    program_id: str,
    request: ScheduleDateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Schedule a workout for a specific date.

    Stores the scheduled date in the progress log.
    """
    # Get program to find user_id
    program_result = await db.execute(
        select(Program).where(Program.id == program_id)
    )
    program = program_result.scalar_one_or_none()

    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    user_id = program.user_id

    # Get or create progress log
    progress_log = await get_or_create_progress_log(
        db, user_id, program_id, request.week_number, request.day_number
    )

    # Update scheduled date in feedback
    feedback_data = progress_log.feedback or {}
    feedback_data['scheduledDate'] = request.scheduled_date
    progress_log.feedback = feedback_data

    await db.commit()
    await db.refresh(progress_log)

    logger.info(
        f"Workout scheduled: program={program_id}, week={request.week_number}, "
        f"day={request.day_number}, date={request.scheduled_date}"
    )

    return {
        "success": True,
        "message": "Workout scheduled",
        "session_id": f"{request.week_number}-{request.day_number}",
        "scheduled_date": request.scheduled_date
    }


@router.get("/{program_id}")
async def get_program_progress(
    program_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get all progress logs for a program.

    Returns completion status and metadata for all sessions.
    """
    # Verify program exists
    program_result = await db.execute(
        select(Program).where(Program.id == program_id)
    )
    program = program_result.scalar_one_or_none()

    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    # Get all progress logs for this program
    result = await db.execute(
        select(ProgressLog)
        .where(ProgressLog.program_id == program_id)
        .order_by(ProgressLog.week_number, ProgressLog.day_number)
    )
    logs = result.scalars().all()

    # Calculate total sessions from program structure
    total_sessions = 0
    program_json = program.program_json
    for week in program_json.get("weeks", []):
        total_sessions += len(week.get("sessions", []))

    completed_sessions = sum(1 for log in logs if log.completed)
    completion_rate = completed_sessions / total_sessions if total_sessions > 0 else 0.0

    return ProgramProgressSummary(
        program_id=program_id,
        total_sessions=total_sessions,
        completed_sessions=completed_sessions,
        completion_rate=completion_rate,
        logs=[ProgressLogResponse.model_validate(log) for log in logs]
    )


@router.get("/{program_id}/week/{week_number}")
async def get_week_progress(
    program_id: str,
    week_number: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Get progress logs for a specific week.
    """
    result = await db.execute(
        select(ProgressLog)
        .where(
            and_(
                ProgressLog.program_id == program_id,
                ProgressLog.week_number == week_number
            )
        )
        .order_by(ProgressLog.day_number)
    )
    logs = result.scalars().all()

    return {
        "program_id": program_id,
        "week_number": week_number,
        "sessions": [ProgressLogResponse.model_validate(log) for log in logs]
    }


@router.post("/{program_id}/bulk-sync")
async def bulk_sync_sessions(
    program_id: str,
    sessions: List[SessionCompletionRequest],
    db: AsyncSession = Depends(get_db),
):
    """
    Bulk sync multiple session completions at once.

    Used for migrating localStorage data to database.
    """
    # Get program to find user_id
    program_result = await db.execute(
        select(Program).where(Program.id == program_id)
    )
    program = program_result.scalar_one_or_none()

    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    user_id = program.user_id

    synced_count = 0
    for session_data in sessions:
        progress_log = await get_or_create_progress_log(
            db, user_id, program_id, session_data.week_number, session_data.day_number
        )

        # Update data
        progress_log.completed = True
        if session_data.completed_at:
            progress_log.completed_at = datetime.fromisoformat(
                session_data.completed_at.replace('Z', '+00:00')
            )

        feedback_data = progress_log.feedback or {}
        if session_data.intensity_rating:
            feedback_data['intensityRating'] = session_data.intensity_rating
        if session_data.scheduled_date:
            feedback_data['scheduledDate'] = session_data.scheduled_date
        progress_log.feedback = feedback_data

        synced_count += 1

    await db.commit()

    logger.info(f"Bulk synced {synced_count} sessions for program {program_id}")

    return {
        "success": True,
        "message": f"Successfully synced {synced_count} sessions",
        "synced_count": synced_count
    }
