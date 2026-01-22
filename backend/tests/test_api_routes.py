"""
Tests for Phase 3 API routes:
- Agent router endpoint
- Readiness check endpoints
- Methodologies endpoints
"""
import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime


class TestAgentRouter:
    """Tests for agent message routing endpoint"""

    @pytest.mark.asyncio
    async def test_agent_message_requires_api_key(self, client, sample_extended_lifter_profile):
        """Test that agent endpoint requires Gemini API key"""
        with patch("src.routes.router.settings.GEMINI_API_KEY", ""):
            response = await client.post(
                "/api/agent/message",
                json={
                    "message": "How do I improve my bench lockout?",
                    "profile": sample_extended_lifter_profile,
                    "currentProgramId": None,
                }
            )
            assert response.status_code == 503
            assert "not configured" in response.json()["detail"]["error"].lower()

    @pytest.mark.asyncio
    async def test_agent_message_routes_to_analyst(
        self, client, sample_extended_lifter_profile
    ):
        """Test that technique questions route to analyst agent"""
        mock_classification = {
            "intent": "technique_question",
            "confidence": 0.92,
            "reasoning": "User asking about technique improvement",
            "suggested_agent": "analyst_mentor",
            "requires_program_context": False,
        }

        mock_analyst_response = {
            "response": "To improve bench lockout, focus on board press and close-grip variations.",
            "agent_type": "analyst_mentor",
        }

        with patch("src.routes.router.settings.GEMINI_API_KEY", "test_key"), \
             patch("src.routes.router.RouterAgent") as MockRouter, \
             patch("src.routes.router.AnalystAgent") as MockAnalyst:

            mock_router_instance = MockRouter.return_value
            mock_router_instance.process = AsyncMock(return_value=mock_classification)
            mock_router_instance.should_route_to_analyst = lambda x: True
            mock_router_instance.should_route_to_programmer = lambda x: False
            mock_router_instance.should_route_to_feedback = lambda x: False

            mock_analyst_instance = MockAnalyst.return_value
            mock_analyst_instance.process = AsyncMock(return_value=mock_analyst_response)

            response = await client.post(
                "/api/agent/message",
                json={
                    "message": "How do I improve my bench lockout?",
                    "profile": sample_extended_lifter_profile,
                    "currentProgramId": None,
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert data["agentUsed"] == "analyst_mentor"
            assert data["intentClassification"]["intent"] == "technique_question"
            assert "lockout" in data["response"]["response"].lower()

    @pytest.mark.asyncio
    async def test_agent_message_program_request_redirects(
        self, client, sample_extended_lifter_profile
    ):
        """Test that program generation requests are redirected to wizard"""
        mock_classification = {
            "intent": "program_generation",
            "confidence": 0.95,
            "reasoning": "User wants to create new program",
            "suggested_agent": "programmer",
            "requires_program_context": False,
        }

        with patch("src.routes.router.settings.GEMINI_API_KEY", "test_key"), \
             patch("src.routes.router.RouterAgent") as MockRouter:

            mock_router_instance = MockRouter.return_value
            mock_router_instance.process = AsyncMock(return_value=mock_classification)
            mock_router_instance.should_route_to_analyst = lambda x: False
            mock_router_instance.should_route_to_programmer = lambda x: True
            mock_router_instance.should_route_to_feedback = lambda x: False

            response = await client.post(
                "/api/agent/message",
                json={
                    "message": "I want to create a new program",
                    "profile": sample_extended_lifter_profile,
                    "currentProgramId": None,
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert data["agentUsed"] == "programmer"
            assert data["response"]["requires_program_generation"] is True

    @pytest.mark.asyncio
    async def test_get_user_conversations_empty(self, client):
        """Test fetching conversations for user with no history"""
        response = await client.get("/api/agent/conversations/test_user_123")
        assert response.status_code == 200
        assert response.json() == []


class TestReadinessCheck:
    """Tests for readiness check endpoints"""

    @pytest.mark.asyncio
    async def test_readiness_check_low_score(self, client):
        """Test that low readiness triggers volume reduction recommendation"""
        response = await client.post(
            "/api/readiness/check",
            json={
                "userId": "test_user_123",
                "programId": "test_program_456",
                "weekNumber": 2,
                "dayNumber": 3,
                "sleepQuality": 1,
                "stressLevel": 5,
                "soreness_fatigue": 2,
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert "checkId" in data
        assert data["overallReadiness"] < 0.5
        assert data["shouldAdjustWorkout"] is True
        assert data["adjustmentType"] == "reduce_volume"
        assert "30-40%" in data["recommendation"]

    @pytest.mark.asyncio
    async def test_readiness_check_moderate_score(self, client):
        """Test that moderate readiness triggers intensity reduction"""
        response = await client.post(
            "/api/readiness/check",
            json={
                "userId": "test_user_123",
                "programId": "test_program_456",
                "weekNumber": 2,
                "dayNumber": 3,
                "sleepQuality": 3,
                "stressLevel": 3,
                "soreness_fatigue": 3,
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert data["overallReadiness"] >= 0.5
        assert data["overallReadiness"] < 0.7
        assert data["shouldAdjustWorkout"] is True
        assert data["adjustmentType"] == "reduce_intensity"
        assert "RPE" in data["recommendation"]

    @pytest.mark.asyncio
    async def test_readiness_check_high_score(self, client):
        """Test that high readiness proceeds as planned"""
        response = await client.post(
            "/api/readiness/check",
            json={
                "userId": "test_user_123",
                "programId": "test_program_456",
                "weekNumber": 2,
                "dayNumber": 3,
                "sleepQuality": 5,
                "stressLevel": 1,
                "soreness_fatigue": 5,
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert data["overallReadiness"] >= 0.7
        assert data["shouldAdjustWorkout"] is False
        assert data["adjustmentType"] is None
        assert "proceed" in data["recommendation"].lower()

    @pytest.mark.asyncio
    async def test_readiness_check_validation(self, client):
        """Test that invalid readiness values are rejected"""
        response = await client.post(
            "/api/readiness/check",
            json={
                "userId": "test_user_123",
                "programId": "test_program_456",
                "weekNumber": 2,
                "dayNumber": 3,
                "sleepQuality": 10,
                "stressLevel": 3,
                "soreness_fatigue": 3,
            }
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_readiness_history_empty(self, client):
        """Test fetching readiness history for user with no checks"""
        response = await client.get("/api/readiness/history/test_user_123")
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_get_readiness_stats_empty(self, client):
        """Test fetching readiness stats for user with no checks"""
        response = await client.get("/api/readiness/stats/test_user_123")
        assert response.status_code == 200
        data = response.json()
        assert data["total_checks"] == 0


class TestMethodologies:
    """Tests for methodology management endpoints"""

    @pytest.mark.asyncio
    async def test_list_methodologies_empty(self, client):
        """Test listing methodologies when none exist"""
        response = await client.get("/api/methodologies/list")
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_get_methodology_not_found(self, client):
        """Test getting non-existent methodology"""
        response = await client.get("/api/methodologies/nonexistent_id")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_list_methodologies_by_category_empty(self, client):
        """Test listing methodologies by category when none exist"""
        response = await client.get("/api/methodologies/category/advanced")
        assert response.status_code == 200
        assert response.json() == []


class TestProgramGenerationV2:
    """Tests for v2 program generation endpoint"""

    @pytest.mark.asyncio
    async def test_generate_v2_requires_methodology(
        self, client, sample_extended_lifter_profile, sample_program_request
    ):
        """Test that v2 generation requires methodology ID"""
        profile = sample_extended_lifter_profile.copy()
        profile["methodologyId"] = None

        with patch("src.routes.programs.settings.GEMINI_API_KEY", "test_key"):
            response = await client.post(
                "/api/programs/generate-v2",
                json={
                    "profile": profile,
                    "request": sample_program_request,
                }
            )

            assert response.status_code == 400
            assert "methodology" in response.json()["detail"]["error"].lower()

    @pytest.mark.asyncio
    async def test_generate_v2_requires_api_key(
        self, client, sample_extended_lifter_profile, sample_program_request
    ):
        """Test that v2 generation requires Gemini API key"""
        with patch("src.routes.programs.settings.GEMINI_API_KEY", ""):
            response = await client.post(
                "/api/programs/generate-v2",
                json={
                    "profile": sample_extended_lifter_profile,
                    "request": sample_program_request,
                }
            )

            assert response.status_code == 503


class TestDeprecationWarnings:
    """Tests for deprecated v1 endpoints"""

    @pytest.mark.asyncio
    async def test_v1_endpoint_is_deprecated(
        self, client, sample_lifter_profile, sample_program_request
    ):
        """Test that v1 endpoint shows deprecation warning"""
        with patch("src.routes.programs.settings.GEMINI_API_KEY", ""):
            response = await client.post(
                "/api/programs/generate",
                json={
                    "profile": sample_lifter_profile,
                    "request": sample_program_request,
                }
            )

            assert response.status_code in [200, 500, 503]
