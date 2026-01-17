"""
FastAPI Application Entry Point
Main app configuration with CORS, middleware, and route registration
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .core.config import settings
from .routes import programs_router
from .routes.feedback import router as feedback_router
from .routes.users import router as users_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    logger.info("🚀 IronPath AI Backend Starting...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug Mode: {settings.DEBUG}")
    logger.info(f"Gemini Model: {settings.GEMINI_MODEL}")
    logger.info(f"CORS Origins: {settings.cors_origins_list}")

    # Check if Gemini API key is configured
    if not settings.GEMINI_API_KEY:
        logger.warning("⚠️  No GEMINI_API_KEY configured - will use mock programs")
    else:
        logger.info("✅ Gemini API key configured")

    yield

    # Shutdown
    logger.info("🛑 IronPath AI Backend Shutting Down...")


# Initialize FastAPI app
app = FastAPI(
    title="IronPath AI API",
    description="Backend API for IronPath AI - AI-Powered Powerlifting Program Generator",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,  # Disable docs in production
    redoc_url="/redoc" if settings.DEBUG else None,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health", tags=["system"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "version": "0.1.0",
    }


# Root endpoint
@app.get("/", tags=["system"])
async def root():
    """Root endpoint with API information"""
    return {
        "message": "IronPath AI Backend API",
        "version": "0.1.0",
        "docs": "/docs" if settings.DEBUG else None,
    }


# Register routers
app.include_router(programs_router, prefix="/api")
app.include_router(feedback_router, prefix="/api")
app.include_router(users_router, prefix="/api")


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Catch-all exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "code": "INTERNAL_ERROR",
            "details": {"message": str(exc)} if settings.DEBUG else {},
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
