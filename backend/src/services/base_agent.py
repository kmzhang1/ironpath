"""
Base Agent Class for Multi-Agent System
Provides common Gemini API functionality with retry logic and caching
"""

import json
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from uuid import uuid4
from datetime import datetime

from google import genai
from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.tables import AgentConversation

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """
    Abstract base class for all AI agents.
    Provides common Gemini API integration, retry logic, and caching.
    """

    def __init__(
        self,
        api_key: str,
        db_session: AsyncSession,
        model_name: str = "gemini-2.5-flash-lite",
        temperature: float = 0.7,
        max_retries: int = 3,
    ):
        """
        Initialize base agent with Gemini client and database session.

        Args:
            api_key: Google Gemini API key
            db_session: SQLAlchemy async database session
            model_name: Gemini model to use
            temperature: Response temperature (0.0-1.0)
            max_retries: Maximum retry attempts for failed API calls
        """
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name
        self.temperature = temperature
        self.max_retries = max_retries
        self.db_session = db_session
        self._cache: Dict[str, Any] = {}

    @abstractmethod
    def get_system_prompt(self, context: Dict[str, Any]) -> str:
        """
        Build agent-specific system prompt.

        Args:
            context: Context dictionary with relevant data

        Returns:
            System prompt string
        """
        pass

    @abstractmethod
    async def process(
        self, user_input: Dict[str, Any], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Main processing method for agent-specific logic.

        Args:
            user_input: User input dictionary
            context: Context dictionary with relevant data

        Returns:
            Agent response dictionary
        """
        pass

    async def _call_gemini(
        self,
        system_prompt: str,
        user_prompt: str,
        response_schema: Optional[dict] = None,
        response_mime_type: str = "text/plain",
    ) -> str:
        """
        Common Gemini API wrapper with retry logic.

        Args:
            system_prompt: System instructions for the model
            user_prompt: User message to process
            response_schema: Optional JSON schema for structured output
            response_mime_type: Response format (text/plain or application/json)

        Returns:
            Response text from Gemini

        Raises:
            Exception: If all retry attempts fail
        """
        for attempt in range(1, self.max_retries + 1):
            try:
                config = types.GenerateContentConfig(
                    temperature=self.temperature,
                    response_mime_type=response_mime_type,
                )
                if response_schema:
                    config.response_schema = response_schema

                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=[
                        types.Content(
                            role="user",
                            parts=[
                                types.Part(text=system_prompt),
                                types.Part(text=user_prompt),
                            ],
                        )
                    ],
                    config=config,
                )

                if not response.text:
                    raise ValueError("Empty response from Gemini")

                logger.debug(f"Gemini API call successful (attempt {attempt})")
                return response.text

            except Exception as e:
                logger.warning(
                    f"Attempt {attempt}/{self.max_retries} failed: {str(e)}"
                )
                if attempt == self.max_retries:
                    logger.error(f"All {self.max_retries} attempts failed")
                    raise

        raise Exception("Unexpected error in Gemini API call")

    async def _log_conversation(
        self,
        user_id: str,
        agent_type: str,
        user_message: str,
        agent_response: str,
        intent_classification: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Log agent conversation to database for analytics.

        Args:
            user_id: User ID
            agent_type: Type of agent (router, programmer, analyst)
            user_message: Original user message
            agent_response: Agent's response
            intent_classification: Optional intent classification data
            context: Optional context data
        """
        try:
            conversation = AgentConversation(
                id=str(uuid4()),
                user_id=user_id,
                agent_type=agent_type,
                user_message=user_message,
                intent_classification=intent_classification,
                agent_response=agent_response,
                context=context or {},
            )
            self.db_session.add(conversation)
            await self.db_session.commit()
            logger.info(f"Logged {agent_type} conversation for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to log conversation: {str(e)}")

    def cache_get(self, key: str) -> Optional[Any]:
        """
        Get value from request-scoped cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None
        """
        return self._cache.get(key)

    def cache_set(self, key: str, value: Any) -> None:
        """
        Set value in request-scoped cache.

        Args:
            key: Cache key
            value: Value to cache
        """
        self._cache[key] = value
