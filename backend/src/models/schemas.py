"""
Pydantic models for API requests/responses and AI structured output
These match the TypeScript interfaces from the frontend
"""
from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


# ============================================================================
# Biometrics and Profile Schemas
# ============================================================================

class BiometricsSchema(BaseModel):
    """Biometric data for a lifter"""
    bodyweight: float = Field(..., gt=0, description="Bodyweight in kg or lbs")
    unit: Literal["kg", "lbs"] = Field(..., description="Unit of measurement")
    sex: Literal["male", "female"] = Field(..., description="Sex for DOTS calculation")
    age: int = Field(..., gt=0, lt=150, description="Age in years")


class OneRepMaxSchema(BaseModel):
    """One rep max values for main lifts"""
    squat: float = Field(..., gt=0, description="Squat 1RM")
    bench: float = Field(..., gt=0, description="Bench Press 1RM")
    deadlift: float = Field(..., gt=0, description="Deadlift 1RM")


class LifterProfileSchema(BaseModel):
    """Complete lifter profile matching frontend interface"""
    id: str
    name: str
    biometrics: BiometricsSchema
    oneRepMax: OneRepMaxSchema


# ============================================================================
# Program Generation Request/Response
# ============================================================================

class ProgramGenerationRequest(BaseModel):
    """Request to generate a new program"""
    goal: Literal["peaking", "hypertrophy", "strength_block"] = Field(
        ..., description="Primary training goal"
    )
    weeks: int = Field(..., ge=4, le=16, description="Program duration in weeks")
    daysPerWeek: int = Field(..., ge=3, le=6, description="Training days per week")
    limitations: List[str] = Field(
        default_factory=list, description="Physical limitations or injuries"
    )
    focusAreas: List[str] = Field(
        default_factory=list, description="Areas to emphasize in training"
    )


# ============================================================================
# AI-Generated Program Structure (for Gemini structured output)
# ============================================================================

class ExerciseSchema(BaseModel):
    """Single exercise in a training session"""
    name: str = Field(..., description="Exercise name (e.g., 'Squat', 'Pause Bench Press')")
    sets: int = Field(..., ge=1, le=10, description="Number of sets")
    reps: str = Field(..., description="Reps (can be '5', '3-5', or 'AMRAP')")
    rpeTarget: float = Field(..., ge=6.0, le=10.0, description="Target RPE (6-10)")
    restSeconds: int = Field(..., ge=30, le=600, description="Rest time in seconds")
    notes: Optional[str] = Field(None, description="Additional exercise notes")


class LiftingSessionSchema(BaseModel):
    """Single training day session"""
    dayNumber: int = Field(..., ge=1, le=7, description="Day number in week (1-7)")
    focus: str = Field(..., description="Session focus (e.g., 'Squat Volume')")
    exercises: List[ExerciseSchema] = Field(..., min_length=1, description="Exercises in session")


class ProgramMicrocycleSchema(BaseModel):
    """Single week of training"""
    weekNumber: int = Field(..., ge=1, description="Week number in program")
    sessions: List[LiftingSessionSchema] = Field(
        ..., min_length=1, description="Training sessions in week"
    )


class FullProgramSchema(BaseModel):
    """Complete generated program matching frontend FullProgram interface"""
    id: str = Field(..., description="Unique program ID")
    createdAt: str = Field(..., description="ISO 8601 timestamp")
    title: str = Field(..., description="Program title")
    weeks: List[ProgramMicrocycleSchema] = Field(..., min_length=1, description="Training weeks")


# ============================================================================
# API Response Models
# ============================================================================

class ProgramResponse(BaseModel):
    """Response for program generation"""
    program: FullProgramSchema
    message: str = "Program generated successfully"


class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str
    code: str
    details: Optional[dict] = None


# ============================================================================
# Database Response Models
# ============================================================================

class UserResponse(BaseModel):
    """User data response"""
    id: str
    name: str
    email: str
    picture: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProgramListItem(BaseModel):
    """Program list item for GET /programs"""
    id: str
    title: str
    created_at: datetime
    weeks_count: int

    class Config:
        from_attributes = True
