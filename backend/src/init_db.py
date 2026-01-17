"""
Database initialization script
Run this to create all tables with correct foreign keys
"""
import asyncio
import logging
from sqlalchemy import text

from .core.database import engine
from .models.tables import Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def init_db():
    """Initialize database tables"""
    if engine is None:
        logger.error("Database engine not configured. Check DATABASE_URL in .env")
        return

    async with engine.begin() as conn:
        logger.info("Dropping all existing tables...")
        await conn.run_sync(Base.metadata.drop_all)

        logger.info("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)

        logger.info("✅ Database tables created successfully!")

        # Show created tables
        result = await conn.execute(text(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
        ))
        tables = result.fetchall()
        logger.info(f"Created tables: {[t[0] for t in tables]}")


async def reset_db():
    """Drop and recreate all tables (WARNING: deletes all data!)"""
    if engine is None:
        logger.error("Database engine not configured. Check DATABASE_URL in .env")
        return

    logger.warning("⚠️  WARNING: This will delete all data!")

    async with engine.begin() as conn:
        logger.info("Dropping all tables...")
        await conn.run_sync(Base.metadata.drop_all)

        logger.info("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)

        logger.info("✅ Database reset complete!")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--reset":
        asyncio.run(reset_db())
    else:
        asyncio.run(init_db())
