"""
Training methodology management endpoints
"""
import logging

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..core.database import get_db
from ..models.schemas import MethodologyListItem, MethodologyDetailResponse
from ..models.tables import TrainingMethodology

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/methodologies", tags=["methodologies"])


@router.get("/list", response_model=list[MethodologyListItem])
async def list_methodologies(
    db: AsyncSession = Depends(get_db),
):
    """
    List all available training methodologies.

    Returns basic information for each methodology:
    - ID for selection
    - Name (e.g., "Westside Conjugate")
    - Description (brief overview)
    - Category (e.g., "advanced", "intermediate")

    Used by:
    - Wizard methodology selection step
    - Program generation configuration
    - User profile updates

    Args:
        db: Database session

    Returns:
        List of methodology items with ID, name, description, category
    """
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database not configured"
        )

    try:
        result = await db.execute(
            select(TrainingMethodology).order_by(TrainingMethodology.name)
        )
        methodologies = result.scalars().all()

        return [
            MethodologyListItem(
                id=m.id,
                name=m.name,
                description=m.description,
                category=m.category,
            )
            for m in methodologies
        ]
    except Exception as e:
        logger.error(f"Failed to list methodologies: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch methodologies"
        )


@router.get("/{methodology_id}", response_model=MethodologyDetailResponse)
async def get_methodology(
    methodology_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed information about a specific methodology.

    Returns complete methodology data:
    - Programming rules (sets/reps/intensity schemes)
    - Knowledge base (coaching tips, principles, quotes)
    - System prompt template (for AI agents)

    Used by:
    - Programmer Agent (builds dynamic prompts)
    - Analyst Agent (methodology-specific advice)
    - Frontend methodology details page

    Args:
        methodology_id: Methodology ID to fetch
        db: Database session

    Returns:
        Complete methodology details with rules and knowledge base
    """
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database not configured"
        )

    try:
        result = await db.execute(
            select(TrainingMethodology)
            .where(TrainingMethodology.id == methodology_id)
        )
        methodology = result.scalar_one_or_none()

        if not methodology:
            raise HTTPException(
                status_code=404,
                detail=f"Methodology not found: {methodology_id}"
            )

        return MethodologyDetailResponse(
            id=methodology.id,
            name=methodology.name,
            description=methodology.description,
            category=methodology.category,
            programmingRules=methodology.programming_rules,
            knowledgeBase=methodology.knowledge_base,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch methodology: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch methodology details"
        )


@router.get("/category/{category}")
async def list_methodologies_by_category(
    category: str,
    db: AsyncSession = Depends(get_db),
):
    """
    List methodologies filtered by category.

    Categories:
    - "novice" / "beginner": Linear progression, simple programs
    - "intermediate": DUP, Block periodization
    - "advanced": Westside, Sheiko, complex systems

    Used for:
    - Showing recommended methodologies based on training age
    - Filtering methodology selection in wizard

    Args:
        category: Category to filter by
        db: Database session

    Returns:
        List of methodologies in the specified category
    """
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database not configured"
        )

    try:
        result = await db.execute(
            select(TrainingMethodology)
            .where(TrainingMethodology.category == category)
            .order_by(TrainingMethodology.name)
        )
        methodologies = result.scalars().all()

        return [
            {
                "id": m.id,
                "name": m.name,
                "description": m.description,
                "category": m.category,
            }
            for m in methodologies
        ]
    except Exception as e:
        logger.error(f"Failed to list methodologies by category: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch methodologies by category"
        )
