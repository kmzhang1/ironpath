"""
Readiness check endpoints for pre-workout autoregulation
"""
import logging
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..models.schemas import ReadinessCheckRequest, ReadinessCheckResponse
from ..models.tables import ReadinessCheck

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/readiness", tags=["readiness"])


@router.post("/check", response_model=ReadinessCheckResponse)
async def submit_readiness_check(
    request: ReadinessCheckRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit pre-workout readiness check for autoregulation.

    This endpoint:
    1. Receives readiness metrics (sleep, stress, soreness)
    2. Calculates overall readiness score (weighted average)
    3. Determines if workout adjustment is needed
    4. Provides specific recommendation
    5. Saves check to database for tracking

    Scoring Formula:
    - Overall Readiness = (sleep * 0.4) + (stress * 0.3) + (soreness * 0.3)
    - All inputs on 1-5 scale, normalized to 0-1

    Adjustment Thresholds:
    - < 0.5: Reduce volume (30-40%) or recovery session
    - 0.5-0.7: Reduce intensity (RPE -1) or cut 1-2 sets
    - >= 0.7: Proceed as planned

    Args:
        request: Readiness metrics
        db: Database session

    Returns:
        ReadinessCheckResponse with score, recommendation, and adjustment type

    Raises:
        HTTPException: If validation fails or database error occurs
    """
    try:
        logger.info(
            f"Received readiness check for user {request.userId}, "
            f"week {request.weekNumber}, day {request.dayNumber}"
        )

        # Calculate overall readiness (weighted average, normalized to 0-1)
        score = (
            (request.sleepQuality / 5.0) * 0.4 +
            ((6 - request.stressLevel) / 5.0) * 0.3 +
            (request.soreness_fatigue / 5.0) * 0.3
        )

        # Determine adjustment recommendation
        should_adjust = False
        adjustment_type = None
        recommendation = ""

        if score < 0.5:
            should_adjust = True
            adjustment_type = "reduce_volume"
            recommendation = (
                "Your readiness is low. Consider reducing volume by 30-40% "
                "(remove 1-2 sets per exercise) or switch to a light recovery session "
                "with mobility work and technique practice."
            )
        elif score < 0.7:
            should_adjust = True
            adjustment_type = "reduce_intensity"
            recommendation = (
                "Your readiness is moderate. Consider reducing intensity by backing off "
                "RPE by 1 point (e.g., RPE 8 → RPE 7) or cutting 1-2 sets from each exercise. "
                "Focus on quality over quantity today."
            )
        else:
            should_adjust = False
            adjustment_type = None
            recommendation = (
                f"Your readiness is good (score: {score:.2f}). "
                "Proceed with your planned workout. You're ready to train hard!"
            )

        # Save to database
        check_id = str(uuid4())
        if db is not None:
            try:
                check = ReadinessCheck(
                    id=check_id,
                    user_id=request.userId,
                    program_id=request.programId,
                    week_number=request.weekNumber,
                    day_number=request.dayNumber,
                    sleep_quality=request.sleepQuality,
                    stress_level=request.stressLevel,
                    soreness_fatigue=request.soreness_fatigue,
                    overall_readiness=score,
                    adjustment_recommendation=recommendation,
                )
                db.add(check)
                await db.commit()
                logger.info(f"Readiness check saved: {check_id}")
            except Exception as e:
                await db.rollback()
                logger.warning(f"Failed to save readiness check: {e}")
        else:
            logger.warning("Database not configured - check not persisted")

        logger.info(
            f"Readiness check complete: score={score:.2f}, "
            f"adjust={should_adjust}, type={adjustment_type}"
        )

        return ReadinessCheckResponse(
            checkId=check_id,
            overallReadiness=round(score, 2),
            recommendation=recommendation,
            shouldAdjustWorkout=should_adjust,
            adjustmentType=adjustment_type,
            timestamp=datetime.utcnow().isoformat(),
        )

    except Exception as e:
        logger.error(f"Readiness check failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to process readiness check",
                "code": "READINESS_ERROR",
                "details": {"message": str(e)},
            }
        )


@router.get("/history/{user_id}")
async def get_readiness_history(
    user_id: str,
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
):
    """
    Get readiness check history for a user.

    Useful for tracking patterns:
    - Sleep quality trends
    - Stress patterns
    - Recovery needs
    - Optimal training times

    Args:
        user_id: User ID to fetch history for
        limit: Maximum number of checks to return (default 30)
        db: Database session

    Returns:
        List of readiness checks ordered by most recent
    """
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database not configured"
        )

    try:
        from sqlalchemy import select

        result = await db.execute(
            select(ReadinessCheck)
            .where(ReadinessCheck.user_id == user_id)
            .order_by(ReadinessCheck.created_at.desc())
            .limit(limit)
        )
        checks = result.scalars().all()

        return [
            {
                "id": c.id,
                "program_id": c.program_id,
                "week_number": c.week_number,
                "day_number": c.day_number,
                "sleep_quality": c.sleep_quality,
                "stress_level": c.stress_level,
                "soreness_fatigue": c.soreness_fatigue,
                "overall_readiness": round(c.overall_readiness, 2),
                "adjustment_recommendation": c.adjustment_recommendation,
                "created_at": c.created_at.isoformat(),
            }
            for c in checks
        ]
    except Exception as e:
        logger.error(f"Failed to fetch readiness history: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch readiness history"
        )


@router.get("/stats/{user_id}")
async def get_readiness_stats(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get readiness statistics for a user.

    Provides insights:
    - Average readiness score
    - Most common adjustment needs
    - Sleep quality trends
    - Stress patterns

    Args:
        user_id: User ID to calculate stats for
        db: Database session

    Returns:
        Readiness statistics and insights
    """
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database not configured"
        )

    try:
        from sqlalchemy import select, func

        # Get all checks for user
        result = await db.execute(
            select(ReadinessCheck)
            .where(ReadinessCheck.user_id == user_id)
        )
        checks = result.scalars().all()

        if not checks:
            return {
                "total_checks": 0,
                "message": "No readiness checks found for this user"
            }

        # Calculate statistics
        total = len(checks)
        avg_readiness = sum(c.overall_readiness for c in checks) / total
        avg_sleep = sum(c.sleep_quality for c in checks) / total
        avg_stress = sum(c.stress_level for c in checks) / total
        avg_soreness = sum(c.soreness_fatigue for c in checks) / total

        # Count adjustments needed
        adjustments_needed = sum(1 for c in checks if c.overall_readiness < 0.7)

        return {
            "total_checks": total,
            "average_readiness": round(avg_readiness, 2),
            "average_sleep_quality": round(avg_sleep, 1),
            "average_stress_level": round(avg_stress, 1),
            "average_soreness": round(avg_soreness, 1),
            "adjustments_needed_count": adjustments_needed,
            "adjustment_rate": round(adjustments_needed / total, 2),
            "insights": {
                "sleep": "good" if avg_sleep >= 4 else "needs_improvement",
                "stress": "managed" if avg_stress <= 2 else "high",
                "recovery": "adequate" if avg_soreness >= 4 else "insufficient",
            }
        }
    except Exception as e:
        logger.error(f"Failed to calculate readiness stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to calculate readiness stats"
        )
