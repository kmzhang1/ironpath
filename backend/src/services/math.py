"""
Powerlifting Mathematics Utilities
Implements RPE calculations and DOTS scoring formula
"""
from typing import Literal, Optional


# ============================================================================
# RPE to Percentage Chart (Tuscherer's RTS Scale)
# ============================================================================

RPE_CHART: dict[float, dict[int, float]] = {
    10.0: {1: 100.0, 2: 95.5, 3: 92.2, 4: 89.2, 5: 86.3, 6: 83.7, 7: 81.1, 8: 78.6, 9: 76.2, 10: 74.0},
    9.5: {1: 97.8, 2: 93.9, 3: 90.7, 4: 87.8, 5: 85.0, 6: 82.4, 7: 79.9, 8: 77.4, 9: 75.1, 10: 72.9},
    9.0: {1: 95.5, 2: 92.2, 3: 89.2, 4: 86.3, 5: 83.7, 6: 81.1, 7: 78.6, 8: 76.2, 9: 74.0, 10: 71.8},
    8.5: {1: 93.9, 2: 90.7, 3: 87.8, 4: 85.0, 5: 82.4, 6: 79.9, 7: 77.4, 8: 75.1, 9: 72.9, 10: 70.7},
    8.0: {1: 92.2, 2: 89.2, 3: 86.3, 4: 83.7, 5: 81.1, 6: 78.6, 7: 76.2, 8: 74.0, 9: 71.8, 10: 69.7},
    7.5: {1: 90.7, 2: 87.8, 3: 85.0, 4: 82.4, 5: 79.9, 6: 77.4, 7: 75.1, 8: 72.9, 9: 70.7, 10: 68.6},
    7.0: {1: 89.2, 2: 86.3, 3: 83.7, 4: 81.1, 5: 78.6, 6: 76.2, 7: 74.0, 8: 71.8, 9: 69.7, 10: 67.6},
    6.5: {1: 87.8, 2: 85.0, 3: 82.4, 4: 79.9, 5: 77.4, 6: 75.1, 7: 72.9, 8: 70.7, 9: 68.6, 10: 66.6},
    6.0: {1: 86.3, 2: 83.7, 3: 81.1, 4: 78.6, 5: 76.2, 6: 74.0, 7: 71.8, 8: 69.7, 9: 67.6, 10: 65.6},
}


def calculate_one_rep_max(weight: float, reps: int, rpe: float) -> float:
    """
    Calculate estimated 1RM from weight, reps, and RPE.

    Args:
        weight: Weight lifted (in any unit)
        reps: Number of reps performed (1-10)
        rpe: RPE rating (6.0-10.0)

    Returns:
        Estimated 1RM in same unit as input weight

    Example:
        >>> calculate_one_rep_max(225, 5, 8.0)
        278  # If you did 225lbs for 5 reps @ RPE 8, your 1RM is ~278lbs
    """
    # Clamp values to valid ranges
    clamped_reps = max(1, min(reps, 10))
    clamped_rpe = max(6.0, min(rpe, 10.0))

    # Round RPE to nearest 0.5
    rounded_rpe = round(clamped_rpe * 2) / 2

    # Get percentage from chart (fallback to 75% if not found)
    percentage = RPE_CHART.get(rounded_rpe, {}).get(clamped_reps, 75.0)

    # Calculate 1RM: weight / percentage * 100
    estimated_1rm = (weight / percentage) * 100

    return round(estimated_1rm)


def calculate_working_weight(one_rep_max: float, reps: int, rpe: float) -> float:
    """
    Calculate working weight from 1RM, reps, and RPE.
    Used by AI to prescribe loads in programs.

    Args:
        one_rep_max: Athlete's 1RM (in any unit)
        reps: Target number of reps (1-10)
        rpe: Target RPE (6.0-10.0)

    Returns:
        Working weight in same unit as 1RM

    Example:
        >>> calculate_working_weight(400, 5, 8.0)
        324  # For 5 reps @ RPE 8 with 400lb 1RM, use 324lbs
    """
    # Clamp values to valid ranges
    clamped_reps = max(1, min(reps, 10))
    clamped_rpe = max(6.0, min(rpe, 10.0))

    # Round RPE to nearest 0.5
    rounded_rpe = round(clamped_rpe * 2) / 2

    # Get percentage from chart (fallback to 75% if not found)
    percentage = RPE_CHART.get(rounded_rpe, {}).get(clamped_reps, 75.0)

    # Calculate working weight: 1RM * percentage / 100
    working_weight = (one_rep_max * percentage) / 100

    return round(working_weight)


# ============================================================================
# DOTS Score Calculation (IPF Formula)
# ============================================================================

# DOTS Coefficients by sex
DOTS_COEFFICIENTS = {
    "male": {
        "a": -0.0000010930,
        "b": 0.0007391293,
        "c": -0.1918759221,
        "d": 24.0900756,
        "e": -307.75076,
    },
    "female": {
        "a": -0.0000010706,
        "b": 0.0005158568,
        "c": -0.1126655495,
        "d": 13.6175032,
        "e": -57.96288,
    },
}


def calculate_dots(
    bodyweight: float,
    total: float,
    sex: Literal["male", "female"],
    unit: Literal["kg", "lbs"] = "kg"
) -> float:
    """
    Calculate DOTS score using IPF formula.
    DOTS is used to compare relative strength across different bodyweights.

    Formula: DOTS = (Total / Denominator) * 500
    Where Denominator = Ax^4 + Bx^3 + Cx^2 + Dx + E
    And x = bodyweight in kg

    Args:
        bodyweight: Lifter's bodyweight
        total: Combined total of Squat + Bench + Deadlift
        sex: Lifter's sex ("male" or "female")
        unit: Unit of measurement ("kg" or "lbs")

    Returns:
        DOTS score (rounded to 2 decimal places)

    Example:
        >>> calculate_dots(75, 430, "male", "kg")
        355.42  # 75kg lifter with 430kg total = 355.42 DOTS
    """
    # Convert to kg if needed
    bw_kg = bodyweight * 0.453592 if unit == "lbs" else bodyweight
    total_kg = total * 0.453592 if unit == "lbs" else total

    # Get coefficients for sex
    coeff = DOTS_COEFFICIENTS[sex]

    # Calculate polynomial denominator
    denominator = (
        coeff["a"] * (bw_kg ** 4) +
        coeff["b"] * (bw_kg ** 3) +
        coeff["c"] * (bw_kg ** 2) +
        coeff["d"] * bw_kg +
        coeff["e"]
    )

    # Prevent division by zero (should never happen with realistic human weights)
    if abs(denominator) < 1e-10:
        return 0.0

    # Calculate DOTS score
    dots = (total_kg / denominator) * 500

    return round(dots, 2)


# ============================================================================
# Exercise Matching Utilities
# ============================================================================

def match_exercise_to_lift(exercise_name: str) -> Optional[Literal["squat", "bench", "deadlift"]]:
    """
    Match an exercise name to its main lift category.
    Handles variations like "Pause Squat", "Close Grip Bench Press", etc.

    Args:
        exercise_name: Name of the exercise

    Returns:
        Main lift category or None if no match

    Examples:
        >>> match_exercise_to_lift("Competition Squat")
        'squat'
        >>> match_exercise_to_lift("Close Grip Bench Press")
        'bench'
        >>> match_exercise_to_lift("Romanian Deadlift")
        'deadlift'
        >>> match_exercise_to_lift("Leg Press")
        None
    """
    name = exercise_name.lower()

    # Squat variations
    squat_keywords = [
        "squat", "front squat", "box squat", "pause squat",
        "tempo squat", "pin squat", "safety bar", "ssb"
    ]
    if any(keyword in name for keyword in squat_keywords):
        return "squat"

    # Bench variations
    bench_keywords = [
        "bench", "close grip", "wide grip", "pause bench",
        "spoto", "floor press"
    ]
    if any(keyword in name for keyword in bench_keywords):
        return "bench"

    # Deadlift variations
    deadlift_keywords = [
        "deadlift", "dead lift", "deficit pull", "block pull",
        "rack pull", "romanian", "rdl", "stiff leg", "sumo"
    ]
    if any(keyword in name for keyword in deadlift_keywords):
        return "deadlift"

    return None


# ============================================================================
# Weight Conversion
# ============================================================================

def convert_weight(weight: float, from_unit: Literal["kg", "lbs"], to_unit: Literal["kg", "lbs"]) -> float:
    """
    Convert weight between kg and lbs.

    Args:
        weight: Weight value
        from_unit: Source unit
        to_unit: Target unit

    Returns:
        Converted weight (rounded to 1 decimal place)
    """
    if from_unit == to_unit:
        return weight

    if from_unit == "kg" and to_unit == "lbs":
        return round(weight * 2.20462, 1)

    if from_unit == "lbs" and to_unit == "kg":
        return round(weight * 0.453592, 1)

    return weight
