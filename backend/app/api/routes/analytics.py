"""Feedback Analytics and Correlation Routes."""

import uuid
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.db.session import get_db
from app.dependencies import get_current_user
from app.schemas.analytics import AnalyticsSummaryResponse, RecommendationResponse
from app.security.rate_limiter import ai_generation_limiter
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/projects/{project_id}/analytics", tags=["Analytics & Correlation"])


@router.get("", response_model=AnalyticsSummaryResponse)
async def get_analytics(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService.get_analytics_summary(db, project_id, current_user.id)


@router.post("/correlate", response_model=list[RecommendationResponse])
async def correlate_and_recommend(
    project_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ai_generation_limiter.check(request, key_prefix="ai_correlate")
    return await AnalyticsService.correlate_and_generate_recommendations(db, project_id, current_user.id)
