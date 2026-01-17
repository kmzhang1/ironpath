"""
AI Agents for workout feedback adjustment and check-in analysis
"""

import json
import logging
from typing import List, Tuple, Optional

from google import genai
from google.genai import types

from ..models.schemas import (
    LiftingSessionSchema,
    ExerciseSchema,
    FeedbackCategoryEnum,
    CheckInMetrics,
    FullProgramSchema,
)

logger = logging.getLogger(__name__)


class FeedbackAgent:
    """
    AI Agent for adjusting workouts based on user feedback.
    Analyzes feedback categories and text to intelligently modify exercises.
    """

    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash"):
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name

    def _build_adjustment_prompt(
        self,
        session: LiftingSessionSchema,
        categories: List[FeedbackCategoryEnum],
        feedback_text: Optional[str],
    ) -> str:
        """Build prompt for AI to adjust workout based on feedback."""

        categories_str = ", ".join([cat.value for cat in categories])

        prompt = f"""You are an expert powerlifting coach. A lifter has provided feedback about their upcoming workout.

**Current Workout:**
Focus: {session.focus}
Day: {session.dayNumber}

Exercises:
"""
        for i, ex in enumerate(session.exercises, 1):
            prompt += f"{i}. {ex.name}: {ex.sets}x{ex.reps} @ RPE {ex.rpeTarget} (rest: {ex.restSeconds}s)\n"
            if ex.notes:
                prompt += f"   Notes: {ex.notes}\n"

        prompt += f"\n**Feedback Categories:** {categories_str}\n"

        if feedback_text:
            prompt += f"**Additional Feedback:** {feedback_text}\n"

        prompt += """
**Your Task:**
Based on the feedback, adjust this workout to be appropriate while maintaining training progress.

Guidelines:
- For INJURY: Modify or remove problematic exercises, reduce intensity
- For MUSCLE_FATIGUE/EXCESSIVE_SORENESS: Reduce volume or intensity
- For LOW_ENERGY: Reduce volume, maintain or reduce intensity
- For SCHEDULE_CONFLICT: Suggest time-efficient alternatives
- For FEELING_STRONG: Consider slight increases if appropriate
- For OTHER: Use the feedback text to make appropriate adjustments

Return:
1. A JSON object with the adjusted session (same structure as input)
2. A clear explanation of why you made these adjustments

Format your response as:
```json
{
  "adjustedSession": {
    "dayNumber": <number>,
    "focus": "<string>",
    "exercises": [...]
  },
  "reason": "<explanation of adjustments>"
}
```
"""
        return prompt

    async def adjust_workout(
        self,
        original_session: LiftingSessionSchema,
        feedback_categories: List[FeedbackCategoryEnum],
        feedback_text: Optional[str] = None,
    ) -> Tuple[LiftingSessionSchema, str]:
        """
        Adjust workout based on user feedback.

        Args:
            original_session: The original planned session
            feedback_categories: List of feedback categories
            feedback_text: Optional detailed feedback text

        Returns:
            Tuple of (adjusted_session, adjustment_reason)
        """
        try:
            prompt = self._build_adjustment_prompt(
                original_session, feedback_categories, feedback_text
            )

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    response_mime_type="application/json",
                ),
            )

            if not response.text:
                raise ValueError("Empty response from AI")

            result = json.loads(response.text)
            adjusted_session = LiftingSessionSchema(**result["adjustedSession"])
            reason = result["reason"]

            logger.info(f"Successfully adjusted workout: {reason}")

            return adjusted_session, reason

        except Exception as e:
            logger.error(f"Failed to adjust workout: {e}", exc_info=True)
            # Fallback: return original session with note
            return original_session, f"Unable to adjust workout automatically: {str(e)}"


class CheckInAgent:
    """
    AI Agent for analyzing progress and generating check-in insights.
    """

    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash"):
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name

    def _build_check_in_prompt(
        self,
        check_in_type: str,
        metrics: CheckInMetrics,
        sessions: List[dict],
        current_program: dict,
        progress_history: dict,
    ) -> str:
        """Build prompt for check-in analysis."""

        prompt = f"""You are an expert powerlifting coach performing a {check_in_type} check-in with an athlete.

**Check-in Metrics:**
- Sessions Completed: {metrics.sessionsCompleted}/{metrics.sessionsPlanned}
- Adherence Rate: {metrics.adherenceRate:.1%}
"""
        if metrics.averageRPE:
            prompt += f"- Average RPE: {metrics.averageRPE:.1f}\n"

        prompt += f"\n**Completed Sessions This Period:** {len(sessions)}\n"

        if sessions:
            prompt += "\nSession Details:\n"
            for sess in sessions[:5]:  # Limit to 5 most recent
                prompt += (
                    f"- Week {sess.get('weekNumber')}, Day {sess.get('dayNumber')}"
                )
                if sess.get("completedAt"):
                    prompt += f" (completed: {sess['completedAt']})"
                if sess.get("feedback"):
                    feedback = sess["feedback"]
                    prompt += f"\n  Feedback: {feedback.get('categories', [])}"
                    if feedback.get("feedbackText"):
                        prompt += f" - {feedback['feedbackText']}"
                prompt += "\n"

        prompt += f"""
**Current Program:**
Title: {current_program.get('title', 'Unknown')}
Total Weeks: {len(current_program.get('weeks', []))}

**Your Task:**
Analyze this {check_in_type} progress and provide:

1. **Insights** (2-4 bullet points): Key observations about performance, adherence, recovery
2. **Recommendations** (2-4 bullet points): Specific actionable advice for the upcoming period
3. **Program Adjustments Needed** (boolean): Whether major changes to the program are required

If major adjustments ARE needed:
- Provide specific reasoning
- Consider: low adherence (<60%), consistent fatigue/injury feedback, or dramatic performance changes

If NO major adjustments needed:
- Continue with current program
- Small tweaks can be handled through daily feedback

Return JSON format:
```json
{{
  "insights": ["insight 1", "insight 2", ...],
  "recommendations": ["rec 1", "rec 2", ...],
  "programAdjustmentsNeeded": true/false,
  "adjustmentReason": "explanation if adjustments needed (null otherwise)"
}}
```
"""
        return prompt

    async def analyze_progress(
        self,
        check_in_type: str,
        metrics: CheckInMetrics,
        sessions: List[dict],
        current_program: dict,
        progress_history: dict,
    ) -> Tuple[List[str], List[str], bool, Optional[FullProgramSchema]]:
        """
        Analyze progress and generate insights.

        Args:
            check_in_type: 'daily' or 'weekly'
            metrics: Calculated metrics for the period
            sessions: Completed sessions in period
            current_program: Current training program
            progress_history: Full progress history

        Returns:
            Tuple of (insights, recommendations, adjustments_needed, adjusted_program)
        """
        try:
            prompt = self._build_check_in_prompt(
                check_in_type, metrics, sessions, current_program, progress_history
            )

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    response_mime_type="application/json",
                ),
            )

            if not response.text:
                raise ValueError("Empty response from AI")

            result = json.loads(response.text)

            insights = result.get("insights", [])
            recommendations = result.get("recommendations", [])
            adjustments_needed = result.get("programAdjustmentsNeeded", False)

            # For now, we don't regenerate the entire program
            # That would require calling the main program generation agent
            # This can be added as a future enhancement
            adjusted_program = None

            logger.info(
                f"Check-in analysis complete: {len(insights)} insights, "
                f"adjustments needed: {adjustments_needed}"
            )

            return insights, recommendations, adjustments_needed, adjusted_program

        except Exception as e:
            logger.error(f"Failed to analyze progress: {e}", exc_info=True)
            # Fallback insights
            return (
                [
                    f"Completed {metrics.sessionsCompleted} of {metrics.sessionsPlanned} sessions"
                ],
                ["Continue with your current program"],
                False,
                None,
            )
