"""
Application configuration using Pydantic Settings
Loads from environment variables and .env file
"""

from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings"""

    # Application
    ENVIRONMENT: str = Field(default="development", description="Environment name")
    DEBUG: bool = Field(default=True, description="Debug mode")
    HOST: str = Field(default="0.0.0.0", description="Server host")
    PORT: int = Field(default=8000, description="Server port")

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/ironpath_db",
        description="PostgreSQL database URL",
    )

    # Google Gemini API
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API key")
    GEMINI_MODEL: str = Field(
        default="gemini-2.5-flash",
        description="Gemini model name",
    )

    # CORS (comma-separated string that gets split)
    CORS_ORIGINS: str = Field(
        default="http://localhost:5173,http://localhost:3000",
        description="Allowed CORS origins (comma-separated)",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins as list"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    # Model Config
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


# Global settings instance
settings = Settings()
