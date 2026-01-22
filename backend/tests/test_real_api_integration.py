"""
Optional integration tests with real Gemini API
These tests are skipped if GEMINI_API_KEY is not available
Use for validation of real agent behavior
"""
import pytest
import os
from datetime import datetime

from src.services.router_agent import RouterAgent
from src.services.programmer_agent import ProgrammerAgent
from src.services.analyst_agent import AnalystMentorAgent
from src.models.tables import TrainingMethodology, Exercise


# Skip all tests in this module if no API key
pytestmark = pytest.mark.skipif(
    not os.getenv("GEMINI_API_KEY"),
    reason="GEMINI_API_KEY not set - skipping real API tests"
)


class TestRealRouterAgent:
    """Integration tests with real Router Agent"""

    @pytest.mark.asyncio
    async def test_real_router_classifies_technique_question(
        self, gemini_api_key, mock_db_session
    ):
        """Test real router agent classifies technique questions correctly"""
        router = RouterAgent(api_key=gemini_api_key, db_session=mock_db_session)

        result = await router.process(
            user_input={"message": "How can I improve my bench press lockout strength?"},
            context={"has_program": False, "methodology": None}
        )

        assert result["intent"] in ["technique_question", "general_chat"]
        assert result["confidence"] > 0.5
        assert "reasoning" in result
        assert router.should_route_to_analyst(result) or router.should_route_to_programmer(result)

    @pytest.mark.asyncio
    async def test_real_router_classifies_program_request(
        self, gemini_api_key, mock_db_session
    ):
        """Test real router identifies program generation requests"""
        router = RouterAgent(api_key=gemini_api_key, db_session=mock_db_session)

        result = await router.process(
            user_input={"message": "I need a new 12-week powerlifting program"},
            context={"has_program": False, "methodology": None}
        )

        assert result["intent"] == "program_generation"
        assert result["confidence"] > 0.7
        assert router.should_route_to_programmer(result)

    @pytest.mark.asyncio
    async def test_real_router_classifies_adjustment_request(
        self, gemini_api_key, mock_db_session
    ):
        """Test real router identifies program adjustment requests"""
        router = RouterAgent(api_key=gemini_api_key, db_session=mock_db_session)

        result = await router.process(
            user_input={"message": "This workout is too hard, can we reduce the volume?"},
            context={"has_program": True, "methodology": "westside"}
        )

        assert result["intent"] in ["program_adjustment", "general_chat"]
        assert "reasoning" in result


class TestRealAnalystAgent:
    """Integration tests with real Analyst/Mentor Agent"""

    @pytest.mark.asyncio
    async def test_real_analyst_provides_technique_advice(
        self, gemini_api_key, mock_db_session, sample_extended_profile
    ):
        """Test real analyst provides helpful technique advice"""
        analyst = AnalystMentorAgent(api_key=gemini_api_key, db_session=mock_db_session)

        # Mock the methodology knowledge loading
        from unittest.mock import AsyncMock, patch
        with patch.object(analyst, '_load_methodology_knowledge', return_value={
            "methodology_name": "Westside Conjugate",
            "knowledge_base": {
                "quote": "Special exercises cure special weaknesses - Louie Simmons"
            }
        }):
            result = await analyst.process(
                user_input={"message": "How do I improve my deadlift off the floor?"},
                context={"profile": sample_extended_profile}
            )

        assert result["agent_type"] == "analyst_mentor"
        assert len(result["response"]) > 50
        # Response should be helpful and relevant
        assert any(word in result["response"].lower() for word in [
            "deficit", "floor", "strength", "position", "pull", "deadlift"
        ])

    @pytest.mark.asyncio
    async def test_real_analyst_provides_motivation(
        self, gemini_api_key, mock_db_session, sample_extended_profile
    ):
        """Test real analyst provides motivational support"""
        analyst = AnalystMentorAgent(api_key=gemini_api_key, db_session=mock_db_session)

        from unittest.mock import patch
        with patch.object(analyst, '_load_methodology_knowledge', return_value={
            "methodology_name": "General Powerlifting",
            "knowledge_base": {}
        }):
            result = await analyst.process(
                user_input={"message": "I just missed my competition squat attempt and feel terrible"},
                context={"profile": sample_extended_profile}
            )

        assert result["agent_type"] == "analyst_mentor"
        assert len(result["response"]) > 30
        # Should contain encouraging/supportive language
        response_lower = result["response"].lower()
        assert any(word in response_lower for word in [
            "learn", "progress", "next", "improve", "grow", "opportunity"
        ])

    @pytest.mark.asyncio
    async def test_real_analyst_enforces_read_only(
        self, gemini_api_key, mock_db_session, sample_extended_profile
    ):
        """Test real analyst doesn't modify programs (read-only)"""
        analyst = AnalystMentorAgent(api_key=gemini_api_key, db_session=mock_db_session)

        from unittest.mock import patch
        with patch.object(analyst, '_load_methodology_knowledge', return_value={
            "methodology_name": "Sheiko",
            "knowledge_base": {}
        }):
            result = await analyst.process(
                user_input={"message": "Can you change my program to add more squats?"},
                context={"profile": sample_extended_profile}
            )

        response_lower = result["response"].lower()
        # Should redirect or explain can't modify
        assert any(phrase in response_lower for phrase in [
            "cannot", "can't", "unable", "feedback", "adjust", "contact"
        ]) or "modify" not in response_lower


class TestRealProgrammerAgent:
    """Integration tests with real Programmer Agent"""

    @pytest.mark.asyncio
    async def test_real_programmer_generates_valid_program(
        self, gemini_api_key, test_session, sample_extended_profile
    ):
        """Test real programmer generates a valid program structure"""
        # Seed methodology
        methodology = TrainingMethodology(
            id="test_linear",
            name="Linear Progression",
            description="Simple progressive overload for beginners",
            category="novice",
            system_prompt_template="""You are an expert powerlifting coach specializing in Linear Progression.

Generate programs following these principles:
- Simple, consistent progression
- 3-5 sets of 5 reps for main lifts
- Add 2.5-5lbs per session for upper body, 5-10lbs for lower body
- Include assistance work for balanced development""",
            programming_rules={
                "sets": "3-5",
                "reps": "5",
                "progression": "weekly_linear",
                "deload": "every_4_weeks"
            },
            knowledge_base={
                "principle": "Progressive overload is key",
                "quote": "Linear progression works until it doesn't"
            },
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        test_session.add(methodology)

        # Seed exercises
        exercises = [
            Exercise(
                id="squat",
                name="Back Squat",
                category="squat",
                variation_type="competition",
                equipment=["barbell", "rack"],
                targets_weak_points=["overall_strength"],
                movement_pattern="squat",
                complexity="beginner",
                coaching_cues="Chest up, knees out",
                created_at=datetime.utcnow(),
            ),
            Exercise(
                id="bench",
                name="Bench Press",
                category="bench",
                variation_type="competition",
                equipment=["barbell", "bench"],
                targets_weak_points=["overall_strength"],
                movement_pattern="horizontal_push",
                complexity="beginner",
                coaching_cues="Retract scapula, leg drive",
                created_at=datetime.utcnow(),
            ),
            Exercise(
                id="deadlift",
                name="Deadlift",
                category="deadlift",
                variation_type="competition",
                equipment=["barbell"],
                targets_weak_points=["overall_strength"],
                movement_pattern="hinge",
                complexity="beginner",
                coaching_cues="Brace core, push floor",
                created_at=datetime.utcnow(),
            ),
        ]
        for ex in exercises:
            test_session.add(ex)

        await test_session.commit()

        # Create programmer and generate
        programmer = ProgrammerAgent(api_key=gemini_api_key, db_session=test_session)

        profile = sample_extended_profile.copy()
        profile["methodologyId"] = "test_linear"
        profile["trainingAge"] = "novice"

        result = await programmer.process(
            user_input={},
            context={
                "profile": profile,
                "request": {
                    "goal": "strength_block",
                    "weeks": 4,
                    "daysPerWeek": 3,
                    "limitations": [],
                    "focusAreas": []
                }
            }
        )

        # Validate structure
        assert "program" in result
        program = result["program"]
        assert hasattr(program, "weeks")
        assert len(program.weeks) == 4
        # Should have sessions
        assert len(program.weeks[0].sessions) > 0


class TestRealEndToEnd:
    """Real E2E tests with actual API calls"""

    @pytest.mark.asyncio
    async def test_real_e2e_technique_question_flow(
        self, gemini_api_key, mock_db_session, sample_extended_profile
    ):
        """Test complete flow: Router → Analyst with real API"""
        # Step 1: Router classifies
        router = RouterAgent(api_key=gemini_api_key, db_session=mock_db_session)
        classification = await router.process(
            user_input={"message": "What exercises help with squat depth?"},
            context={"has_program": False, "methodology": None}
        )

        assert classification["intent"] in ["technique_question", "general_chat"]

        # Step 2: Route to analyst
        if router.should_route_to_analyst(classification):
            analyst = AnalystMentorAgent(api_key=gemini_api_key, db_session=mock_db_session)

            from unittest.mock import patch
            with patch.object(analyst, '_load_methodology_knowledge', return_value={
                "methodology_name": "General Powerlifting",
                "knowledge_base": {}
            }):
                analyst_result = await analyst.process(
                    user_input={"message": "What exercises help with squat depth?"},
                    context={"profile": sample_extended_profile}
                )

            assert analyst_result["agent_type"] == "analyst_mentor"
            assert len(analyst_result["response"]) > 40


class TestRealAgentResilience:
    """Test real agents handle edge cases gracefully"""

    @pytest.mark.asyncio
    async def test_real_router_handles_ambiguous_input(
        self, gemini_api_key, mock_db_session
    ):
        """Test router handles unclear messages"""
        router = RouterAgent(api_key=gemini_api_key, db_session=mock_db_session)

        result = await router.process(
            user_input={"message": "hmm"},
            context={"has_program": False, "methodology": None}
        )

        # Should still return valid structure
        assert "intent" in result
        assert "confidence" in result
        # Likely low confidence or general_chat
        assert result["confidence"] < 0.8 or result["intent"] == "general_chat"

    @pytest.mark.asyncio
    async def test_real_analyst_handles_complex_question(
        self, gemini_api_key, mock_db_session, sample_extended_profile
    ):
        """Test analyst handles multi-part complex questions"""
        analyst = AnalystMentorAgent(api_key=gemini_api_key, db_session=mock_db_session)

        from unittest.mock import patch
        with patch.object(analyst, '_load_methodology_knowledge', return_value={
            "methodology_name": "Westside",
            "knowledge_base": {}
        }):
            result = await analyst.process(
                user_input={
                    "message": "I have weak lockout on bench, tight hips limiting squat depth, "
                               "and my deadlift is slow off the floor. What should I prioritize?"
                },
                context={"profile": sample_extended_profile}
            )

        # Should handle complex question and provide structured advice
        assert len(result["response"]) > 100
        # Should mention at least one of the issues
        response_lower = result["response"].lower()
        assert any(word in response_lower for word in [
            "lockout", "bench", "hip", "squat", "deadlift", "floor", "prioritize"
        ])

    @pytest.mark.asyncio
    async def test_real_agents_respect_rate_limits(
        self, gemini_api_key, mock_db_session
    ):
        """Test agents handle rate limiting gracefully"""
        router = RouterAgent(
            api_key=gemini_api_key,
            db_session=mock_db_session,
            max_retries=2
        )

        # Make multiple quick requests
        messages = [
            "How do I squat?",
            "How do I bench?",
            "How do I deadlift?"
        ]

        results = []
        for msg in messages:
            try:
                result = await router.process(
                    user_input={"message": msg},
                    context={"has_program": False, "methodology": None}
                )
                results.append(result)
            except Exception as e:
                # If rate limited, should fail gracefully
                assert "rate" in str(e).lower() or "quota" in str(e).lower()

        # At least one should succeed
        assert len(results) > 0


class TestRealAPIQuality:
    """Tests for AI response quality with real API"""

    @pytest.mark.asyncio
    async def test_real_analyst_response_relevance(
        self, gemini_api_key, mock_db_session, sample_extended_profile
    ):
        """Test analyst provides relevant, on-topic responses"""
        analyst = AnalystMentorAgent(api_key=gemini_api_key, db_session=mock_db_session)

        questions = [
            ("How do I increase my squat?", ["squat", "strength", "training", "volume"]),
            ("My lower back hurts after deadlifts", ["back", "form", "position", "pain"]),
            ("What's the best accessory for bench?", ["bench", "accessory", "tricep", "shoulder"]),
        ]

        from unittest.mock import patch
        for question, expected_keywords in questions:
            with patch.object(analyst, '_load_methodology_knowledge', return_value={
                "methodology_name": "General",
                "knowledge_base": {}
            }):
                result = await analyst.process(
                    user_input={"message": question},
                    context={"profile": sample_extended_profile}
                )

            response_lower = result["response"].lower()
            # Should mention at least one expected keyword
            assert any(keyword in response_lower for keyword in expected_keywords), \
                f"Response not relevant to '{question}'"
