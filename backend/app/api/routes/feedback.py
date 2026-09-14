"""Feedback Form Management Routes."""

import uuid
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.db.session import get_db
from app.dependencies import get_current_user
from app.schemas.feedback import (
    FeedbackFormResponse,
    FeedbackFormUpdate,
    FormGenerateRequest,
)
from app.security.rate_limiter import ai_generation_limiter
from app.services.feedback_service import FeedbackFormService
from app.services.qr_service import QRCodeService

router = APIRouter(prefix="/projects/{project_id}/form", tags=["Feedback Form Builder"])


@router.get("", response_model=FeedbackFormResponse)
async def get_form(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await FeedbackFormService.get_or_create_form(db, project_id, current_user.id)


@router.post("/generate", response_model=FeedbackFormResponse)
async def generate_form(
    project_id: uuid.UUID,
    data: FormGenerateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ai_generation_limiter.check(request, key_prefix="ai_form_generate")
    return await FeedbackFormService.generate_form_with_ai(db, project_id, current_user.id, data)


@router.post("/publish", response_model=FeedbackFormResponse)
async def publish_form(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await FeedbackFormService.publish_form(db, project_id, current_user.id)


@router.post("/unpublish", response_model=FeedbackFormResponse)
async def unpublish_form(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await FeedbackFormService.unpublish_form(db, project_id, current_user.id)


@router.get("/qr")
async def get_form_qr_code(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    form = await FeedbackFormService.get_or_create_form(db, project_id, current_user.id)
    qr_data_url = QRCodeService.generate_feedback_qr_png_base64(form.slug)
    return {"slug": form.slug, "qr_code_url": qr_data_url}
