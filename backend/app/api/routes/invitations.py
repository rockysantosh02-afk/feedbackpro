"""Email Invitation Campaign Routes."""

import uuid
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.db.session import get_db
from app.dependencies import get_current_user
from app.security.rate_limiter import invitation_limiter
from app.services.email_service import EmailService
from app.services.feedback_service import FeedbackFormService
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects/{project_id}/invitations", tags=["Email Invitations"])


class SendInvitationsRequest(BaseModel):
    recipients: list[EmailStr] = Field(..., min_length=1, max_length=50)
    custom_message: str | None = Field(None, max_length=2000)


@router.post("")
async def send_invitations(
    project_id: uuid.UUID,
    data: SendInvitationsRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    invitation_limiter.check(request, key_prefix="send_invitations")
    project = await ProjectService.get_project(db, project_id, current_user.id)
    form = await FeedbackFormService.get_or_create_form(db, project_id, current_user.id)

    result = await EmailService.send_feedback_invitations(
        project_name=project.name,
        form_slug=form.slug,
        recipients=data.recipients,
        custom_message=data.custom_message,
    )

    return {
        "success": True,
        "total_sent": result.total_sent,
        "failed_emails": result.failed_emails,
        "message": f"Successfully sent {result.total_sent} invitations.",
    }
