"""Public Hostile-Facing Feedback Submission Routes."""

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.feedback import FeedbackFormResponse, PublicFeedbackSubmission
from app.security.rate_limiter import public_form_limiter
from app.services.feedback_service import FeedbackFormService
from app.services.response_service import ResponseService

router = APIRouter(prefix="/public/forms", tags=["Public Feedback Submission"])


@router.get("/{slug}", response_model=FeedbackFormResponse)
async def get_public_form(
    slug: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    public_form_limiter.check(request, key_prefix="public_form_view")
    return await FeedbackFormService.get_form_by_slug(db, slug)


@router.post("/{slug}/responses", status_code=status.HTTP_201_CREATED)
async def submit_public_feedback(
    slug: str,
    data: PublicFeedbackSubmission,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    public_form_limiter.check(request, key_prefix="public_form_submit")

    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("User-Agent")

    response_id = await ResponseService.submit_public_response(
        db=db,
        slug=slug,
        data=data,
        client_ip=client_ip,
        user_agent=user_agent,
    )

    return {
        "success": True,
        "message": "Thank you! Your feedback has been recorded safely.",
        "response_id": response_id,
    }
