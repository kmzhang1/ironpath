"""
Performance tests for Phase 5 multi-agent system
Validates API response times meet Phase 5 targets
"""
import pytest
import time
from unittest.mock import AsyncMock, patch
from uuid import uuid4
from datetime import datetime

from src.models.tables import TrainingMethodology, Exercise


class TestPerformanceTargets:
    """Performance tests validating response time targets"""

    @pytest.mark.asyncio
    async def test_router_agent_response_time_under_500ms(
        self, client, sample_extended_lifter_profile
    ):
        """Test router agent responds in <500ms (target from plan)"""
        mock_classification = {
            "intent": "technique_question",
            "confidence": 0.92,
            "reasoning": "Technique question",
            "suggested_agent": "analyst_mentor",
            "requires_program_context": False,
        }

        mock_response = {
            "response": "Focus on form.",
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

            start_time = time.time()
            response = await client.post(
                "/api/agent/message",
                json={
                    "message": "How do I improve my lockout?",
                    "profile": sample_extended_lifter_profile,
                    "currentProgramId": None,
                }
            )
            elapsed = (time.time() - start_time) * 1000

            assert response.status_code == 200
            assert elapsed < 500, f"Router response took {elapsed}ms, target is <500ms"


    @pytest.mark.asyncio
    async def test_readiness_check_response_time_under_200ms(self, client):
        """Test readiness check responds in <200ms (target from plan)"""
        check_data = {
            "userId": str(uuid4()),
            "programId": str(uuid4()),
            "weekNumber": 1,
            "dayNumber": 1,
            "sleepQuality": 3,
            "stressLevel": 3,
            "soreness_fatigue": 3,
        }

        start_time = time.time()
        response = await client.post("/api/readiness/check", json=check_data)
        elapsed = (time.time() - start_time) * 1000

        assert response.status_code == 200
        assert elapsed < 200, f"Readiness check took {elapsed}ms, target is <200ms"


    @pytest.mark.asyncio
    async def test_methodology_list_response_time_under_100ms(
        self, client, test_session
    ):
        """Test methodology list endpoint is fast"""
        methodology = TrainingMethodology(
            id="test_method",
            name="Test Method",
            description="Test",
            category="intermediate",
            system_prompt_template="Test",
            programming_rules={},
            knowledge_base={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        test_session.add(methodology)
        await test_session.commit()

        start_time = time.time()
        response = await client.get("/api/methodologies/list")
        elapsed = (time.time() - start_time) * 1000

        assert response.status_code == 200
        assert elapsed < 100, f"Methodology list took {elapsed}ms, should be <100ms"


    @pytest.mark.asyncio
    async def test_analyst_agent_response_time_under_2s(
        self, client, sample_extended_lifter_profile
    ):
        """Test analyst agent responds in <2s (target from plan)"""
        mock_classification = {
            "intent": "technique_question",
            "confidence": 0.92,
            "reasoning": "Technique question",
            "suggested_agent": "analyst_mentor",
            "requires_program_context": False,
        }

        mock_response = {
            "response": "Detailed coaching advice here...",
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

            start_time = time.time()
            response = await client.post(
                "/api/agent/message",
                json={
                    "message": "Detailed technique question",
                    "profile": sample_extended_lifter_profile,
                    "currentProgramId": None,
                }
            )
            elapsed = (time.time() - start_time) * 1000

            assert response.status_code == 200
            assert elapsed < 2000, f"Analyst took {elapsed}ms, target is <2s"


    @pytest.mark.asyncio
    async def test_programmer_agent_response_time_under_5s(
        self, client, test_session, sample_extended_lifter_profile, sample_program_request
    ):
        """Test programmer agent responds in <5s (target from plan)"""
        methodology = TrainingMethodology(
            id="test_method",
            name="Test Method",
            description="Test",
            category="intermediate",
            system_prompt_template="Test",
            programming_rules={},
            knowledge_base={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        test_session.add(methodology)
        await test_session.commit()

        mock_program = {
            "id": str(uuid4()),
            "createdAt": datetime.utcnow().isoformat(),
            "title": "Test Program",
            "weeks": [
                {
                    "weekNumber": 1,
                    "sessions": [
                        {
                            "dayNumber": 1,
                            "focus": "Squat",
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
                "methodology_used": "Test Method",
            })

            profile = sample_extended_lifter_profile.copy()
            profile["methodologyId"] = "test_method"

            start_time = time.time()
            response = await client.post(
                "/api/programs/generate-v2",
                json={
                    "profile": profile,
                    "request": sample_program_request,
                }
            )
            elapsed = (time.time() - start_time) * 1000

            assert response.status_code == 200
            assert elapsed < 5000, f"Programmer took {elapsed}ms, target is <5s"


class TestDatabasePerformance:
    """Tests for database query performance"""

    @pytest.mark.asyncio
    async def test_readiness_history_query_performance(self, client):
        """Test readiness history query is efficient"""
        user_id = str(uuid4())
        program_id = str(uuid4())

        for i in range(10):
            await client.post(
                "/api/readiness/check",
                json={
                    "userId": user_id,
                    "programId": program_id,
                    "weekNumber": 1,
                    "dayNumber": i + 1,
                    "sleepQuality": 3,
                    "stressLevel": 3,
                    "soreness_fatigue": 3,
                }
            )

        start_time = time.time()
        response = await client.get(f"/api/readiness/history/{user_id}")
        elapsed = (time.time() - start_time) * 1000

        assert response.status_code == 200
        assert len(response.json()) == 10
        assert elapsed < 100, f"History query took {elapsed}ms"


    @pytest.mark.asyncio
    async def test_methodology_detail_query_performance(self, client, test_session):
        """Test methodology detail lookup is fast"""
        methodology = TrainingMethodology(
            id="perf_test_method",
            name="Performance Test",
            description="Testing performance",
            category="intermediate",
            system_prompt_template="Test prompt",
            programming_rules={"rule1": "value1", "rule2": "value2"},
            knowledge_base={"kb1": "data1", "kb2": "data2"},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        test_session.add(methodology)
        await test_session.commit()

        start_time = time.time()
        response = await client.get("/api/methodologies/perf_test_method")
        elapsed = (time.time() - start_time) * 1000

        assert response.status_code == 200
        assert elapsed < 50, f"Methodology detail took {elapsed}ms"


    @pytest.mark.asyncio
    async def test_exercise_filtering_performance(self, client, test_session):
        """Test exercise filtering with multiple criteria is performant"""
        exercises = []
        for i in range(50):
            ex = Exercise(
                id=f"exercise_{i}",
                name=f"Exercise {i}",
                category="squat" if i % 3 == 0 else "bench",
                variation_type="competition",
                equipment=["barbell", "rack"],
                targets_weak_points=["lockout"] if i % 2 == 0 else ["hole"],
                movement_pattern="vertical",
                complexity="intermediate",
                coaching_cues="Test cue",
                created_at=datetime.utcnow(),
            )
            exercises.append(ex)
            test_session.add(ex)

        await test_session.commit()

        start_time = time.time()
        elapsed = (time.time() - start_time) * 1000

        assert elapsed < 500, f"Exercise filtering took {elapsed}ms"


class TestConcurrentLoad:
    """Tests for concurrent request handling"""

    @pytest.mark.asyncio
    async def test_concurrent_readiness_checks(self, client):
        """Test handling multiple concurrent readiness checks"""
        import asyncio

        async def submit_check(user_num):
            return await client.post(
                "/api/readiness/check",
                json={
                    "userId": f"user_{user_num}",
                    "programId": f"program_{user_num}",
                    "weekNumber": 1,
                    "dayNumber": 1,
                    "sleepQuality": 3,
                    "stressLevel": 3,
                    "soreness_fatigue": 3,
                }
            )

        start_time = time.time()
        responses = await asyncio.gather(*[submit_check(i) for i in range(10)])
        elapsed = (time.time() - start_time) * 1000

        assert all(r.status_code == 200 for r in responses)
        assert elapsed < 1000, f"10 concurrent requests took {elapsed}ms"


    @pytest.mark.asyncio
    async def test_concurrent_methodology_queries(self, client, test_session):
        """Test handling concurrent methodology lookups"""
        import asyncio

        for i in range(5):
            methodology = TrainingMethodology(
                id=f"concurrent_test_{i}",
                name=f"Test {i}",
                description="Test",
                category="intermediate",
                system_prompt_template="Test",
                programming_rules={},
                knowledge_base={},
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            test_session.add(methodology)
        await test_session.commit()

        async def get_methodology(method_id):
            return await client.get(f"/api/methodologies/{method_id}")

        start_time = time.time()
        responses = await asyncio.gather(
            *[get_methodology(f"concurrent_test_{i}") for i in range(5)]
        )
        elapsed = (time.time() - start_time) * 1000

        assert all(r.status_code == 200 for r in responses)
        assert elapsed < 500, f"5 concurrent queries took {elapsed}ms"
