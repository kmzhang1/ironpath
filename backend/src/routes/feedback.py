"""
Workout feedback and check-in endpoints
"""
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.config import settings
from ..models.schemas import (
    WorkoutFeedbackRequest,
    WorkoutFeedbackResponse,
    SessionDateUpdate,
    CheckInRequest,
    CheckInAnalysisResponse,
    CheckInMetrics,
    LiftingSessionSchema,
)
from ..services.feedback_agent import FeedbackAgent, CheckInAgent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("/workout", response_model=WorkoutFeedbackResponse)
async def submit_workout_feedback(
    feedback: WorkoutFeedbackRequest,
    program_json: dict,  # Client should send the current program
    db: AsyncSession = Depends(get_db),
):
    """
    Submit workout feedback and receive AI-adjusted workout.

    This endpoint:
    1. Receives user feedback about a workout (injuries, fatigue, etc.)
    2. Uses AI to analyze feedback and adjust the workout accordingly
    3. Returns the adjusted workout with explanation

    Args:
        feedback: User's feedback about the workout
        program_json: Current program data (includes the session to adjust)
        db: Database session (injected)

    Returns:
        WorkoutFeedbackResponse with original and adjusted session

    Raises:
        HTTPException: If feedback processing fails
    """
    try:
        logger.info(
            f"Received workout feedback for Week {feedback.weekNumber}, Day {feedback.dayNumber}"
        )

        # Extract the session from program
        session = None
        for week in program_json.get("weeks", []):
            if week["weekNumber"] == feedback.weekNumber:
                for sess in week["sessions"]:
                    if sess["dayNumber"] == feedback.dayNumber:
                        session = LiftingSessionSchema(**sess)
                        break

        if not session:
            raise HTTPException(
                status_code=404,
                detail=f"Session not found for week {feedback.weekNumber}, day {feedback.dayNumber}"
            )

        # Initialize feedback agent
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "":
            logger.warning("No Gemini API key configured, using mock adjustment")
            adjusted_session = session.model_copy(deep=True)
            adjustment_reason = "MOCK: Reduced intensity based on fatigue feedback"
        else:
            agent = FeedbackAgent(
                api_key=settings.GEMINI_API_KEY,
                model_name=settings.GEMINI_MODEL,
            )
            adjusted_session, adjustment_reason = await agent.adjust_workout(
                original_session=session,
                feedback_categories=feedback.categories,
                feedback_text=feedback.feedbackText,
            )

        session_id = f"{feedback.weekNumber}-{feedback.dayNumber}"

        logger.info(f"Successfully adjusted session: {session_id}")

        return WorkoutFeedbackResponse(
            sessionId=session_id,
            originalSession=session,
            adjustedSession=adjusted_session,
            adjustmentReason=adjustment_reason,
            timestamp=datetime.utcnow().isoformat() + "Z",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Feedback processing failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to process workout feedback",
                "code": "FEEDBACK_FAILED",
                "details": {"message": str(e)},
            },
        )


@router.post("/schedule-workout")
async def schedule_workout(
    update: SessionDateUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Schedule a workout for a specific date.

    Note: This is primarily handled on the frontend with Zustand,
    but this endpoint can be used for server-side persistence later.

    Args:
        update: Session date update request
        db: Database session

    Returns:
        Success message
    """
    try:
        logger.info(
            f"Scheduling workout: Week {update.weekNumber}, Day {update.dayNumber} "
            f"for {update.scheduledDate}"
        )

        # TODO: Persist to database in Phase 3
        # For now, just return success (frontend handles via Zustand)

        return {
            "message": "Workout scheduled successfully",
            "sessionId": f"{update.weekNumber}-{update.dayNumber}",
            "scheduledDate": update.scheduledDate,
        }

    except Exception as e:
        logger.error(f"Failed to schedule workout: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to schedule workout",
                "code": "SCHEDULE_FAILED",
                "details": {"message": str(e)},
            },
        )


@router.post("/check-in", response_model=CheckInAnalysisResponse)
async def perform_check_in(
    request: CheckInRequest,
    progress_history: dict,  # Client sends their progress history
    current_program: dict,  # Client sends current program
    db: AsyncSession = Depends(get_db),
):
    """
    Perform daily or weekly check-in analysis.

    This endpoint:
    1. Analyzes user's progress over the check-in period
    2. Calculates adherence, volume, and performance metrics
    3. Uses AI to generate insights and recommendations
    4. Determines if major program adjustments are needed
    5. Returns adjusted program if necessary

    Args:
        request: Check-in request (type: daily/weekly)
        progress_history: User's progress history from frontend
        current_program: Current program data
        db: Database session

    Returns:
        CheckInAnalysisResponse with metrics, insights, and optional adjusted program

    Raises:
        HTTPException: If check-in analysis fails
    """
    try:
        logger.info(f"Performing {request.type} check-in")

        # Calculate period dates
        end_date = datetime.utcnow()
        if request.type == "daily":
            start_date = end_date - timedelta(days=1)
        else:  # weekly
            start_date = end_date - timedelta(weeks=1)

        # Calculate metrics from progress history
        sessions = progress_history.get("sessions", [])

        # Filter sessions in period
        sessions_in_period = [
            s for s in sessions
            if s.get("completedAt") and
            start_date <= datetime.fromisoformat(s["completedAt"].replace("Z", "+00:00")) <= end_date
        ]

        # Calculate basic metrics
        sessions_completed = len(sessions_in_period)

        # Estimate planned sessions (simplified)
        if request.type == "daily":
            sessions_planned = 1  # Assume max 1 session per day
        else:
            # Get days per week from program (estimate)
            sessions_planned = 4  # Default estimate

        adherence_rate = (
            sessions_completed / sessions_planned if sessions_planned > 0 else 0.0
        )

        # Calculate average RPE if exercise logs exist
        all_rpes = []
        for session in sessions_in_period:
            for exercise_log in session.get("exerciseLogs", []):
                for set_data in exercise_log.get("sets", []):
                    if set_data.get("completed") and set_data.get("rpe"):
                        all_rpes.append(set_data["rpe"])

        avg_rpe = sum(all_rpes) / len(all_rpes) if all_rpes else None

        metrics = CheckInMetrics(
            sessionsCompleted=sessions_completed,
            sessionsPlanned=sessions_planned,
            adherenceRate=adherence_rate,
            averageRPE=avg_rpe,
            totalVolume=None,  # TODO: Calculate volume
        )

        # Use AI to generate insights
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "":
            logger.warning("No Gemini API key configured, using mock insights")
            insights = ["MOCK: You completed most of your workouts this period"]
            recommendations = ["MOCK: Consider maintaining current intensity"]
            program_adjustments_needed = False
            adjusted_program = None
        else:
            agent = CheckInAgent(
                api_key=settings.GEMINI_API_KEY,
                model_name=settings.GEMINI_MODEL,
            )

            insights, recommendations, program_adjustments_needed, adjusted_program = (
                await agent.analyze_progress(
                    check_in_type=request.type,
                    metrics=metrics,
                    sessions=sessions_in_period,
                    current_program=current_program,
                    progress_history=progress_history,
                )
            )

        logger.info(
            f"Check-in complete: {sessions_completed}/{sessions_planned} sessions, "
            f"adherence={adherence_rate:.1%}"
        )

        return CheckInAnalysisResponse(
            type=request.type,
            timestamp=datetime.utcnow().isoformat() + "Z",
            period={
                "startDate": start_date.isoformat() + "Z",
                "endDate": end_date.isoformat() + "Z",
            },
            metrics=metrics,
            insights=insights,
            recommendations=recommendations,
            programAdjustmentsNeeded=program_adjustments_needed,
            adjustedProgram=adjusted_program,
        )

    except Exception as e:
        logger.error(f"Check-in analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to perform check-in",
                "code": "CHECKIN_FAILED",
                "details": {"message": str(e)},
            },
        )
