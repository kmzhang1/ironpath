"""
Integration tests for Phase 3 multi-agent system
Tests end-to-end flows with database and multiple agents
"""
import pytest
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from src.models.tables import (
    TrainingMethodology,
    Exercise,
    ReadinessCheck,
    AgentConversation,
)


class TestReadinessWorkflow:
    """Integration tests for readiness check workflow"""

    @pytest.mark.asyncio
    async def test_readiness_check_full_workflow(self, client, test_session):
        """Test complete readiness check flow: submit → save → retrieve"""
        user_id = str(uuid4())
        program_id = str(uuid4())

        check_data = {
            "userId": user_id,
            "programId": program_id,
            "weekNumber": 1,
            "dayNumber": 1,
            "sleepQuality": 2,
            "stressLevel": 4,
            "soreness_fatigue": 2,
        }

        submit_response = await client.post(
            "/api/readiness/check",
            json=check_data
        )
        assert submit_response.status_code == 200
        submit_data = submit_response.json()
        check_id = submit_data["checkId"]
        assert submit_data["shouldAdjustWorkout"] is True

        history_response = await client.get(f"/api/readiness/history/{user_id}")
        assert history_response.status_code == 200
        history = history_response.json()
        assert len(history) == 1
        assert history[0]["id"] == check_id

        stats_response = await client.get(f"/api/readiness/stats/{user_id}")
        assert stats_response.status_code == 200
        stats = stats_response.json()
        assert stats["total_checks"] == 1
        assert stats["adjustments_needed_count"] == 1


    @pytest.mark.asyncio
    async def test_multiple_readiness_checks_calculate_stats(self, client):
        """Test that multiple checks calculate correct statistics"""
        user_id = str(uuid4())
        program_id = str(uuid4())

        checks = [
            {"sleepQuality": 5, "stressLevel": 1, "soreness_fatigue": 5},
            {"sleepQuality": 4, "stressLevel": 2, "soreness_fatigue": 4},
            {"sleepQuality": 2, "stressLevel": 5, "soreness_fatigue": 2},
            {"sleepQuality": 3, "stressLevel": 3, "soreness_fatigue": 3},
        ]

        for i, check in enumerate(checks):
            await client.post(
                "/api/readiness/check",
                json={
                    "userId": user_id,
                    "programId": program_id,
                    "weekNumber": 1,
                    "dayNumber": i + 1,
                    **check
                }
            )

        stats_response = await client.get(f"/api/readiness/stats/{user_id}")
        assert stats_response.status_code == 200
        stats = stats_response.json()

        assert stats["total_checks"] == 4
        assert stats["average_sleep_quality"] == 3.5
        assert 0 <= stats["average_readiness"] <= 1


class TestMethodologyWorkflow:
    """Integration tests for methodology management"""

    @pytest.mark.asyncio
    async def test_methodology_crud_workflow(self, client, test_session):
        """Test methodology creation and retrieval"""
        from datetime import datetime

        methodology = TrainingMethodology(
            id="test_methodology",
            name="Test Methodology",
            description="A test training methodology",
            category="intermediate",
            system_prompt_template="You are a test coach.",
            programming_rules={"sets": "3-5", "reps": "5-8"},
            knowledge_base={"principle": "Progressive overload"},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        test_session.add(methodology)
        await test_session.commit()

        list_response = await client.get("/api/methodologies/list")
        assert list_response.status_code == 200
        methodologies = list_response.json()
        assert len(methodologies) == 1
        assert methodologies[0]["name"] == "Test Methodology"

        detail_response = await client.get("/api/methodologies/test_methodology")
        assert detail_response.status_code == 200
        detail = detail_response.json()
        assert detail["name"] == "Test Methodology"
        assert detail["programmingRules"]["sets"] == "3-5"

        category_response = await client.get("/api/methodologies/category/intermediate")
        assert category_response.status_code == 200
        by_category = category_response.json()
        assert len(by_category) == 1


class TestAgentConversationWorkflow:
    """Integration tests for agent conversation flow"""

    @pytest.mark.asyncio
    async def test_agent_conversation_persists_to_database(
        self, client, test_session, sample_extended_lifter_profile
    ):
        """Test that agent conversations are saved to database"""
        mock_classification = {
            "intent": "technique_question",
            "confidence": 0.92,
            "reasoning": "Technique question",
            "suggested_agent": "analyst_mentor",
            "requires_program_context": False,
        }

        mock_analyst_response = {
            "response": "Focus on form and technique.",
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
                    "message": "How do I improve my squat?",
                    "profile": sample_extended_lifter_profile,
                    "currentProgramId": None,
                }
            )

            assert response.status_code == 200

            user_id = sample_extended_lifter_profile["id"]
            history_response = await client.get(f"/api/agent/conversations/{user_id}")
            assert history_response.status_code == 200
            conversations = history_response.json()
            assert len(conversations) >= 1


class TestProgramGenerationV2Integration:
    """Integration tests for v2 program generation with methodologies"""

    @pytest.mark.asyncio
    async def test_v2_generation_with_methodology_and_exercises(
        self, client, test_session, sample_extended_lifter_profile, sample_program_request
    ):
        """Test v2 generation loads methodology and filters exercises"""
        from datetime import datetime

        methodology = TrainingMethodology(
            id="westside",
            name="Westside Conjugate",
            description="Max effort and dynamic effort training",
            category="advanced",
            system_prompt_template="You are a Westside coach.",
            programming_rules={
                "max_effort": "weekly rotation",
                "dynamic_effort": "50-60% with bands",
            },
            knowledge_base={"quote": "Special exercises cure special weaknesses"},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        test_session.add(methodology)

        exercises = [
            Exercise(
                id=str(uuid4()),
                name="Box Squat",
                category="squat",
                variation_type="box",
                equipment=["barbell", "rack", "box"],
                targets_weak_points=["hole", "explosiveness"],
                movement_pattern="squat",
                complexity="intermediate",
                coaching_cues="Sit back onto box",
                created_at=datetime.utcnow(),
            ),
            Exercise(
                id=str(uuid4()),
                name="Board Press",
                category="bench",
                variation_type="board",
                equipment=["barbell", "bench", "boards"],
                targets_weak_points=["lockout"],
                movement_pattern="horizontal_push",
                complexity="intermediate",
                coaching_cues="Touch boards to chest",
                created_at=datetime.utcnow(),
            ),
        ]
        for ex in exercises:
            test_session.add(ex)

        await test_session.commit()

        mock_program = {
            "id": str(uuid4()),
            "createdAt": datetime.utcnow().isoformat(),
            "title": "Westside Conjugate Program",
            "weeks": [
                {
                    "weekNumber": 1,
                    "sessions": [
                        {
                            "dayNumber": 1,
                            "focus": "Max Effort Squat",
                            "exercises": [
                                {
                                    "name": "Box Squat",
                                    "sets": 5,
                                    "reps": "3",
                                    "rpeTarget": 9.0,
                                    "restSeconds": 300,
                                    "notes": "Work up to heavy triple"
                                }
                            ]
                        }
                    ]
                }
            ]
        }

        with patch("src.routes.programs.settings.GEMINI_API_KEY", "test_key"), \
             patch("src.routes.programs.ProgrammerAgent") as MockProgrammer:

            from src.models.schemas import FullProgramSchema
            mock_programmer_instance = MockProgrammer.return_value
            mock_programmer_instance.process = AsyncMock(return_value={
                "program": FullProgramSchema(**mock_program),
                "methodology_used": "Westside Conjugate",
            })

            response = await client.post(
                "/api/programs/generate-v2",
                json={
                    "profile": sample_extended_lifter_profile,
                    "request": sample_program_request,
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert "Westside" in data["message"]
            assert data["program"]["title"] == "Westside Conjugate Program"


class TestErrorHandling:
    """Integration tests for error handling"""

    @pytest.mark.asyncio
    async def test_database_unavailable_readiness(self, client):
        """Test graceful handling when database is unavailable"""
        with patch("src.routes.readiness.get_db", return_value=None):
            response = await client.post(
                "/api/readiness/check",
                json={
                    "userId": "test",
                    "programId": "test",
                    "weekNumber": 1,
                    "dayNumber": 1,
                    "sleepQuality": 3,
                    "stressLevel": 3,
                    "soreness_fatigue": 3,
                }
            )

            assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_invalid_request_data(self, client):
        """Test that invalid request data returns 422"""
        response = await client.post(
            "/api/readiness/check",
            json={
                "userId": "test",
                "weekNumber": "invalid",
            }
        )

        assert response.status_code == 422


class TestEndToEndScenarios:
    """E2E tests for complete user workflows"""

    @pytest.mark.asyncio
    async def test_new_user_onboarding_complete_flow(
        self, client, test_session, sample_extended_lifter_profile, sample_program_request
    ):
        """E2E: New user completes wizard and generates program"""
        from datetime import datetime

        methodology = TrainingMethodology(
            id="linear_progression",
            name="Linear Progression",
            description="Beginner-friendly linear progression",
            category="novice",
            system_prompt_template="You are a beginner coach.",
            programming_rules={"sets": "3-5", "reps": "5", "progression": "weekly"},
            knowledge_base={"principle": "Add weight each session"},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        test_session.add(methodology)
        await test_session.commit()

        methodology_response = await client.get("/api/methodologies/list")
        assert methodology_response.status_code == 200
        methodologies = methodology_response.json()
        assert len(methodologies) >= 1

        profile_with_methodology = sample_extended_lifter_profile.copy()
        profile_with_methodology["methodologyId"] = "linear_progression"

        mock_program = {
            "id": str(uuid4()),
            "createdAt": datetime.utcnow().isoformat(),
            "title": "Linear Progression Program",
            "weeks": [
                {
                    "weekNumber": 1,
                    "sessions": [
                        {
                            "dayNumber": 1,
                            "focus": "Squat Day",
                            "exercises": []
                        }
                    ]
                }
            ]
        }

        with patch("src.routes.programs.settings.GEMINI_API_KEY", "test_key"), \
             patch("src.routes.programs.ProgrammerAgent") as MockProgrammer:

            from src.models.schemas import FullProgramSchema
            mock_programmer_instance = MockProgrammer.return_value
            mock_programmer_instance.process = AsyncMock(return_value={
                "program": FullProgramSchema(**mock_program),
                "methodology_used": "Linear Progression",
            })

            program_response = await client.post(
                "/api/programs/generate-v2",
                json={
                    "profile": profile_with_methodology,
                    "request": sample_program_request,
                }
            )

            assert program_response.status_code == 200
            program_data = program_response.json()
            assert "program" in program_data


    @pytest.mark.asyncio
    async def test_readiness_check_adjusts_workout_flow(self, client, test_session):
        """E2E: User submits poor readiness and receives adjustment"""
        user_id = str(uuid4())
        program_id = str(uuid4())

        poor_readiness = {
            "userId": user_id,
            "programId": program_id,
            "weekNumber": 2,
            "dayNumber": 3,
            "sleepQuality": 2,
            "stressLevel": 4,
            "soreness_fatigue": 2,
        }

        check_response = await client.post(
            "/api/readiness/check",
            json=poor_readiness
        )

        assert check_response.status_code == 200
        check_data = check_response.json()
        assert check_data["shouldAdjustWorkout"] is True
        assert check_data["adjustmentType"] in ["reduce_volume", "reduce_intensity"]

        history_response = await client.get(f"/api/readiness/history/{user_id}")
        assert history_response.status_code == 200
        history = history_response.json()
        assert len(history) >= 1

    @pytest.mark.asyncio
    async def test_agent_chat_technique_question_flow(
        self, client, sample_extended_lifter_profile
    ):
        """E2E: User asks technique question through agent chat"""
        mock_classification = {
            "intent": "technique_question",
            "confidence": 0.94,
            "reasoning": "User asking about squat depth",
            "suggested_agent": "analyst_mentor",
            "requires_program_context": False,
        }

        mock_response = {
            "response": "For better squat depth, focus on ankle mobility and hip flexibility.",
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
            mock_analyst_instance.process = AsyncMock(return_value=mock_response)

            chat_response = await client.post(
                "/api/agent/message",
                json={
                    "message": "How do I improve my squat depth?",
                    "profile": sample_extended_lifter_profile,
                    "currentProgramId": None,
                }
            )

            assert chat_response.status_code == 200
            data = chat_response.json()
            assert data["agentUsed"] == "analyst_mentor"
            assert "depth" in data["response"]["response"].lower()


    @pytest.mark.asyncio
    async def test_multiple_methodologies_filtering_by_category(
        self, client, test_session
    ):
        """E2E: Test methodology filtering by category"""
        from datetime import datetime

        methodologies = [
            TrainingMethodology(
                id="novice_linear",
                name="Linear Progression",
                description="For beginners",
                category="novice",
                system_prompt_template="Beginner coach",
                programming_rules={},
                knowledge_base={},
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            TrainingMethodology(
                id="advanced_westside",
                name="Westside",
                description="For advanced lifters",
                category="advanced",
                system_prompt_template="Westside coach",
                programming_rules={},
                knowledge_base={},
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
        ]

        for m in methodologies:
            test_session.add(m)
        await test_session.commit()

        all_response = await client.get("/api/methodologies/list")
        assert all_response.status_code == 200
        assert len(all_response.json()) == 2

        novice_response = await client.get("/api/methodologies/category/novice")
        assert novice_response.status_code == 200
        novice_methods = novice_response.json()
        assert len(novice_methods) == 1
        assert novice_methods[0]["category"] == "novice"

        advanced_response = await client.get("/api/methodologies/category/advanced")
        assert advanced_response.status_code == 200
        advanced_methods = advanced_response.json()
        assert len(advanced_methods) == 1
        assert advanced_methods[0]["category"] == "advanced"


class TestDataConsistency:
    """Integration tests for data consistency and constraints"""

    @pytest.mark.asyncio
    async def test_readiness_check_creates_database_entry(self, client, test_session):
        """Test readiness check persists to database correctly"""
        from sqlalchemy import select

        user_id = str(uuid4())
        program_id = str(uuid4())

        check_data = {
            "userId": user_id,
            "programId": program_id,
            "weekNumber": 1,
            "dayNumber": 1,
            "sleepQuality": 4,
            "stressLevel": 2,
            "soreness_fatigue": 4,
        }

        response = await client.post("/api/readiness/check", json=check_data)
        assert response.status_code == 200

        result = await test_session.execute(
            select(ReadinessCheck).where(ReadinessCheck.user_id == user_id)
        )
        saved_check = result.scalar_one_or_none()

        assert saved_check is not None
        assert saved_check.user_id == user_id
        assert saved_check.program_id == program_id
        assert saved_check.sleep_quality == 4
        assert saved_check.overall_readiness > 0


    @pytest.mark.asyncio
    async def test_agent_conversation_persists_metadata(
        self, client, test_session, sample_extended_lifter_profile
    ):
        """Test agent conversations save complete metadata"""
        from sqlalchemy import select

        mock_classification = {
            "intent": "motivation_support",
            "confidence": 0.89,
            "reasoning": "User needs encouragement",
            "suggested_agent": "analyst_mentor",
            "requires_program_context": False,
        }

        mock_response = {
            "response": "Keep pushing, you've got this!",
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
            mock_analyst_instance.process = AsyncMock(return_value=mock_response)

            response = await client.post(
                "/api/agent/message",
                json={
                    "message": "I missed my last squat attempt",
                    "profile": sample_extended_lifter_profile,
                    "currentProgramId": None,
                }
            )

            assert response.status_code == 200

            user_id = sample_extended_lifter_profile["id"]
            result = await test_session.execute(
                select(AgentConversation).where(
                    AgentConversation.user_id == user_id
                )
            )
            conversation = result.scalar_one_or_none()

            assert conversation is not None
            assert conversation.agent_type == "analyst_mentor"
            assert conversation.intent_classification["intent"] == "motivation_support"
