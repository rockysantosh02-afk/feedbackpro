"""FastAPI Application Entry Point with Security Hardening and Defense-in-Depth Middleware."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import root_router
from app.config import get_settings
from app.core.logging import logger
from app.core.middleware import (
    MaxBodySizeMiddleware,
    RequestIDMiddleware,
    SecurityHeadersMiddleware,
)
from app.db.base import Base
from app.db.session import engine

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist in dev/test SQLite databases; in production Alembic manages migrations
    logger.info(f"[FeedbackPro] Starting up in '{settings.ENVIRONMENT}' environment...")
    if settings.ENVIRONMENT != "production":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("[FeedbackPro] Dev/Test database models and tables verified.")
    else:
        logger.info("[FeedbackPro] Production environment detected: schema managed via Alembic migrations.")
    yield
    # Shutdown
    logger.info("[FeedbackPro] Shutting down application engine...")
    await engine.dispose()


app = FastAPI(
    title="FeedbackPro API",
    description="AI Hackathon Project Auditor & Feedback Platform (Zero-Trust Security-Hardened)",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
)

# 1. Request ID Middleware
app.add_middleware(RequestIDMiddleware)

# 2. Maximum Request Payload Limiter (HTTP 413)
app.add_middleware(MaxBodySizeMiddleware)

# 3. Defensive Security Headers
app.add_middleware(SecurityHeadersMiddleware)

# 4. Strict CORS policy - specific origins only, never wildcard '*' with credentials
allowed_origins = [
    settings.FRONTEND_URL.rstrip("/"),
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    max_age=600,
)

# 5. Include routes
app.include_router(root_router)
