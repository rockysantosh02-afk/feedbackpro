"""Email Invitation Service with Recipient Bounds and Rate Protection."""

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib
from typing import NamedTuple

from fastapi import HTTPException, status
import httpx
from pydantic import EmailStr

from app.config import get_settings
from app.core.logging import logger
from app.security.request_limits import RequestLimits

settings = get_settings()


class EmailSendResult(NamedTuple):
    total_sent: int
    failed_emails: list[str]


class EmailService:
    @classmethod
    async def send_feedback_invitations(
        cls,
        project_name: str,
        form_slug: str,
        recipients: list[EmailStr],
        custom_message: str | None = None,
    ) -> EmailSendResult:
        # Enforce recipient limit to prevent application from turning into an open mail relay
        RequestLimits.check_collection_size(
            "Email recipients", len(recipients), RequestLimits.MAX_RECIPIENTS_PER_INVITE
        )

        feedback_url = f"{settings.FRONTEND_URL}/feedback/{form_slug}"
        subject = f"Invitation to test and evaluate: {project_name}"

        body_text = (
            f"Hello,\n\n"
            f"You have been invited to try out '{project_name}' and provide your feedback.\n\n"
            f"{custom_message or 'Your feedback will directly help the team improve before final judging.'}\n\n"
            f"Access the feedback form here:\n{feedback_url}\n\n"
            f"— The FeedbackPro Team"
        )

        sent_count = 0
        failed: list[str] = []

        if settings.EMAIL_PROVIDER == "resend" and settings.RESEND_API_KEY:
            async with httpx.AsyncClient(timeout=15.0) as client:
                for email in recipients:
                    try:
                        res = await client.post(
                            "https://api.resend.com/emails",
                            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                            json={
                                "from": settings.EMAIL_FROM,
                                "to": [email],
                                "subject": subject,
                                "text": body_text,
                            },
                        )
                        if res.status_code < 300:
                            sent_count += 1
                        else:
                            failed.append(email)
                    except Exception:
                        failed.append(email)

        elif settings.EMAIL_PROVIDER == "smtp" and settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            try:
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                    server.starttls()
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                    for email in recipients:
                        try:
                            msg = MIMEMultipart()
                            msg["From"] = settings.EMAIL_FROM
                            msg["To"] = email
                            msg["Subject"] = subject
                            msg.attach(MIMEText(body_text, "plain"))
                            server.send_message(msg)
                            sent_count += 1
                        except Exception:
                            failed.append(email)
            except Exception as e:
                logger.error(f"SMTP connection error: {e}")
                failed.extend(recipients)

        else:
            # Mock provider (default for testing/dev)
            logger.info(f"[MockEmailService] Simulated sending {len(recipients)} invitation(s) for {project_name} to {recipients}")
            sent_count = len(recipients)

        return EmailSendResult(total_sent=sent_count, failed_emails=failed)
