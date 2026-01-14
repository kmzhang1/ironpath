"""
Program generation and retrieval endpoints
"""
import logging
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..core.database import get_db
from ..core.config import settings
from ..models.schemas import (
    LifterProfileSchema,
    ProgramGenerationRequest,
    ProgramResponse,
    ErrorResponse,
)
from ..models.tables import Program, User
from ..services.agent import AIAgent, ProgramGenerationError, create_mock_program

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/programs", tags=["programs"])


@router.post("/generate", response_model=ProgramResponse)
async def generate_program(
    profile: LifterProfileSchema,
    request: ProgramGenerationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a new powerlifting program using AI.

    This endpoint:
    1. Receives athlete stats and program parameters
    2. Calls Gemini AI to generate a structured program
    3. Saves the program to the database
    4. Returns the complete program JSON

    Args:
        profile: Lifter profile with stats and biometrics
        request: Program generation parameters (goal, weeks, days, etc.)
        db: Database session (injected)

    Returns:
        ProgramResponse containing the generated program

    Raises:
        HTTPException: If generation fails or validation errors occur
    """
    try:
        logger.info(f"Received program generation request for user {profile.id}")

        # Check if we have a valid API key
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "":
            logger.warning("No Gemini API key configured, using mock program")
            program = create_mock_program(profile, request)
        else:
            # Initialize AI agent
            agent = AIAgent(
                api_key=settings.GEMINI_API_KEY,
                model_name=settings.GEMINI_MODEL,
            )

            # Generate program
            program = await agent.generate_lifting_program(profile, request)

        # Save to database (if user exists)
        # For now, we'll skip database save since we don't have auth yet
        # This will be added in Phase 2

        logger.info(f"Successfully generated program: {program.id}")

        return ProgramResponse(
            program=program,
            message="Program generated successfully",
        )

    except ProgramGenerationError as e:
        logger.error(f"Program generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to generate program",
                "code": "GENERATION_FAILED",
                "details": {"message": str(e)},
            },
        )

    except Exception as e:
        logger.error(f"Unexpected error during program generation: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "code": "INTERNAL_ERROR",
                "details": {"message": str(e)},
            },
        )


@router.get("/", response_model=list)
async def list_programs(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    List all programs for a user.
    TODO: Implement in Phase 3

    Args:
        user_id: User ID to fetch programs for
        db: Database session

    Returns:
        List of program metadata
    """
    # Placeholder for Phase 3
    return []


@router.get("/{program_id}", response_model=dict)
async def get_program(
    program_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific program by ID.
    TODO: Implement in Phase 3

    Args:
        program_id: Program ID to fetch
        db: Database session

    Returns:
        Complete program data
    """
    # Placeholder for Phase 3
    raise HTTPException(status_code=404, detail="Program not found")
