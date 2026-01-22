"""
Agent routing endpoints for multi-agent conversation system
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
    AgentMessageRequest,
    AgentMessageResponse,
    IntentClassification,
)
from ..models.tables import AgentConversation
from ..services.router_agent import RouterAgent
from ..services.analyst_agent import AnalystMentorAgent
from ..services.programmer_agent import ProgrammerAgent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/message", response_model=AgentMessageResponse)
async def handle_agent_message(
    request: AgentMessageRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Route user messages to appropriate specialized agents.

    This endpoint:
    1. Receives a user message with profile context
    2. Uses RouterAgent to classify intent
    3. Routes to the appropriate specialized agent
    4. Logs the conversation for analytics
    5. Returns the agent response

    Args:
        request: Agent message request with message, profile, and optional program ID
        db: Database session

    Returns:
        AgentMessageResponse with agent type, classification, and response

    Raises:
        HTTPException: If routing or agent processing fails
    """
    try:
        logger.info(f"Received agent message from user {request.profile.id}")

        if not settings.GEMINI_API_KEY:
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "AI service not configured",
                    "code": "SERVICE_UNAVAILABLE",
                }
            )

        # Initialize Router Agent
        router_agent = RouterAgent(
            api_key=settings.GEMINI_API_KEY,
            db_session=db,
            model_name=settings.GEMINI_MODEL,
        )

        # Classify intent
        classification = await router_agent.process(
            user_input={"message": request.message},
            context={
                "has_program": request.currentProgramId is not None,
                "methodology": request.profile.methodologyId,
            }
        )

        logger.info(
            f"Intent classified: {classification['intent']} "
            f"(confidence: {classification['confidence']:.2f})"
        )

        # Route to appropriate agent
        agent_used = ""
        agent_response = {}

        if router_agent.should_route_to_analyst(classification):
            agent_used = "analyst_mentor"
            analyst = AnalystMentorAgent(
                api_key=settings.GEMINI_API_KEY,
                model_name=settings.GEMINI_MODEL,
                db_session=db,
            )
            agent_response = await analyst.process(
                user_input={"message": request.message},
                context={
                    "profile": request.profile.model_dump(),
                    "methodology_id": request.profile.methodologyId,
                }
            )

        elif router_agent.should_route_to_programmer(classification):
            agent_used = "programmer"
            agent_response = {
                "message": "To generate a new program, please use the program generation wizard.",
                "requires_program_generation": True,
            }

        elif router_agent.should_route_to_feedback(classification):
            agent_used = "feedback"
            agent_response = {
                "message": "To adjust your workout, please use the feedback form in your program view.",
                "requires_feedback_form": True,
            }

        else:
            agent_used = "analyst_mentor"
            analyst = AnalystMentorAgent(
                api_key=settings.GEMINI_API_KEY,
                model_name=settings.GEMINI_MODEL,
                db_session=db,
            )
            agent_response = await analyst.process(
                user_input={"message": request.message},
                context={
                    "profile": request.profile.model_dump(),
                    "methodology_id": request.profile.methodologyId,
                }
            )

        # Save conversation to database
        if db is not None:
            try:
                conversation = AgentConversation(
                    id=str(uuid4()),
                    user_id=request.profile.id,
                    agent_type=agent_used,
                    user_message=request.message,
                    intent_classification=classification,
                    agent_response=str(agent_response),
                    context={
                        "has_program": request.currentProgramId is not None,
                        "methodology_id": request.profile.methodologyId,
                    }
                )
                db.add(conversation)
                await db.commit()
                logger.info(f"Conversation logged: {conversation.id}")
            except Exception as e:
                await db.rollback()
                logger.warning(f"Failed to log conversation: {e}")

        return AgentMessageResponse(
            agentUsed=agent_used,
            intentClassification=IntentClassification(**classification),
            response=agent_response,
            timestamp=datetime.utcnow().isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Agent routing failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to process message",
                "code": "AGENT_ERROR",
                "details": {"message": str(e)},
            }
        )


@router.get("/conversations/{user_id}")
async def get_user_conversations(
    user_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """
    Get conversation history for a user.

    Args:
        user_id: User ID to fetch conversations for
        limit: Maximum number of conversations to return
        db: Database session

    Returns:
        List of conversation records
    """
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database not configured"
        )

    try:
        result = await db.execute(
            select(AgentConversation)
            .where(AgentConversation.user_id == user_id)
            .order_by(AgentConversation.created_at.desc())
            .limit(limit)
        )
        conversations = result.scalars().all()

        return [
            {
                "id": c.id,
                "agent_type": c.agent_type,
                "user_message": c.user_message,
                "intent_classification": c.intent_classification,
                "agent_response": c.agent_response,
                "context": c.context,
                "created_at": c.created_at.isoformat(),
            }
            for c in conversations
        ]
    except Exception as e:
        logger.error(f"Failed to fetch conversations: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch conversations"
        )
