"""Public Response Submission Service with Privacy-Safe Deduplication."""

from datetime import datetime, timezone
import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.feedback import FeedbackForm, FeedbackResponse, ResponseAnswer
from app.schemas.feedback import PublicFeedbackSubmission
from app.security.abuse_detection import AbuseDetector
from app.security.request_limits import RequestLimits
from app.services.feedback_service import FeedbackFormService


class ResponseService:
    @classmethod
    async def submit_public_response(
        cls,
        db: AsyncSession,
        slug: str,
        data: PublicFeedbackSubmission,
        client_ip: str | None,
        user_agent: str | None,
    ) -> uuid.UUID:
        # Check honeypot anti-bot
        if not AbuseDetector.verify_honeypot(data.honeypot):
            # Silently drop bot submission
            return uuid.uuid4()

        form = await FeedbackFormService.get_form_by_slug(db, slug)

        ip_hash = AbuseDetector.hash_ip(client_ip)

        response_entry = FeedbackResponse(
            feedback_form_id=form.id,
            respondent_name=data.respondent_name.strip() if data.respondent_name else None,
            respondent_email=data.respondent_email.strip() if data.respondent_email else None,
            is_anonymous=data.is_anonymous,
            ip_hash=ip_hash,
            user_agent=user_agent[:500] if user_agent else None,
            submitted_at=datetime.now(timezone.utc),
        )
        db.add(response_entry)
        await db.flush()

        # Save answers
        for ans in data.answers:
            # Enforce max length on text answers
            RequestLimits.check_string_length(
                "Feedback response text", ans.text_value, RequestLimits.MAX_FEEDBACK_ANSWER_LENGTH
            )

            answer_record = ResponseAnswer(
                feedback_response_id=response_entry.id,
                question_id=ans.question_id,
                numeric_value=ans.numeric_value,
                text_value=ans.text_value.strip() if ans.text_value else None,
                selected_options=ans.selected_options,
            )
            db.add(answer_record)

        await db.commit()
        return response_entry.id
