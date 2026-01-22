"""
Router Agent for Intent Classification
Classifies user messages and routes to appropriate specialized agents
"""

import json
import logging
from typing import Any, Dict

from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import ValidationError

from .base_agent import BaseAgent
from ..models.schemas import IntentClassification

logger = logging.getLogger(__name__)


class RouterAgent(BaseAgent):
    """
    Router Agent classifies user intent and routes to specialized agents.
    Uses low temperature (0.3) for consistent classification.
    """

    def __init__(
        self,
        api_key: str,
        db_session: AsyncSession,
        model_name: str = "gemini-2.5-flash-lite",
        temperature: float = 0.3,
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
        Build system prompt for intent classification.

        Args:
            context: Must contain has_program (bool), methodology (str or None)

        Returns:
            System prompt for router agent
        """
        has_program = context.get("has_program", False)
        methodology = context.get("methodology", "None")

        return f"""You are a Router Agent for IronPath AI, a powerlifting coaching system.

Classify user messages into intents to route to the correct specialized agent.

**Available Agents:**
1. Programmer Agent: Generate/modify workout programs
2. Analyst/Mentor Agent: Coaching advice, technique tips, motivation
3. Feedback Agent: Workout feedback and autoregulation

**Context:**
- User has existing program: {has_program}
- Current methodology: {methodology}

**Intent Types:**
- program_generation: User wants to create a new training program
- technique_question: User asks about exercise form, technique, or weak points
- motivation_support: User needs encouragement or mental coaching
- program_adjustment: User wants to modify existing workout based on feedback
- general_chat: Greetings, unclear questions, general conversation

**Instructions:**
Analyze the user message and return JSON with:
1. intent: One of the intent types above
2. confidence: Float 0.0-1.0 indicating classification confidence
3. reasoning: Brief explanation of why you chose this intent
4. suggestedAgent: Which agent should handle this (programmer, analyst_mentor, feedback)
5. requiresProgramContext: Boolean - does this need user's current program data?

Return ONLY valid JSON, no additional text.
"""

    async def process(
        self, user_input: Dict[str, Any], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Classify user intent and route to appropriate agent.

        Args:
            user_input: Must contain "message" key
            context: Must contain has_program, methodology

        Returns:
            Dictionary with IntentClassification data
        """
        user_message = user_input.get("message", "")

        if not user_message:
            raise ValueError("user_input must contain 'message' key")

        logger.info(f"Classifying intent for message: {user_message[:50]}...")

        system_prompt = self.get_system_prompt(context)
        user_prompt = f"User message: {user_message}"

        response_schema = self._create_intent_schema()
        response_text = await self._call_gemini(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_schema=response_schema,
            response_mime_type="application/json",
        )

        classification_data = json.loads(response_text)

        try:
            classification = IntentClassification(**classification_data)
        except ValidationError as e:
            logger.error(f"Intent classification validation failed: {e}")
            raise

        logger.info(
            f"Intent classified: {classification.intent} "
            f"(confidence: {classification.confidence:.2f}, "
            f"agent: {classification.suggestedAgent})"
        )

        return classification.model_dump()

    def _create_intent_schema(self) -> dict:
        """
        Create JSON schema for intent classification response.

        Returns:
            JSON schema dict
        """
        return {
            "type": "object",
            "properties": {
                "intent": {
                    "type": "string",
                    "description": "Classified intent type",
                    "enum": [
                        "program_generation",
                        "technique_question",
                        "motivation_support",
                        "program_adjustment",
                        "general_chat",
                    ],
                },
                "confidence": {
                    "type": "number",
                    "description": "Confidence score 0.0-1.0",
                },
                "reasoning": {
                    "type": "string",
                    "description": "Explanation of classification",
                },
                "suggestedAgent": {
                    "type": "string",
                    "description": "Agent to route to",
                    "enum": ["programmer", "analyst_mentor", "feedback"],
                },
                "requiresProgramContext": {
                    "type": "boolean",
                    "description": "Needs current program data",
                },
            },
            "required": [
                "intent",
                "confidence",
                "reasoning",
                "suggestedAgent",
                "requiresProgramContext",
            ],
        }

    def should_route_to_programmer(self, classification: Dict[str, Any]) -> bool:
        """Check if should route to programmer agent."""
        return classification.get("intent") == "program_generation"

    def should_route_to_analyst(self, classification: Dict[str, Any]) -> bool:
        """Check if should route to analyst/mentor agent."""
        return classification.get("intent") in [
            "technique_question",
            "motivation_support",
            "general_chat",
        ]

    def should_route_to_feedback(self, classification: Dict[str, Any]) -> bool:
        """Check if should route to feedback agent."""
        return classification.get("intent") == "program_adjustment"
