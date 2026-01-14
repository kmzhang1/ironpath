"""
Combined request models for API endpoints
"""
from pydantic import BaseModel
from .schemas import LifterProfileSchema, ProgramGenerationRequest


class GenerateProgramRequest(BaseModel):
    """Combined request for program generation endpoint"""
    profile: LifterProfileSchema
    request: ProgramGenerationRequest
