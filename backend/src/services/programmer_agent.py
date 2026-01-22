"""
Programmer Agent for Methodology-Aware Program Generation
Generates training programs based on selected methodology and athlete profile
"""

import json
import logging
from typing import Any, Dict, List
from datetime import datetime
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import ValidationError

from .base_agent import BaseAgent
from ..models.tables import TrainingMethodology, Exercise
from ..models.schemas import (
    FullProgramSchema,
    ExtendedLifterProfileSchema,
    ProgramGenerationRequest,
)

logger = logging.getLogger(__name__)


class ProgrammerAgent(BaseAgent):
    """
    Programmer Agent generates methodology-aware training programs.
    Uses higher temperature (0.8) for creative exercise selection.
    """

    def __init__(
        self,
        api_key: str,
        db_session: AsyncSession,
        model_name: str = "gemini-2.5-flash-lite",
        temperature: float = 0.8,
        max_retries: int = 3,
    ):
        super().__init__(
            api_key=api_key,
            db_session=db_session,
            model_name=model_name,
            temperature=temperature,
            max_retries=max_retries,
        )

    def get_system_prompt(self, context: Dict[str, Any]) -> str:
        """
        Build dynamic system prompt with methodology and athlete profile.

        Args:
            context: Must contain methodology, profile, available_exercises

        Returns:
            Complete system prompt with injected data
        """
        methodology = context["methodology"]
        profile = context["profile"]
        exercises = context["available_exercises"]

        prompt = methodology.system_prompt_template

        prompt += f"""

## ATHLETE PROFILE
- Training Age: {profile.trainingAge}
- Weak Points: {", ".join(profile.weakPoints) if profile.weakPoints else "None specified"}
- Equipment Access: {profile.equipmentAccess}
- Preferred Session Length: {profile.preferredSessionLength} minutes
- 1RMs: Squat {profile.oneRepMax.squat}{profile.biometrics.unit}, Bench {profile.oneRepMax.bench}{profile.biometrics.unit}, Deadlift {profile.oneRepMax.deadlift}{profile.biometrics.unit}
"""

        prompt += "\n## AVAILABLE EXERCISES\n"
        for ex in exercises:
            prompt += f"- {ex.name} ({ex.category}) - Targets: {', '.join(ex.targets_weak_points)}\n"

        prompt += f"\n## PROGRAMMING RULES\n{json.dumps(methodology.programming_rules, indent=2)}\n"

        return prompt

    async def process(
        self, user_input: Dict[str, Any], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate methodology-aware training program.

        Args:
            user_input: Empty dict (not used for generation)
            context: Must contain profile (ExtendedLifterProfileSchema), request (ProgramGenerationRequest)

        Returns:
            Dictionary with program and metadata
        """
        profile = context["profile"]
        request = context["request"]

        logger.info(
            f"Generating program for user {profile.id}: "
            f"{request.goal}, {request.weeks} weeks, {request.daysPerWeek} days/week"
        )

        methodology = await self._load_methodology(profile.methodologyId)

        exercises = await self._get_exercises_for_profile(profile, methodology)

        system_prompt = self.get_system_prompt(
            {
                "methodology": methodology,
                "profile": profile,
                "available_exercises": exercises,
            }
        )

        user_prompt = self._build_user_prompt(profile, request)

        response_schema = self._create_program_schema()
        response_text = await self._call_gemini(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_schema=response_schema,
            response_mime_type="application/json",
        )

        program_data = json.loads(response_text)

        try:
            program = FullProgramSchema(**program_data)
        except ValidationError as e:
            logger.error(f"Program validation failed: {e}")
            raise

        logger.info(
            f"Successfully generated program: {program.title} "
            f"({len(program.weeks)} weeks, {program.id})"
        )

        return {
            "program": program,
            "methodology_used": methodology.name,
        }

    async def _load_methodology(self, methodology_id: str) -> TrainingMethodology:
        """
        Load methodology from database with caching.

        Args:
            methodology_id: Methodology ID to load

        Returns:
            TrainingMethodology instance
        """
        cache_key = f"methodology_{methodology_id}"
        if cached := self.cache_get(cache_key):
            logger.debug(f"Methodology {methodology_id} loaded from cache")
            return cached

        result = await self.db_session.execute(
            select(TrainingMethodology).where(
                TrainingMethodology.id == methodology_id
            )
        )
        methodology = result.scalar_one()

        self.cache_set(cache_key, methodology)
        logger.debug(f"Methodology {methodology_id} loaded from database")

        return methodology

    async def _get_exercises_for_profile(
        self, profile: ExtendedLifterProfileSchema, methodology: TrainingMethodology
    ) -> List[Exercise]:
        """
        Get exercises filtered by profile equipment and complexity.

        Args:
            profile: Extended lifter profile
            methodology: Training methodology

        Returns:
            List of Exercise objects
        """
        cache_key = f"exercises_{profile.equipmentAccess}_{profile.trainingAge}"
        if cached := self.cache_get(cache_key):
            logger.debug("Exercises loaded from cache")
            return cached

        available_equipment = self._get_available_equipment(profile.equipmentAccess)

        query = select(Exercise)

        complexity_mapping = {
            "novice": ["beginner"],
            "intermediate": ["beginner", "intermediate"],
            "advanced": ["beginner", "intermediate", "advanced"],
        }
        allowed_complexity = complexity_mapping[profile.trainingAge]
        query = query.where(Exercise.complexity.in_(allowed_complexity))

        result = await self.db_session.execute(query)
        all_exercises = result.scalars().all()

        filtered_exercises = [
            ex
            for ex in all_exercises
            if set(ex.equipment).issubset(set(available_equipment))
        ]

        self.cache_set(cache_key, filtered_exercises)
        logger.debug(
            f"Loaded {len(filtered_exercises)} exercises for {profile.equipmentAccess} / {profile.trainingAge}"
        )

        return filtered_exercises

    def _get_available_equipment(self, equipment_access: str) -> List[str]:
        """
        Map equipment access level to available equipment list.

        Args:
            equipment_access: garage, commercial, or hardcore

        Returns:
            List of available equipment strings
        """
        equipment_map = {
            "garage": ["barbell", "rack", "bench"],
            "commercial": [
                "barbell",
                "rack",
                "bench",
                "dumbbells",
                "cable",
                "machines",
            ],
            "hardcore": [
                "barbell",
                "rack",
                "bench",
                "dumbbells",
                "cable",
                "machines",
                "bands",
                "chains",
                "specialty_bars",
            ],
        }
        return equipment_map.get(equipment_access, equipment_map["commercial"])

    def _build_user_prompt(
        self,
        profile: ExtendedLifterProfileSchema,
        request: ProgramGenerationRequest,
    ) -> str:
        """
        Build user prompt for program generation.

        Args:
            profile: Extended lifter profile
            request: Program generation request

        Returns:
            User prompt string
        """
        prompt = f"""Generate a {request.weeks}-week powerlifting program with the following parameters:

**Goal:** {request.goal}
**Training Days Per Week:** {request.daysPerWeek}
**Athlete Level:** {profile.trainingAge}
"""

        if request.limitations:
            prompt += f"\n**Limitations/Injuries:** {', '.join(request.limitations)}"

        if request.focusAreas:
            prompt += f"\n**Focus Areas:** {', '.join(request.focusAreas)}"

        if profile.weakPoints:
            prompt += f"\n**Weak Points to Address:** {', '.join(profile.weakPoints)}"

        if profile.competitionDate:
            prompt += f"\n**Competition Date:** {profile.competitionDate}"

        prompt += f"""

Generate a complete {request.weeks}-week program following the methodology's programming rules.
Use only exercises from the AVAILABLE EXERCISES list above.
Return valid JSON matching the required schema.
"""

        return prompt

    def _create_program_schema(self) -> dict:
        """
        Create JSON schema for program generation.

        Returns:
            JSON schema dict
        """
        return {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Unique program ID"},
                "createdAt": {"type": "string", "description": "ISO 8601 timestamp"},
                "title": {"type": "string", "description": "Program title"},
                "weeks": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "weekNumber": {"type": "integer"},
                            "sessions": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "dayNumber": {"type": "integer"},
                                        "focus": {"type": "string"},
                                        "exercises": {
                                            "type": "array",
                                            "items": {
                                                "type": "object",
                                                "properties": {
                                                    "name": {"type": "string"},
                                                    "sets": {"type": "integer"},
                                                    "reps": {"type": "string"},
                                                    "rpeTarget": {"type": "number"},
                                                    "restSeconds": {"type": "integer"},
                                                    "notes": {"type": "string"},
                                                },
                                                "required": [
                                                    "name",
                                                    "sets",
                                                    "reps",
                                                    "rpeTarget",
                                                    "restSeconds",
                                                ],
                                            },
                                        },
                                    },
                                    "required": ["dayNumber", "focus", "exercises"],
                                },
                            },
                        },
                        "required": ["weekNumber", "sessions"],
                    },
                },
            },
            "required": ["id", "createdAt", "title", "weeks"],
        }
