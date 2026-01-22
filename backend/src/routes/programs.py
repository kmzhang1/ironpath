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
    ExtendedLifterProfileSchema,
    ProgramGenerationRequest,
    ProgramResponse,
    ErrorResponse,
)
from ..models.tables import Program, User
from ..services.programmer_agent import ProgrammerAgent
from ..services.agent import AIAgent, ProgramGenerationError, create_mock_program

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/programs", tags=["programs"])


@router.post("/generate", response_model=ProgramResponse, deprecated=True)
async def generate_program(
    profile: LifterProfileSchema,
    request: ProgramGenerationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    [DEPRECATED] Generate a new powerlifting program using AI (v1 - Legacy).

    **DEPRECATED:** This is the legacy v1 endpoint. Please use `/generate-v2` instead.

    The v2 endpoint provides:
    - Methodology-aware programming (Westside, Sheiko, DUP, etc.)
    - Intelligent exercise selection based on equipment and training age
    - Weak point targeting
    - Enhanced program quality

    This v1 endpoint is maintained for backward compatibility only and may be
    removed in future versions.

    Args:
        profile: Lifter profile with stats and biometrics
        request: Program generation parameters (goal, weeks, days, etc.)
        db: Database session (injected)

    Returns:
        ProgramResponse containing the generated program

    Raises:
        HTTPException: If generation fails or validation errors occur
    """
    logger.warning(
        f"[DEPRECATED] v1 generation endpoint used by user {profile.id}. "
        "Please migrate to /generate-v2"
    )
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

        # Generate consistent UUID for the program
        # We override the AI-generated ID to ensure consistency and avoid
        # unpredictable formats like "prg_001_str_blk_4wk" or "strength-block-program-001"
        program_id = str(uuid4())
        program.id = program_id

        # Save program to database
        if db is not None:
            try:
                # Convert Pydantic model to dict for JSON storage
                program_dict = program.model_dump()

                # Create database record
                db_program = Program(
                    id=program_id,
                    user_id=profile.id,
                    title=program.title,
                    program_json=program_dict,
                )

                db.add(db_program)
                await db.flush()  # Flush to catch foreign key errors before commit
                logger.info(f"Program saved to database: {program.id}")
            except Exception as e:
                await db.rollback()
                logger.warning(f"Failed to save program to database: {e}")
                # Continue anyway - program generation succeeded
        else:
            logger.warning("Database not configured - program not persisted")

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


@router.post("/generate-v2", response_model=ProgramResponse)
async def generate_program_v2(
    profile: ExtendedLifterProfileSchema,
    request: ProgramGenerationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a new powerlifting program using multi-agent system (v2).

    This endpoint uses the enhanced Programmer Agent with:
    - Methodology-aware program generation
    - Exercise library filtering by equipment/complexity
    - Weak point targeting
    - Dynamic prompt building with methodology rules

    This is the v2 implementation that replaces the legacy v1 endpoint.
    It provides:
    1. Methodology-specific programming (Westside, Sheiko, DUP, etc.)
    2. Intelligent exercise selection based on profile
    3. Weak point addressing
    4. Equipment-aware exercise filtering

    Args:
        profile: Extended lifter profile with methodology and training age
        request: Program generation parameters (goal, weeks, days, etc.)
        db: Database session (injected)

    Returns:
        ProgramResponse containing the generated program

    Raises:
        HTTPException: If generation fails or validation errors occur
    """
    try:
        logger.info(
            f"[V2] Received program generation request for user {profile.id} "
            f"with methodology {profile.methodologyId}"
        )

        if not settings.GEMINI_API_KEY:
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "AI service not configured",
                    "code": "SERVICE_UNAVAILABLE",
                }
            )

        if not profile.methodologyId:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Methodology ID required for v2 generation",
                    "code": "MISSING_METHODOLOGY",
                    "details": {
                        "message": "Please select a training methodology in your profile"
                    },
                }
            )

        programmer = ProgrammerAgent(
            api_key=settings.GEMINI_API_KEY,
            db_session=db,
            model_name=settings.GEMINI_MODEL,
        )

        result = await programmer.process(
            user_input={},
            context={"profile": profile, "request": request}
        )

        program = result["program"]
        program_id = str(uuid4())
        program.id = program_id

        if db is not None:
            try:
                program_dict = program.model_dump()

                db_program = Program(
                    id=program_id,
                    user_id=profile.id,
                    title=program.title,
                    program_json=program_dict,
                    methodology_id=profile.methodologyId,
                    generation_metadata={
                        "agent_version": "2.0",
                        "methodology_used": result["methodology_used"],
                        "training_age": profile.trainingAge,
                        "equipment_access": profile.equipmentAccess,
                        "weak_points": profile.weakPoints,
                    }
                )

                db.add(db_program)
                await db.commit()
                logger.info(f"[V2] Program saved to database: {program.id}")
            except Exception as e:
                await db.rollback()
                logger.warning(f"[V2] Failed to save program to database: {e}")
        else:
            logger.warning("[V2] Database not configured - program not persisted")

        logger.info(
            f"[V2] Successfully generated program: {program.id} "
            f"using {result['methodology_used']}"
        )

        return ProgramResponse(
            program=program,
            message=f"Program generated successfully using {result['methodology_used']}",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[V2] Program generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to generate program",
                "code": "GENERATION_FAILED",
                "details": {"message": str(e)},
            }
        )


@router.get("/user/{user_id}")
async def list_programs(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    List all programs for a user.

    Args:
        user_id: User ID to fetch programs for
        db: Database session

    Returns:
        List of program metadata
    """
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database not configured"
        )

    try:
        result = await db.execute(
            select(Program)
            .where(Program.user_id == user_id)
            .order_by(Program.created_at.desc())
        )
        programs = result.scalars().all()

        return [
            {
                "id": p.id,
                "title": p.title,
                "created_at": p.created_at.isoformat(),
                "updated_at": p.updated_at.isoformat(),
            }
            for p in programs
        ]
    except Exception as e:
        logger.error(f"Failed to fetch programs: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch programs"
        )


@router.get("/{program_id}")
async def get_program(
    program_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific program by ID.

    Args:
        program_id: Program ID to fetch
        db: Database session

    Returns:
        Complete program data with full JSON
    """
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database not configured"
        )

    try:
        result = await db.execute(
            select(Program).where(Program.id == program_id)
        )
        program = result.scalar_one_or_none()

        if not program:
            raise HTTPException(status_code=404, detail="Program not found")

        return {
            "id": program.id,
            "user_id": program.user_id,
            "title": program.title,
            "program": program.program_json,
            "created_at": program.created_at.isoformat(),
            "updated_at": program.updated_at.isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch program: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch program"
        )


@router.put("/{program_id}")
async def update_program(
    program_id: str,
    program_data: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    Update an existing program (for making adjustments based on feedback).

    Args:
        program_id: Program ID to update
        program_data: Updated program JSON
        db: Database session

    Returns:
        Updated program data
    """
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database not configured"
        )

    try:
        result = await db.execute(
            select(Program).where(Program.id == program_id)
        )
        program = result.scalar_one_or_none()

        if not program:
            raise HTTPException(status_code=404, detail="Program not found")

        # Update the program JSON
        program.program_json = program_data
        await db.commit()

        logger.info(f"Program updated: {program_id}")

        return {
            "id": program.id,
            "message": "Program updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update program: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to update program"
        )
