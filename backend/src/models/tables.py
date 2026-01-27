"""
SQLAlchemy Database Models for IronPath AI
Stores User, LifterProfile, and Program data
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Integer, String, Enum as SQLEnum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
import enum


class Base(DeclarativeBase):
    """Base class for all models"""
    pass


class SexEnum(str, enum.Enum):
    """Sex enumeration for biometric data"""
    MALE = "male"
    FEMALE = "female"


class UnitEnum(str, enum.Enum):
    """Unit enumeration for weight measurements"""
    KG = "kg"
    LBS = "lbs"


class User(Base):
    """
    User model - stores authentication and basic profile info
    Maps to Supabase 'profiles' table
    """
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    picture: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relationships
    lifter_profiles: Mapped[list["LifterProfile"]] = relationship(
        "LifterProfile",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    programs: Mapped[list["Program"]] = relationship(
        "Program",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    progress_logs: Mapped[list["ProgressLog"]] = relationship(
        "ProgressLog",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, name={self.name})>"


class LifterProfile(Base):
    """
    LifterProfile model - stores current lifting stats and biometrics
    One-to-Many relationship with User (one user can have multiple profiles over time)
    """
    __tablename__ = "lifter_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("profiles.id"), nullable=False)

    # Biometrics
    bodyweight: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[UnitEnum] = mapped_column(SQLEnum(UnitEnum), nullable=False)
    sex: Mapped[SexEnum] = mapped_column(SQLEnum(SexEnum), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)

    # One Rep Maxes (stored in user's preferred unit)
    squat_1rm: Mapped[float] = mapped_column(Float, nullable=False)
    bench_1rm: Mapped[float] = mapped_column(Float, nullable=False)
    deadlift_1rm: Mapped[float] = mapped_column(Float, nullable=False)

    # Multi-agent system fields (added in migration 5f9546fe8980)
    training_age: Mapped[str] = mapped_column(String, nullable=False, server_default='novice')
    weak_points: Mapped[dict] = mapped_column(JSON, nullable=False, server_default='[]')
    equipment_access: Mapped[str] = mapped_column(String, nullable=False, server_default='commercial')
    preferred_session_length: Mapped[int] = mapped_column(Integer, nullable=False, server_default='60')
    competition_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    methodology_id: Mapped[Optional[str]] = mapped_column(
        String,
        ForeignKey("training_methodologies.id"),
        nullable=True
    )

    # Metadata
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="lifter_profiles")

    def __repr__(self) -> str:
        return (
            f"<LifterProfile(id={self.id}, user_id={self.user_id}, "
            f"squat={self.squat_1rm}, bench={self.bench_1rm}, deadlift={self.deadlift_1rm})>"
        )


class Program(Base):
    """
    Program model - stores generated lifting programs as JSON blob
    One-to-Many relationship with User
    """
    __tablename__ = "programs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("profiles.id"), nullable=False)

    # Program metadata
    title: Mapped[str] = mapped_column(String, nullable=False)

    # Full program JSON (matches FullProgram TypeScript interface)
    # Stored as JSONB for efficient querying if needed
    program_json: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Multi-agent system fields (added in migration 5f9546fe8980)
    methodology_id: Mapped[Optional[str]] = mapped_column(
        String,
        ForeignKey("training_methodologies.id"),
        nullable=True
    )
    generation_metadata: Mapped[dict] = mapped_column(JSON, nullable=False, server_default='{}')

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="programs")
    progress_logs: Mapped[list["ProgressLog"]] = relationship(
        "ProgressLog",
        back_populates="program",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Program(id={self.id}, user_id={self.user_id}, title={self.title})>"


class ProgressLog(Base):
    """
    Progress Log model - stores workout completion and feedback
    Tracks actual workout sessions and allows program adjustments
    """
    __tablename__ = "progress_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("profiles.id"), nullable=False)
    program_id: Mapped[str] = mapped_column(String, ForeignKey("programs.id"), nullable=False)

    # Session identifiers
    week_number: Mapped[int] = mapped_column(Integer, nullable=False)
    day_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # Completion tracking
    completed: Mapped[bool] = mapped_column(default=False, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Feedback data (stored as JSON for flexibility)
    feedback: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="progress_logs")
    program: Mapped["Program"] = relationship("Program", back_populates="progress_logs")

    def __repr__(self) -> str:
        return (
            f"<ProgressLog(id={self.id}, program_id={self.program_id}, "
            f"week={self.week_number}, day={self.day_number}, completed={self.completed})>"
        )


class TrainingMethodology(Base):
    """
    Training Methodology - stores methodology knowledge bases
    Examples: Westside, Sheiko, DUP, Linear, Block Periodization
    """
    __tablename__ = "training_methodologies"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    system_prompt_template: Mapped[str] = mapped_column(String, nullable=False)
    programming_rules: Mapped[dict] = mapped_column(JSON, nullable=False)
    knowledge_base: Mapped[dict] = mapped_column(JSON, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<TrainingMethodology(id={self.id}, name={self.name})>"


class Exercise(Base):
    """
    Exercise Library - filterable by equipment, weak points, complexity
    """
    __tablename__ = "exercises"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    category: Mapped[str] = mapped_column(String, nullable=False, index=True)
    variation_type: Mapped[str] = mapped_column(String, nullable=False)
    equipment: Mapped[dict] = mapped_column(JSON, nullable=False)
    targets_weak_points: Mapped[dict] = mapped_column(JSON, nullable=False)
    movement_pattern: Mapped[str] = mapped_column(String, nullable=False)
    complexity: Mapped[str] = mapped_column(String, nullable=False)
    coaching_cues: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<Exercise(id={self.id}, name={self.name}, category={self.category})>"


class ReadinessCheck(Base):
    """
    Readiness Check - pre-workout autoregulation assessments
    """
    __tablename__ = "readiness_checks"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("profiles.id"), nullable=False)
    program_id: Mapped[str] = mapped_column(String, ForeignKey("programs.id"), nullable=False)

    week_number: Mapped[int] = mapped_column(Integer, nullable=False)
    day_number: Mapped[int] = mapped_column(Integer, nullable=False)

    sleep_quality: Mapped[int] = mapped_column(Integer, nullable=False)
    stress_level: Mapped[int] = mapped_column(Integer, nullable=False)
    soreness_fatigue: Mapped[int] = mapped_column(Integer, nullable=False)

    overall_readiness: Mapped[float] = mapped_column(Float, nullable=False)
    adjustment_recommendation: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    def __repr__(self) -> str:
        return (
            f"<ReadinessCheck(id={self.id}, user_id={self.user_id}, "
            f"readiness={self.overall_readiness:.2f})>"
        )


class AgentConversation(Base):
    """
    Agent Conversation - logs all agent interactions for analytics
    """
    __tablename__ = "agent_conversations"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("profiles.id"), nullable=False)
    agent_type: Mapped[str] = mapped_column(String, nullable=False)

    user_message: Mapped[str] = mapped_column(String, nullable=False)
    intent_classification: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    agent_response: Mapped[str] = mapped_column(String, nullable=False)
    context: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<AgentConversation(id={self.id}, agent={self.agent_type})>"


class UserProfileData(Base):
    """
    User Profile Data - stores extended lifter profile information as JSON
    This is separate from the legacy LifterProfile table for flexibility
    """
    __tablename__ = "user_profile_data"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("profiles.id"), nullable=False, unique=True, index=True)

    # Store the entire profile as JSON for flexibility
    profile_data: Mapped[dict] = mapped_column(JSON, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<UserProfileData(id={self.id}, user_id={self.user_id})>"
