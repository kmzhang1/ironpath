"""
Seed exercise library into the database
Run with: python -m src.seed_exercises
"""
import asyncio
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import engine, AsyncSessionLocal
from src.models.tables import Base, Exercise


EXERCISES = [
    # SQUAT VARIATIONS (15 exercises)
    {
        "id": "competition_squat",
        "name": "Competition Squat",
        "category": "squat",
        "variation_type": "competition",
        "equipment": ["barbell", "rack"],
        "targets_weak_points": ["overall"],
        "movement_pattern": "bilateral_squat",
        "complexity": "beginner",
        "coaching_cues": "Big breath, brace core, break at hips and knees simultaneously"
    },
    {
        "id": "pause_squat",
        "name": "Pause Squat",
        "category": "squat",
        "variation_type": "pause",
        "equipment": ["barbell", "rack"],
        "targets_weak_points": ["hole", "positioning"],
        "movement_pattern": "bilateral_squat",
        "complexity": "intermediate",
        "coaching_cues": "2-3 second pause at bottom, stay tight, drive through heels"
    },
    {
        "id": "box_squat",
        "name": "Box Squat",
        "category": "squat",
        "variation_type": "box",
        "equipment": ["barbell", "rack", "box"],
        "targets_weak_points": ["hole", "explosiveness"],
        "movement_pattern": "bilateral_squat",
        "complexity": "intermediate",
        "coaching_cues": "Sit back to box, brief pause, explode up"
    },
    {
        "id": "front_squat",
        "name": "Front Squat",
        "category": "squat",
        "variation_type": "front",
        "equipment": ["barbell", "rack"],
        "targets_weak_points": ["quad_strength", "positioning"],
        "movement_pattern": "bilateral_squat",
        "complexity": "intermediate",
        "coaching_cues": "Elbows high, chest up, vertical torso"
    },
    {
        "id": "safety_bar_squat",
        "name": "Safety Bar Squat",
        "category": "squat",
        "variation_type": "specialty_bar",
        "equipment": ["specialty_bar", "rack"],
        "targets_weak_points": ["quad_strength"],
        "movement_pattern": "bilateral_squat",
        "complexity": "beginner",
        "coaching_cues": "Bar sits on shoulders, hands free or light grip"
    },
    {
        "id": "high_bar_squat",
        "name": "High Bar Squat",
        "category": "squat",
        "variation_type": "high_bar",
        "equipment": ["barbell", "rack"],
        "targets_weak_points": ["quad_strength", "depth"],
        "movement_pattern": "bilateral_squat",
        "complexity": "beginner",
        "coaching_cues": "Bar on traps, more upright torso, deeper ROM"
    },
    {
        "id": "tempo_squat",
        "name": "Tempo Squat (3-0-3)",
        "category": "squat",
        "variation_type": "tempo",
        "equipment": ["barbell", "rack"],
        "targets_weak_points": ["positioning", "control"],
        "movement_pattern": "bilateral_squat",
        "complexity": "intermediate",
        "coaching_cues": "3 seconds down, no pause, 3 seconds up"
    },
    {
        "id": "pin_squat",
        "name": "Pin Squat",
        "category": "squat",
        "variation_type": "pin",
        "equipment": ["barbell", "rack"],
        "targets_weak_points": ["hole", "explosiveness"],
        "movement_pattern": "bilateral_squat",
        "complexity": "intermediate",
        "coaching_cues": "Start from dead stop on pins, explode up"
    },
    {
        "id": "belt_squat",
        "name": "Belt Squat",
        "category": "squat",
        "variation_type": "belt",
        "equipment": ["belt_squat_machine"],
        "targets_weak_points": ["quad_strength"],
        "movement_pattern": "bilateral_squat",
        "complexity": "beginner",
        "coaching_cues": "Removes spinal loading, high volume work"
    },
    {
        "id": "bulgarian_split_squat",
        "name": "Bulgarian Split Squat",
        "category": "squat",
        "variation_type": "unilateral",
        "equipment": ["dumbbells", "bench"],
        "targets_weak_points": ["quad_strength", "balance"],
        "movement_pattern": "unilateral_squat",
        "complexity": "intermediate",
        "coaching_cues": "Rear foot elevated, front shin vertical, drive through heel"
    },

    # BENCH VARIATIONS (12 exercises)
    {
        "id": "competition_bench",
        "name": "Competition Bench Press",
        "category": "bench",
        "variation_type": "competition",
        "equipment": ["barbell", "bench"],
        "targets_weak_points": ["overall"],
        "movement_pattern": "horizontal_push",
        "complexity": "beginner",
        "coaching_cues": "Arch, leg drive, touch chest, press to lockout"
    },
    {
        "id": "pause_bench",
        "name": "Pause Bench Press",
        "category": "bench",
        "variation_type": "pause",
        "equipment": ["barbell", "bench"],
        "targets_weak_points": ["off_chest"],
        "movement_pattern": "horizontal_push",
        "complexity": "intermediate",
        "coaching_cues": "2 second pause on chest, stay tight, explode up"
    },
    {
        "id": "close_grip_bench",
        "name": "Close Grip Bench Press",
        "category": "bench",
        "variation_type": "close_grip",
        "equipment": ["barbell", "bench"],
        "targets_weak_points": ["lockout", "triceps"],
        "movement_pattern": "horizontal_push",
        "complexity": "beginner",
        "coaching_cues": "Hands inside shoulder width, elbows tucked"
    },
    {
        "id": "floor_press",
        "name": "Floor Press",
        "category": "bench",
        "variation_type": "floor",
        "equipment": ["barbell", "rack"],
        "targets_weak_points": ["lockout"],
        "movement_pattern": "horizontal_push",
        "complexity": "intermediate",
        "coaching_cues": "Lie on floor, pause when triceps touch ground"
    },
    {
        "id": "board_press_2",
        "name": "2-Board Press",
        "category": "bench",
        "variation_type": "board",
        "equipment": ["barbell", "bench", "boards"],
        "targets_weak_points": ["lockout"],
        "movement_pattern": "horizontal_push",
        "complexity": "advanced",
        "coaching_cues": "Bar touches boards 2 inches off chest, overload lockout"
    },
    {
        "id": "incline_bench",
        "name": "Incline Bench Press",
        "category": "bench",
        "variation_type": "incline",
        "equipment": ["barbell", "bench"],
        "targets_weak_points": ["upper_chest"],
        "movement_pattern": "incline_push",
        "complexity": "beginner",
        "coaching_cues": "30-45 degree angle, touch upper chest"
    },
    {
        "id": "spoto_press",
        "name": "Spoto Press",
        "category": "bench",
        "variation_type": "pause",
        "equipment": ["barbell", "bench"],
        "targets_weak_points": ["off_chest", "control"],
        "movement_pattern": "horizontal_push",
        "complexity": "advanced",
        "coaching_cues": "Pause 1 inch off chest, no touch, maximum tension"
    },
    {
        "id": "dumbbell_bench",
        "name": "Dumbbell Bench Press",
        "category": "bench",
        "variation_type": "dumbbell",
        "equipment": ["dumbbells", "bench"],
        "targets_weak_points": ["overall", "stability"],
        "movement_pattern": "horizontal_push",
        "complexity": "beginner",
        "coaching_cues": "Greater ROM than barbell, control the dumbbells"
    },

    # DEADLIFT VARIATIONS (13 exercises)
    {
        "id": "competition_deadlift",
        "name": "Competition Deadlift",
        "category": "deadlift",
        "variation_type": "competition",
        "equipment": ["barbell"],
        "targets_weak_points": ["overall"],
        "movement_pattern": "hip_hinge",
        "complexity": "intermediate",
        "coaching_cues": "Brace, grip floor with feet, push floor away"
    },
    {
        "id": "sumo_deadlift",
        "name": "Sumo Deadlift",
        "category": "deadlift",
        "variation_type": "sumo",
        "equipment": ["barbell"],
        "targets_weak_points": ["lockout"],
        "movement_pattern": "hip_hinge",
        "complexity": "intermediate",
        "coaching_cues": "Wide stance, open hips, vertical torso, pull slack out"
    },
    {
        "id": "deficit_deadlift",
        "name": "Deficit Deadlift",
        "category": "deadlift",
        "variation_type": "deficit",
        "equipment": ["barbell", "plates"],
        "targets_weak_points": ["off_floor", "starting_strength"],
        "movement_pattern": "hip_hinge",
        "complexity": "advanced",
        "coaching_cues": "Stand on 1-3 inch platform, increased ROM"
    },
    {
        "id": "rack_pull",
        "name": "Rack Pull",
        "category": "deadlift",
        "variation_type": "partial",
        "equipment": ["barbell", "rack"],
        "targets_weak_points": ["lockout"],
        "movement_pattern": "hip_hinge",
        "complexity": "beginner",
        "coaching_cues": "Pull from knee height, overload lockout"
    },
    {
        "id": "romanian_deadlift",
        "name": "Romanian Deadlift",
        "category": "deadlift",
        "variation_type": "romanian",
        "equipment": ["barbell"],
        "targets_weak_points": ["hamstrings", "positioning"],
        "movement_pattern": "hip_hinge",
        "complexity": "beginner",
        "coaching_cues": "Start from top, push hips back, slight knee bend, feel hamstring stretch"
    },
    {
        "id": "snatch_grip_deadlift",
        "name": "Snatch Grip Deadlift",
        "category": "deadlift",
        "variation_type": "wide_grip",
        "equipment": ["barbell"],
        "targets_weak_points": ["off_floor", "upper_back"],
        "movement_pattern": "hip_hinge",
        "complexity": "intermediate",
        "coaching_cues": "Wide grip, increased ROM, upper back engagement"
    },
    {
        "id": "paused_deadlift",
        "name": "Paused Deadlift",
        "category": "deadlift",
        "variation_type": "pause",
        "equipment": ["barbell"],
        "targets_weak_points": ["off_floor", "positioning"],
        "movement_pattern": "hip_hinge",
        "complexity": "advanced",
        "coaching_cues": "Pause at shin height, maintain position, continue pull"
    },
    {
        "id": "block_pull",
        "name": "Block Pull",
        "category": "deadlift",
        "variation_type": "partial",
        "equipment": ["barbell", "blocks"],
        "targets_weak_points": ["lockout"],
        "movement_pattern": "hip_hinge",
        "complexity": "beginner",
        "coaching_cues": "Pull from 2-4 inch blocks, reduced ROM"
    },

    # ACCESSORIES (10 exercises)
    {
        "id": "good_morning",
        "name": "Good Morning",
        "category": "accessory",
        "variation_type": "hinge",
        "equipment": ["barbell"],
        "targets_weak_points": ["hamstrings", "lower_back"],
        "movement_pattern": "hip_hinge",
        "complexity": "intermediate",
        "coaching_cues": "Bar on back, push hips back, minimal knee bend"
    },
    {
        "id": "barbell_row",
        "name": "Barbell Row",
        "category": "accessory",
        "variation_type": "row",
        "equipment": ["barbell"],
        "targets_weak_points": ["upper_back"],
        "movement_pattern": "horizontal_pull",
        "complexity": "beginner",
        "coaching_cues": "Pull to lower chest, control eccentric, squeeze shoulder blades"
    },
    {
        "id": "lat_pulldown",
        "name": "Lat Pulldown",
        "category": "accessory",
        "variation_type": "pulldown",
        "equipment": ["cable_machine"],
        "targets_weak_points": ["upper_back", "lats"],
        "movement_pattern": "vertical_pull",
        "complexity": "beginner",
        "coaching_cues": "Full stretch at top, pull to upper chest, control return"
    },
    {
        "id": "leg_press",
        "name": "Leg Press",
        "category": "accessory",
        "variation_type": "machine",
        "equipment": ["leg_press_machine"],
        "targets_weak_points": ["quad_strength"],
        "movement_pattern": "leg_press",
        "complexity": "beginner",
        "coaching_cues": "Feet shoulder width, full ROM, don't let knees cave"
    },
    {
        "id": "leg_curl",
        "name": "Leg Curl",
        "category": "accessory",
        "variation_type": "machine",
        "equipment": ["leg_curl_machine"],
        "targets_weak_points": ["hamstrings"],
        "movement_pattern": "leg_curl",
        "complexity": "beginner",
        "coaching_cues": "Controlled tempo, squeeze at top, full extension"
    },
    {
        "id": "tricep_pushdown",
        "name": "Tricep Pushdown",
        "category": "accessory",
        "variation_type": "cable",
        "equipment": ["cable_machine"],
        "targets_weak_points": ["lockout", "triceps"],
        "movement_pattern": "elbow_extension",
        "complexity": "beginner",
        "coaching_cues": "Elbows pinned to sides, full extension, control eccentric"
    },
    {
        "id": "overhead_press",
        "name": "Overhead Press",
        "category": "accessory",
        "variation_type": "press",
        "equipment": ["barbell"],
        "targets_weak_points": ["upper_chest", "shoulders"],
        "movement_pattern": "vertical_push",
        "complexity": "intermediate",
        "coaching_cues": "Bar path over head center, lock out overhead, brace core"
    },
    {
        "id": "dumbbell_row",
        "name": "Dumbbell Row",
        "category": "accessory",
        "variation_type": "row",
        "equipment": ["dumbbell", "bench"],
        "targets_weak_points": ["upper_back"],
        "movement_pattern": "horizontal_pull",
        "complexity": "beginner",
        "coaching_cues": "One knee on bench, pull to hip, control throughout"
    },
    {
        "id": "face_pull",
        "name": "Face Pull",
        "category": "accessory",
        "variation_type": "pull",
        "equipment": ["cable_machine"],
        "targets_weak_points": ["upper_back", "rear_delts"],
        "movement_pattern": "horizontal_pull",
        "complexity": "beginner",
        "coaching_cues": "Pull to face height, externally rotate shoulders, squeeze"
    },
    {
        "id": "plank",
        "name": "Plank",
        "category": "accessory",
        "variation_type": "core",
        "equipment": ["bodyweight"],
        "targets_weak_points": ["core_stability"],
        "movement_pattern": "isometric_hold",
        "complexity": "beginner",
        "coaching_cues": "Straight line from head to heels, brace core, breathe"
    }
]


async def seed_exercises():
    """Seed exercises into database"""
    if not engine:
        print("Error: Database engine not configured")
        return

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        for ex_data in EXERCISES:
            result = await session.execute(
                select(Exercise).where(Exercise.id == ex_data["id"])
            )
            existing = result.scalar_one_or_none()

            if existing:
                print(f"Exercise '{ex_data['name']}' already exists, skipping")
                continue

            exercise = Exercise(
                id=ex_data["id"],
                name=ex_data["name"],
                category=ex_data["category"],
                variation_type=ex_data["variation_type"],
                equipment=ex_data["equipment"],
                targets_weak_points=ex_data["targets_weak_points"],
                movement_pattern=ex_data["movement_pattern"],
                complexity=ex_data["complexity"],
                coaching_cues=ex_data["coaching_cues"],
                created_at=datetime.utcnow()
            )

            session.add(exercise)
            print(f"Created exercise: {ex_data['name']}")

        await session.commit()
        print(f"\nExercise seeding complete! Total: {len(EXERCISES)} exercises")


if __name__ == "__main__":
    asyncio.run(seed_exercises())
