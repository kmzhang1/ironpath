"""
Lifter profile management endpoints
"""
import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from ..core.database import get_db
from ..models.tables import UserProfileData, LifterProfile
from ..models.schemas import ExtendedLifterProfileSchema
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profiles", tags=["profiles"])


class ProfileSaveRequest(BaseModel):
    """Request to save a lifter profile"""
    userId: str
    profile: ExtendedLifterProfileSchema


class ProfileSaveResponse(BaseModel):
    """Response after saving a profile"""
    success: bool
    message: str
    profile: ExtendedLifterProfileSchema


class ProfileGetResponse(BaseModel):
    """Response when retrieving a profile"""
    profile: ExtendedLifterProfileSchema


@router.post("/save", response_model=ProfileSaveResponse)
async def save_lifter_profile(
    request: ProfileSaveRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Save or update a lifter profile.

    This endpoint is used when a user completes the profile setup
    without creating a program yet.

    Args:
        request: Profile save request with userId and profile data
        db: Database session

    Returns:
        ProfileSaveResponse with success status and saved profile
    """
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database not configured"
        )

    try:
        # 1. Save to user_profile_data (JSON blob)
        result = await db.execute(
            select(UserProfileData).where(UserProfileData.user_id == request.userId)
        )
        existing_profile_data = result.scalar_one_or_none()

        profile_dict = request.profile.model_dump()

        if existing_profile_data:
            # Update existing profile
            existing_profile_data.profile_data = profile_dict
            existing_profile_data.updated_at = datetime.utcnow()
            await db.flush()
            logger.info(f"Updated user_profile_data for user: {request.userId}")
        else:
            # Create new profile
            new_profile_data = UserProfileData(
                id=str(uuid.uuid4()),
                user_id=request.userId,
                profile_data=profile_dict,
            )
            db.add(new_profile_data)
            await db.flush()
            logger.info(f"Created new user_profile_data for user: {request.userId}")

        # 2. Save to lifter_profiles (structured table)
        # Check if structured profile already exists
        lifter_result = await db.execute(
            select(LifterProfile).where(LifterProfile.user_id == request.userId)
        )
        existing_lifter_profile = lifter_result.scalar_one_or_none()

        if existing_lifter_profile:
            # Update existing structured profile
            existing_lifter_profile.bodyweight = request.profile.biometrics.bodyweight
            existing_lifter_profile.unit = request.profile.biometrics.unit
            existing_lifter_profile.sex = request.profile.biometrics.sex
            existing_lifter_profile.age = request.profile.biometrics.age
            existing_lifter_profile.squat_1rm = request.profile.oneRepMax.squat
            existing_lifter_profile.bench_1rm = request.profile.oneRepMax.bench
            existing_lifter_profile.deadlift_1rm = request.profile.oneRepMax.deadlift
            existing_lifter_profile.training_age = request.profile.trainingAge
            existing_lifter_profile.weak_points = request.profile.weakPoints
            existing_lifter_profile.equipment_access = request.profile.equipmentAccess
            existing_lifter_profile.preferred_session_length = request.profile.preferredSessionLength
            existing_lifter_profile.competition_date = datetime.fromisoformat(request.profile.competitionDate) if request.profile.competitionDate else None
            existing_lifter_profile.methodology_id = request.profile.methodologyId
            existing_lifter_profile.updated_at = datetime.utcnow()
            existing_lifter_profile.is_active = True
            await db.flush()
            logger.info(f"Updated lifter_profiles for user: {request.userId}")
        else:
            # Create new structured profile
            new_lifter_profile = LifterProfile(
                id=str(uuid.uuid4()),
                user_id=request.userId,
                bodyweight=request.profile.biometrics.bodyweight,
                unit=request.profile.biometrics.unit,
                sex=request.profile.biometrics.sex,
                age=request.profile.biometrics.age,
                squat_1rm=request.profile.oneRepMax.squat,
                bench_1rm=request.profile.oneRepMax.bench,
                deadlift_1rm=request.profile.oneRepMax.deadlift,
                training_age=request.profile.trainingAge,
                weak_points=request.profile.weakPoints,
                equipment_access=request.profile.equipmentAccess,
                preferred_session_length=request.profile.preferredSessionLength,
                competition_date=datetime.fromisoformat(request.profile.competitionDate) if request.profile.competitionDate else None,
                methodology_id=request.profile.methodologyId,
                is_active=True,
            )
            db.add(new_lifter_profile)
            await db.flush()
            logger.info(f"Created new lifter_profiles for user: {request.userId}")

        return ProfileSaveResponse(
            success=True,
            message="Profile saved successfully",
            profile=request.profile,
        )

    except Exception as e:
        logger.error(f"Failed to save lifter profile: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save profile: {str(e)}"
        )


@router.get("/{user_id}", response_model=ProfileGetResponse)
async def get_lifter_profile(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a lifter profile by user ID.

    Args:
        user_id: User ID to fetch profile for
        db: Database session

    Returns:
        ProfileGetResponse with the profile data
    """
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database not configured"
        )

    try:
        result = await db.execute(
            select(UserProfileData).where(UserProfileData.user_id == user_id)
        )
        profile_record = result.scalar_one_or_none()

        if not profile_record:
            raise HTTPException(
                status_code=404,
                detail="Profile not found"
            )

        # Convert the stored JSON back to the schema
        profile = ExtendedLifterProfileSchema(**profile_record.profile_data)

        return ProfileGetResponse(profile=profile)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch lifter profile: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch profile"
        )
