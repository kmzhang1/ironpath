"""
Seed training methodologies into the database
Run with: python -m src.seed_methodologies
"""
import asyncio
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import engine, AsyncSessionLocal
from src.models.tables import Base, TrainingMethodology


METHODOLOGIES = [
    {
        "id": "linear_progression",
        "name": "Linear Progression",
        "description": "Classic beginner program with weekly weight increases",
        "category": "beginner",
        "system_prompt_template": """You are a Linear Progression coach for novice lifters.

Your philosophy: Simple, consistent progression builds the foundation for long-term strength.

CORE PRINCIPLES:
- Weekly weight increases (2.5-5lbs upper body, 5-10lbs lower body)
- 3 training days per week
- Full body or A/B split
- Compound movements only
- Focus on form and consistency

Remember: Novices adapt quickly. Keep it simple and progressive.

Generate programs using ONLY exercises from the AVAILABLE EXERCISES list provided below.
Ensure workouts fit within the athlete's preferred session length.""",
        "programming_rules": {
            "frequency": "3x per week",
            "structure": "full_body or upper_lower",
            "progression": "weekly linear (2.5-5lbs)",
            "intensity": "75-85% 1RM",
            "volume": "3-5 sets of 5 reps",
            "deload": "when stalling 2-3 sessions"
        },
        "knowledge_base": {
            "quotes": [
                "Master the basics before adding complexity",
                "Consistency beats optimization for beginners"
            ],
            "weak_point_strategies": {
                "squat": "Add pause squats for bottom position",
                "bench": "Increase pressing frequency",
                "deadlift": "Focus on setup and bracing"
            }
        }
    },
    {
        "id": "westside_conjugate",
        "name": "Westside Conjugate",
        "description": "Max effort and dynamic effort training for advanced lifters",
        "category": "advanced",
        "system_prompt_template": """You are a Westside Barbell coach. You train lifters using the Conjugate Method.

Your philosophy: Special exercises cure special weaknesses. Attack weak points aggressively.

CORE PRINCIPLES:
- Max Effort day: Rotate main lift weekly, work up to 1-3RM
- Dynamic Effort day: Speed work with bands/chains (50-60% + accommodating resistance)
- Repetition Method: High-volume accessories (8-15 reps) targeting weak points
- 72-hour recovery between similar sessions

Remember Louie's wisdom: "If you don't have a weakness, you're not training hard enough."

Generate programs using ONLY exercises from the AVAILABLE EXERCISES list provided below.
Select variations that target the athlete's specific weak points.
Ensure workouts fit within the athlete's preferred session length.""",
        "programming_rules": {
            "frequency": "4x per week (2 lower, 2 upper)",
            "max_effort_rotation": "weekly (never repeat same movement 2 weeks in a row)",
            "dynamic_effort": "8-12 sets x 1-3 reps at 50-60% + bands/chains",
            "accessories": "3-5 exercises, 3-4 sets, 8-15 reps",
            "intensity_distribution": "ME day: 90-100%, DE day: 50-60%",
            "weak_point_focus": "rotate accessories every 3 weeks"
        },
        "knowledge_base": {
            "quotes": [
                "Special exercises cure special weaknesses - Louie Simmons",
                "You must be fast to be strong",
                "Train your weaknesses, compete with your strengths"
            ],
            "weak_point_strategies": {
                "lockout": "Board press, floor press, rack pulls",
                "off_chest": "Pause bench, dead bench",
                "hole": "Box squats, pause squats, front squats",
                "starting_strength": "Deficit deadlifts, snatch grip deadlifts"
            },
            "max_effort_exercises": {
                "squat": ["box squat", "safety bar squat", "front squat", "cambered bar squat"],
                "bench": ["floor press", "board press", "incline press", "close grip"],
                "deadlift": ["rack pull", "block pull", "deficit deadlift", "sumo stance"]
            }
        }
    },
    {
        "id": "daily_undulating",
        "name": "Daily Undulating Periodization (DUP)",
        "description": "High-frequency training with daily intensity and volume variation",
        "category": "intermediate",
        "system_prompt_template": """You are a DUP coach specializing in high-frequency training.

Your philosophy: Train each lift multiple times per week with varied intensities.

CORE PRINCIPLES:
- Squat, Bench, Deadlift trained 2-4x per week
- Daily variation: Heavy day (3-5 reps), Moderate day (6-8 reps), Light day (10-12 reps)
- Auto-regulate based on RPE and readiness
- Volume and intensity wave throughout the week

Remember: Variety in the same week prevents accommodation and staleness.

Generate programs using ONLY exercises from the AVAILABLE EXERCISES list provided below.
Vary exercise selection across different intensity days to maintain variety.
Ensure workouts fit within the athlete's preferred session length.""",
        "programming_rules": {
            "frequency": "4-6x per week",
            "lift_frequency": "each main lift 2-4x per week",
            "intensity_rotation": "heavy (85-90%), moderate (75-80%), light (65-70%)",
            "rep_schemes": "heavy: 3-5, moderate: 6-8, light: 10-12",
            "volume_per_session": "3-6 sets per main lift",
            "accessories": "2-3 exercises, moderate volume"
        },
        "knowledge_base": {
            "quotes": [
                "Frequency is the most underutilized variable",
                "Practice makes perfect - train movements often"
            ],
            "weak_point_strategies": {
                "lockout": "Add heavy lockout variations on heavy day",
                "off_chest": "Pause variations on moderate day",
                "hole": "High-bar or front squat on light day",
                "speed": "Emphasize bar velocity on light day"
            },
            "session_structure": {
                "monday": "Heavy squat, Moderate bench",
                "wednesday": "Moderate squat, Heavy deadlift",
                "friday": "Light squat, Light bench, accessories"
            }
        }
    }
]


async def seed_methodologies():
    """Seed methodologies into database"""
    if not engine:
        print("Error: Database engine not configured")
        return

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        for method_data in METHODOLOGIES:
            result = await session.execute(
                select(TrainingMethodology).where(
                    TrainingMethodology.id == method_data["id"]
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                print(f"Methodology '{method_data['name']}' already exists, skipping")
                continue

            methodology = TrainingMethodology(
                id=method_data["id"],
                name=method_data["name"],
                description=method_data["description"],
                category=method_data["category"],
                system_prompt_template=method_data["system_prompt_template"],
                programming_rules=method_data["programming_rules"],
                knowledge_base=method_data["knowledge_base"],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            session.add(methodology)
            print(f"Created methodology: {method_data['name']}")

        await session.commit()
        print("\nMethodology seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed_methodologies())
