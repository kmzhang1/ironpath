"""
Analyst/Mentor Agent for Read-Only Coaching
Provides technique advice, injury guidance, weak point strategies, and motivation
"""

import json
import logging
from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .base_agent import BaseAgent
from ..models.tables import TrainingMethodology
from ..models.schemas import ExtendedLifterProfileSchema

logger = logging.getLogger(__name__)


class AnalystMentorAgent(BaseAgent):
    """
    Analyst/Mentor Agent provides read-only coaching with knowledge retrieval.
    Uses balanced temperature (0.7) for helpful but consistent advice.
    """

    def __init__(
        self,
        api_key: str,
        db_session: AsyncSession,
        model_name: str = "gemini-2.5-flash-lite",
        temperature: float = 0.7,
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
        Build system prompt with methodology knowledge.

        Args:
            context: Must contain methodology_knowledge (optional)

        Returns:
            System prompt for analyst/mentor agent
        """
        kb = context.get("methodology_knowledge", {})
        methodology_name = kb.get("methodology_name", "Unknown")
        knowledge_base = kb.get("knowledge_base", {})

        prompt = f"""You are an expert powerlifting coach and mentor for IronPath AI.

Your role is to provide:
1. Technique advice (form, cues, movement patterns)
2. Injury prevention guidance
3. Weak point analysis and strategies
4. Exercise substitutions and alternatives
5. Motivation and mental coaching support

**CRITICAL: You are READ-ONLY. You CANNOT modify training programs.**
If the user wants to change their program, direct them to use the feedback system or program regeneration.

**ATHLETE'S METHODOLOGY:** {methodology_name}
"""

        if knowledge_base:
            prompt += f"\n**METHODOLOGY KNOWLEDGE BASE:**\n{json.dumps(knowledge_base, indent=2)}\n"

        prompt += """
**Guidelines:**
- Provide specific, actionable advice
- Reference powerlifting science and best practices
- Be encouraging but realistic
- If you don't know something, say so
- Always prioritize safety and injury prevention
- Tailor advice to the athlete's methodology when relevant

Respond in a conversational, supportive tone as if you're a knowledgeable coach.
"""

        return prompt

    async def process(
        self, user_input: Dict[str, Any], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process user question and provide coaching advice.

        Args:
            user_input: Must contain "message" key
            context: Must contain profile (ExtendedLifterProfileSchema)

        Returns:
            Dictionary with response message
        """
        user_message = user_input.get("message", "")
        profile = context.get("profile")

        if not user_message:
            raise ValueError("user_input must contain 'message' key")

        logger.info(
            f"Processing analyst query for user {profile.id if profile else 'unknown'}: {user_message[:50]}..."
        )

        methodology_knowledge = {}
        if profile and profile.methodologyId:
            methodology_knowledge = await self._load_methodology_knowledge(
                profile.methodologyId
            )

        system_prompt = self.get_system_prompt(
            {"methodology_knowledge": methodology_knowledge}
        )

        user_prompt = f"User question: {user_message}"

        if profile:
            user_prompt += f"""

Athlete context:
- Training age: {profile.trainingAge}
- Weak points: {", ".join(profile.weakPoints) if profile.weakPoints else "None specified"}
- 1RMs: Squat {profile.oneRepMax.squat}{profile.biometrics.unit}, Bench {profile.oneRepMax.bench}{profile.biometrics.unit}, Deadlift {profile.oneRepMax.deadlift}{profile.biometrics.unit}
"""

        response_text = await self._call_gemini(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_mime_type="text/plain",
        )

        logger.info(f"Analyst response generated ({len(response_text)} chars)")

        return {"response": response_text, "agent_type": "analyst_mentor"}

    async def _load_methodology_knowledge(
        self, methodology_id: str
    ) -> Dict[str, Any]:
        """
        Load methodology knowledge base from database.

        Args:
            methodology_id: Methodology ID to load

        Returns:
            Dictionary with methodology name and knowledge base
        """
        cache_key = f"methodology_kb_{methodology_id}"
        if cached := self.cache_get(cache_key):
            logger.debug(f"Methodology knowledge {methodology_id} loaded from cache")
            return cached

        result = await self.db_session.execute(
            select(TrainingMethodology).where(
                TrainingMethodology.id == methodology_id
            )
        )
        methodology = result.scalar_one_or_none()

        if not methodology:
            logger.warning(f"Methodology {methodology_id} not found")
            return {}

        knowledge = {
            "methodology_name": methodology.name,
            "knowledge_base": methodology.knowledge_base,
        }

        self.cache_set(cache_key, knowledge)
        logger.debug(f"Methodology knowledge {methodology_id} loaded from database")

        return knowledge
