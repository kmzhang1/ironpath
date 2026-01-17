"""
Database connection and session management
"""
from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from .config import settings

# Create async engine only if DATABASE_URL is valid
engine = None
AsyncSessionLocal = None

if settings.DATABASE_URL and settings.DATABASE_URL.startswith("postgresql"):
    try:
        engine = create_async_engine(
            settings.DATABASE_URL,
            echo=settings.DEBUG,
            poolclass=NullPool,  # Use NullPool for development; change for production
        )

        # Create async session factory
        AsyncSessionLocal = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    except Exception as e:
        print(f"Warning: Could not create database engine: {e}")


async def get_db() -> AsyncGenerator[Optional[AsyncSession], None]:
    """
    Dependency to get database session.
    Use in FastAPI endpoints with Depends(get_db).
    Returns None if database is not configured.
    """
    if AsyncSessionLocal is None:
        yield None
        return

    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        else:
            await session.commit()
        finally:
            await session.close()
