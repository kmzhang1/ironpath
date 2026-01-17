"""
User profile management endpoints
"""
import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel

from ..core.database import get_db
from ..models.tables import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


class UserProfileRequest(BaseModel):
    """Request to create or sync a user profile"""
    id: str
    email: str
    name: str
    picture: str | None = None


class UserProfileResponse(BaseModel):
    """Response with user profile data"""
    id: str
    email: str
    name: str
    picture: str | None
    created_at: str
    updated_at: str


@router.post("/sync", response_model=UserProfileResponse)
async def sync_user_profile(
    profile: UserProfileRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Sync or create a user profile from Supabase authentication.

    This endpoint should be called after a user authenticates with Supabase
    to ensure their profile exists in the local database.

    Args:
        profile: User profile data from Supabase
        db: Database session

    Returns:
        UserProfileResponse with the created or updated profile
    """
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database not configured"
        )

    try:
        # Check if user already exists
        result = await db.execute(
            select(User).where(User.id == profile.id)
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            # Update existing user
            existing_user.email = profile.email
            existing_user.name = profile.name
            existing_user.picture = profile.picture
            existing_user.updated_at = datetime.utcnow()

            await db.flush()
            logger.info(f"Updated user profile: {profile.id}")

            return UserProfileResponse(
                id=existing_user.id,
                email=existing_user.email,
                name=existing_user.name,
                picture=existing_user.picture,
                created_at=existing_user.created_at.isoformat(),
                updated_at=existing_user.updated_at.isoformat(),
            )
        else:
            # Create new user
            new_user = User(
                id=profile.id,
                email=profile.email,
                name=profile.name,
                picture=profile.picture,
            )

            db.add(new_user)

            try:
                await db.flush()
                logger.info(f"Created new user profile: {profile.id}")

                return UserProfileResponse(
                    id=new_user.id,
                    email=new_user.email,
                    name=new_user.name,
                    picture=new_user.picture,
                    created_at=new_user.created_at.isoformat(),
                    updated_at=new_user.updated_at.isoformat(),
                )
            except IntegrityError as ie:
                # Handle race condition - another request created the user
                await db.rollback()
                logger.warning(f"Race condition detected for user {profile.id}, retrying...")

                # Fetch the user that was created by the other request
                result = await db.execute(
                    select(User).where(User.id == profile.id)
                )
                existing_user = result.scalar_one_or_none()

                if existing_user:
                    # Update the user that was just created
                    existing_user.email = profile.email
                    existing_user.name = profile.name
                    existing_user.picture = profile.picture
                    existing_user.updated_at = datetime.utcnow()

                    await db.flush()
                    logger.info(f"Updated user profile after race condition: {profile.id}")

                    return UserProfileResponse(
                        id=existing_user.id,
                        email=existing_user.email,
                        name=existing_user.name,
                        picture=existing_user.picture,
                        created_at=existing_user.created_at.isoformat(),
                        updated_at=existing_user.updated_at.isoformat(),
                    )
                else:
                    # This should never happen, but handle it anyway
                    raise ie

    except IntegrityError:
        # Already handled above
        raise
    except Exception as e:
        logger.error(f"Failed to sync user profile: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync user profile: {str(e)}"
        )


@router.get("/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a user profile by ID.

    Args:
        user_id: User ID to fetch
        db: Database session

    Returns:
        UserProfileResponse with the user profile
    """
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database not configured"
        )

    try:
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User profile not found"
            )

        return UserProfileResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            picture=user.picture,
            created_at=user.created_at.isoformat(),
            updated_at=user.updated_at.isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch user profile: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch user profile"
        )
