"""
AI Agent Service for Program Generation
Uses Google Gemini with structured output to generate powerlifting programs
"""

import json
import logging
from datetime import datetime
from typing import Optional
from uuid import uuid4

from google import genai
from google.genai import types

from ..models.schemas import (
    LifterProfileSchema,
    ProgramGenerationRequest,
    FullProgramSchema,
    ProgramMicrocycleSchema,
    LiftingSessionSchema,
    ExerciseSchema,
)
from .agent_prompts import build_system_prompt, USER_PROMPT

logger = logging.getLogger(__name__)


class ProgramGenerationError(Exception):
    """Custom exception for program generation failures"""

    pass


class AIAgent:
    """
    AI Agent for generating powerlifting programs using Google Gemini.
    Implements retry logic and structured output validation.
    """

    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash"):
        """
        Initialize the AI Agent with Gemini API.

        Args:
            api_key: Google Gemini API key
            model_name: Gemini model to use (default: gemini-2.5-flash)
        """
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name
        self.max_retries = 3

    def _create_program_schema(self) -> dict:
        """
        Create JSON schema for Gemini's structured output.
        This ensures the AI returns data matching our Pydantic models.
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
                            "weekNumber": {
                                "type": "integer",
                                "description": "Week number",
                            },
                            "sessions": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "dayNumber": {
                                            "type": "integer",
                                            "description": "Day 1-7",
                                        },
                                        "focus": {
                                            "type": "string",
                                            "description": "Session focus",
                                        },
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

    async def generate_lifting_program(
        self,
        profile: LifterProfileSchema,
        request: ProgramGenerationRequest,
    ) -> FullProgramSchema:
        """
        Generate a complete powerlifting program using Gemini AI.

        Args:
            profile: Lifter's profile with stats and biometrics
            request: Program generation parameters (goal, weeks, days, etc.)

        Returns:
            FullProgramSchema containing the complete generated program

        Raises:
            ProgramGenerationError: If generation fails after max retries
        """
        logger.info(
            f"Generating program for user {profile.id}: "
            f"{request.goal}, {request.weeks} weeks, {request.daysPerWeek} days/week"
        )

        # Build the system prompt with athlete context
        system_prompt = build_system_prompt(
            goal=request.goal,
            weeks=request.weeks,
            days_per_week=request.daysPerWeek,
            squat_1rm=profile.oneRepMax.squat,
            bench_1rm=profile.oneRepMax.bench,
            deadlift_1rm=profile.oneRepMax.deadlift,
            unit=profile.biometrics.unit,
            limitations=request.limitations,
            focus_areas=request.focusAreas,
        )

        user_prompt = USER_PROMPT.format(weeks=request.weeks)

        # Attempt generation with retries
        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(f"Generation attempt {attempt}/{self.max_retries}")

                # Call Gemini with structured output (JSON mode)
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=[
                        types.Content(
                            role="user",
                            parts=[
                                types.Part(text=system_prompt),
                                types.Part(text=user_prompt),
                            ],
                        ),
                    ],
                    config=types.GenerateContentConfig(
                        temperature=0.8,
                        response_mime_type="application/json",
                        response_schema=self._create_program_schema(),
                    ),
                )

                # Extract the generated text
                if not response.text:
                    raise ProgramGenerationError("Empty response from Gemini")

                # Parse JSON response
                program_data = json.loads(response.text)

                # Validate against Pydantic schema
                program = FullProgramSchema(**program_data)

                logger.info(
                    f"Successfully generated program: {program.title} "
                    f"({len(program.weeks)} weeks, {program.id})"
                )

                return program

            except json.JSONDecodeError as e:
                logger.warning(f"Attempt {attempt} - JSON parsing failed: {e}")
                if attempt == self.max_retries:
                    raise ProgramGenerationError(
                        f"Failed to generate valid JSON after {self.max_retries} attempts"
                    ) from e

            except Exception as e:
                logger.warning(f"Attempt {attempt} - Validation failed: {e}")
                if attempt == self.max_retries:
                    raise ProgramGenerationError(
                        f"Failed to generate valid program after {self.max_retries} attempts: {str(e)}"
                    ) from e

        # Should never reach here due to raise in loop
        raise ProgramGenerationError("Unexpected error in program generation")

    def generate_program_title(self, goal: str, weeks: int) -> str:
        """Generate a descriptive title for the program"""
        goal_titles = {
            "peaking": "Competition Peak",
            "hypertrophy": "Hypertrophy Block",
            "strength_block": "Strength Development",
        }
        base_title = goal_titles.get(goal, "Training Program")
        return f"{weeks}-Week {base_title}"


def create_mock_program(
    profile: LifterProfileSchema,
    request: ProgramGenerationRequest,
) -> FullProgramSchema:
    """
    Create a mock program for testing when API is unavailable.
    Only use this for development/testing!
    """
    program_id = str(uuid4())
    created_at = datetime.utcnow().isoformat() + "Z"

    # Simple mock: 2 weeks, 2 sessions per week
    weeks = []
    for week_num in range(1, min(request.weeks, 2) + 1):
        sessions = []
        for day_num in range(1, min(request.daysPerWeek, 2) + 1):
            exercises = [
                ExerciseSchema(
                    name="Competition Squat" if day_num == 1 else "Bench Press",
                    sets=4,
                    reps="5",
                    rpeTarget=8.0,
                    restSeconds=240,
                    notes="Focus on technique",
                )
            ]
            sessions.append(
                LiftingSessionSchema(
                    dayNumber=day_num,
                    focus=f"{'Squat' if day_num == 1 else 'Bench'} Volume",
                    exercises=exercises,
                )
            )
        weeks.append(ProgramMicrocycleSchema(weekNumber=week_num, sessions=sessions))

    return FullProgramSchema(
        id=program_id,
        createdAt=created_at,
        title=f"{request.weeks}-Week {request.goal.title()} Program (MOCK)",
        weeks=weeks,
    )
