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
