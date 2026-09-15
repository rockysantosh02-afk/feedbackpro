"""Health Check Endpoint."""

from datetime import datetime, timezone
import json
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db

router = APIRouter(tags=["Health"])
settings = get_settings()


@router.get("/health")
async def healthcheck():
    """Liveness probe: verifies the FastAPI application process is alive."""
    return {
        "status": "ok",
        "service": "feedbackpro-api",
        "environment": settings.ENVIRONMENT,
        "database": "healthy",
        "ai_provider": settings.AI_PROVIDER,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Readiness probe: verifies all critical backing dependencies (PostgreSQL) are operational."""
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        return Response(
            content=json.dumps({
                "status": "unhealthy",
                "service": "feedbackpro-api",
                "environment": settings.ENVIRONMENT,
                "database": db_status,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }),
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            media_type="application/json",
        )

    return {
        "status": "ok",
        "service": "feedbackpro-api",
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "ai_provider": settings.AI_PROVIDER,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
