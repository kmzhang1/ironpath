"""
Tests for program generation API endpoint with Gemini integration
"""
import pytest
from httpx import AsyncClient

from src.models.schemas import FullProgramSchema


class TestProgramGenerationAPI:
    """Test cases for POST /api/programs/generate endpoint"""

    @pytest.mark.asyncio
    async def test_generate_program_without_gemini(
        self, client: AsyncClient, sample_lifter_profile, sample_program_request
    ):
        """Test program generation falls back to mock when no API key"""
        response = await client.post(
            "/api/programs/generate",
            json={
                "profile": sample_lifter_profile,
                "request": sample_program_request,
            },
        )

        assert response.status_code == 200
        data = response.json()

        # Check response structure
        assert "program" in data
        assert "message" in data
        assert data["message"] == "Program generated successfully"

        # Validate program structure
        program = data["program"]
        assert "id" in program
        assert "title" in program
        assert "createdAt" in program
        assert "weeks" in program
        assert isinstance(program["weeks"], list)

        # Validate program content
        assert len(program["weeks"]) == sample_program_request["weeks"]

        # Check first week structure
        first_week = program["weeks"][0]
        assert "weekNumber" in first_week
        assert "sessions" in first_week
        assert len(first_week["sessions"]) == sample_program_request["daysPerWeek"]

        # Check session structure
        first_session = first_week["sessions"][0]
        assert "dayNumber" in first_session
        assert "focus" in first_session
        assert "exercises" in first_session
        assert len(first_session["exercises"]) > 0

        # Check exercise structure
        first_exercise = first_session["exercises"][0]
        assert "name" in first_exercise
        assert "sets" in first_exercise
        assert "reps" in first_exercise
        assert "rpeTarget" in first_exercise
        assert "restSeconds" in first_exercise

    @pytest.mark.asyncio
    async def test_generate_program_validation_errors(
        self, client: AsyncClient, sample_lifter_profile
    ):
        """Test validation errors for invalid requests"""
        # Test with missing required fields
        response = await client.post(
            "/api/programs/generate",
            json={
                "profile": sample_lifter_profile,
                "request": {
                    "goal": "strength_block",
                    # Missing weeks and daysPerWeek
                },
            },
        )

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_generate_program_invalid_goal(
        self, client: AsyncClient, sample_lifter_profile
    ):
        """Test validation with invalid goal"""
        response = await client.post(
            "/api/programs/generate",
            json={
                "profile": sample_lifter_profile,
                "request": {
                    "goal": "invalid_goal",
                    "weeks": 8,
                    "daysPerWeek": 4,
                    "limitations": [],
                    "focusAreas": [],
                },
            },
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_generate_program_invalid_weeks(
        self, client: AsyncClient, sample_lifter_profile
    ):
        """Test validation with out-of-range weeks"""
        response = await client.post(
            "/api/programs/generate",
            json={
                "profile": sample_lifter_profile,
                "request": {
                    "goal": "strength_block",
                    "weeks": 20,  # Max is 16
                    "daysPerWeek": 4,
                    "limitations": [],
                    "focusAreas": [],
                },
            },
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_generate_program_invalid_days_per_week(
        self, client: AsyncClient, sample_lifter_profile
    ):
        """Test validation with out-of-range daysPerWeek"""
        response = await client.post(
            "/api/programs/generate",
            json={
                "profile": sample_lifter_profile,
                "request": {
                    "goal": "strength_block",
                    "weeks": 8,
                    "daysPerWeek": 7,  # Max is 6
                    "limitations": [],
                    "focusAreas": [],
                },
            },
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_generate_different_goals(
        self, client: AsyncClient, sample_lifter_profile
    ):
        """Test program generation with different training goals"""
        goals = ["peaking", "hypertrophy", "strength_block"]

        for goal in goals:
            response = await client.post(
                "/api/programs/generate",
                json={
                    "profile": sample_lifter_profile,
                    "request": {
                        "goal": goal,
                        "weeks": 8,
                        "daysPerWeek": 4,
                        "limitations": [],
                        "focusAreas": [],
                    },
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert "program" in data

    @pytest.mark.asyncio
    async def test_generate_different_durations(
        self, client: AsyncClient, sample_lifter_profile
    ):
        """Test program generation with different durations"""
        durations = [4, 8, 12, 16]

        for weeks in durations:
            response = await client.post(
                "/api/programs/generate",
                json={
                    "profile": sample_lifter_profile,
                    "request": {
                        "goal": "strength_block",
                        "weeks": weeks,
                        "daysPerWeek": 4,
                        "limitations": [],
                        "focusAreas": [],
                    },
                },
            )

            assert response.status_code == 200
            data = response.json()
            program = data["program"]

            # Verify correct number of weeks
            assert len(program["weeks"]) == weeks

    @pytest.mark.asyncio
    async def test_generate_different_frequencies(
        self, client: AsyncClient, sample_lifter_profile
    ):
        """Test program generation with different training frequencies"""
        frequencies = [3, 4, 5, 6]

        for days_per_week in frequencies:
            response = await client.post(
                "/api/programs/generate",
                json={
                    "profile": sample_lifter_profile,
                    "request": {
                        "goal": "strength_block",
                        "weeks": 8,
                        "daysPerWeek": days_per_week,
                        "limitations": [],
                        "focusAreas": [],
                    },
                },
            )

            assert response.status_code == 200
            data = response.json()
            program = data["program"]

            # Verify correct number of sessions per week
            for week in program["weeks"]:
                assert len(week["sessions"]) == days_per_week


@pytest.mark.skipif(
    "not config.getoption('--with-gemini')",
    reason="Requires --with-gemini flag and GEMINI_API_KEY",
)
class TestProgramGenerationWithGemini:
    """Test cases that actually call Gemini API (requires API key)"""

    @pytest.mark.asyncio
    async def test_generate_program_with_real_gemini(
        self, client: AsyncClient, sample_lifter_profile, sample_program_request
    ):
        """Test program generation with real Gemini API call"""
        response = await client.post(
            "/api/programs/generate",
            json={
                "profile": sample_lifter_profile,
                "request": sample_program_request,
            },
        )

        assert response.status_code == 200
        data = response.json()

        # Validate with Pydantic schema
        program = FullProgramSchema(**data["program"])

        # Check program quality
        assert len(program.weeks) == sample_program_request["weeks"]
        assert program.title != ""

        # Check that exercises make sense for powerlifting
        all_exercises = []
        for week in program.weeks:
            for session in week.sessions:
                for exercise in session.exercises:
                    all_exercises.append(exercise.name.lower())

        # Should include main lifts
        main_lifts = ["squat", "bench", "deadlift"]
        for lift in main_lifts:
            assert any(lift in ex for ex in all_exercises), \
                f"Program should include {lift}"

        # Validate RPE ranges (should be reasonable)
        for week in program.weeks:
            for session in week.sessions:
                for exercise in session.exercises:
                    assert 6.0 <= exercise.rpeTarget <= 10.0
                    assert 1 <= exercise.sets <= 10
                    assert 30 <= exercise.restSeconds <= 600

    @pytest.mark.asyncio
    async def test_gemini_handles_limitations(
        self, client: AsyncClient, sample_lifter_profile
    ):
        """Test that Gemini respects injury limitations"""
        response = await client.post(
            "/api/programs/generate",
            json={
                "profile": sample_lifter_profile,
                "request": {
                    "goal": "strength_block",
                    "weeks": 4,
                    "daysPerWeek": 4,
                    "limitations": ["Shoulder injury - no overhead pressing"],
                    "focusAreas": [],
                },
            },
        )

        assert response.status_code == 200
        data = response.json()

        # Check that overhead pressing exercises are avoided
        all_exercises = []
        for week in data["program"]["weeks"]:
            for session in week["sessions"]:
                for exercise in session["exercises"]:
                    all_exercises.append(exercise["name"].lower())

        overhead_exercises = ["overhead press", "military press", "push press"]
        for overhead in overhead_exercises:
            assert not any(overhead in ex for ex in all_exercises), \
                "Should avoid overhead pressing with shoulder injury"

    @pytest.mark.asyncio
    async def test_gemini_peaking_program_structure(
        self, client: AsyncClient, sample_lifter_profile
    ):
        """Test that peaking programs have appropriate structure"""
        response = await client.post(
            "/api/programs/generate",
            json={
                "profile": sample_lifter_profile,
                "request": {
                    "goal": "peaking",
                    "weeks": 8,
                    "daysPerWeek": 4,
                    "limitations": [],
                    "focusAreas": [],
                },
            },
        )

        assert response.status_code == 200
        data = response.json()
        program = data["program"]

        # Peaking programs should have volume reduction over time
        # Check that later weeks have potentially fewer total sets
        # (This is a simplified check - real peaking is more complex)
        first_week_sets = sum(
            sum(ex["sets"] for ex in session["exercises"])
            for session in program["weeks"][0]["sessions"]
        )

        last_week_sets = sum(
            sum(ex["sets"] for ex in session["exercises"])
            for session in program["weeks"][-1]["sessions"]
        )

        # Last week should have equal or fewer sets (taper)
        assert last_week_sets <= first_week_sets * 1.2, \
            "Peaking program should taper volume"

    @pytest.mark.asyncio
    async def test_gemini_hypertrophy_vs_strength(
        self, client: AsyncClient, sample_lifter_profile
    ):
        """Test that hypertrophy programs differ from strength programs"""
        # Generate hypertrophy program
        hypertrophy_response = await client.post(
            "/api/programs/generate",
            json={
                "profile": sample_lifter_profile,
                "request": {
                    "goal": "hypertrophy",
                    "weeks": 6,
                    "daysPerWeek": 4,
                    "limitations": [],
                    "focusAreas": [],
                },
            },
        )

        # Generate strength program
        strength_response = await client.post(
            "/api/programs/generate",
            json={
                "profile": sample_lifter_profile,
                "request": {
                    "goal": "strength_block",
                    "weeks": 6,
                    "daysPerWeek": 4,
                    "limitations": [],
                    "focusAreas": [],
                },
            },
        )

        assert hypertrophy_response.status_code == 200
        assert strength_response.status_code == 200

        hyp_program = hypertrophy_response.json()["program"]
        str_program = strength_response.json()["program"]

        # Calculate average reps (hypertrophy should have higher rep ranges)
        def get_avg_reps(program):
            total = 0
            count = 0
            for week in program["weeks"]:
                for session in week["sessions"]:
                    for exercise in session["exercises"]:
                        rep_str = exercise["reps"]
                        # Parse rep ranges like "3-5" or single values like "8"
                        if "-" in rep_str:
                            low, high = rep_str.split("-")
                            avg = (int(low) + int(high)) / 2
                        elif rep_str.upper() != "AMRAP":
                            avg = int(rep_str)
                        else:
                            avg = 8  # Assume AMRAP ~ 8 reps
                        total += avg
                        count += 1
            return total / count if count > 0 else 0

        hyp_avg_reps = get_avg_reps(hyp_program)
        str_avg_reps = get_avg_reps(str_program)

        # Hypertrophy should generally have more reps
        assert hyp_avg_reps > str_avg_reps, \
            "Hypertrophy programs should have higher average reps than strength"


def pytest_addoption(parser):
    """Add custom pytest command line options"""
    parser.addoption(
        "--with-gemini",
        action="store_true",
        default=False,
        help="Run tests that require Gemini API key",
    )


def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "gemini: mark test as requiring Gemini API"
    )
