"""Feedback Form Management Service."""

import secrets
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.agents.feedback_form_generator import FeedbackFormGeneratorAgent
from app.db.models.feedback import (
    FeedbackForm,
    FeedbackOption,
    FeedbackQuestion,
    FeedbackSection,
)
from app.db.models.project import Project
from app.schemas.feedback import (
    FeedbackFormCreate,
    FeedbackFormUpdate,
    FeedbackQuestionCreate,
    FeedbackSectionCreate,
    FormGenerateRequest,
)


class FeedbackFormService:
    @classmethod
    def generate_secure_slug(cls) -> str:
        """Generates a cryptographically random, unpredictable 12-char URL slug."""
        return secrets.token_urlsafe(9).replace("-", "").replace("_", "")

    @classmethod
    async def get_or_create_form(cls, db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> FeedbackForm:
        # Verify ownership
        stmt_p = select(Project).where(Project.id == project_id, Project.user_id == user_id)
        project = await db.scalar(stmt_p)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        stmt = (
            select(FeedbackForm)
            .where(FeedbackForm.project_id == project_id)
            .options(
                selectinload(FeedbackForm.sections),
                selectinload(FeedbackForm.questions).selectinload(FeedbackQuestion.options),
            )
        )
        form = await db.scalar(stmt)
        if not form:
            slug = cls.generate_secure_slug()
            form = FeedbackForm(
                project_id=project_id,
                slug=slug,
                title=f"{project.name} - Participant Feedback",
                description="Please share your feedback to help improve the project before judging.",
                status="draft",
                allow_anonymous=True,
            )
            db.add(form)
            await db.commit()
            await db.refresh(form)

        return form

    @classmethod
    async def generate_form_with_ai(
        cls, db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID, req: FormGenerateRequest
    ) -> FeedbackForm:
        """Uses Agent 7 to generate a customized draft feedback questionnaire."""
        stmt_p = select(Project).where(Project.id == project_id, Project.user_id == user_id)
        project = await db.scalar(stmt_p)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        # Fetch or create base form
        form = await cls.get_or_create_form(db, project_id, user_id)

        # Clear existing draft questions if re-generating
        old_q_stmt = select(FeedbackQuestion).where(FeedbackQuestion.feedback_form_id == form.id)
        old_questions = list((await db.scalars(old_q_stmt)).all())
        for q in old_questions:
            await db.delete(q)
        await db.flush()

        agent = FeedbackFormGeneratorAgent()
        generated = await agent.generate_form(
            project_info={
                "name": project.name,
                "category": project.category,
                "problem": project.problem_statement or project.short_description,
                "solution": project.solution,
                "event": project.event_name,
            },
            focus_area=req.focus_area,
        )

        form.title = generated.suggested_title
        form.description = generated.suggested_description

        # Insert generated questions
        for g_q in generated.questions:
            question = FeedbackQuestion(
                feedback_form_id=form.id,
                prompt=g_q.prompt,
                description=g_q.description,
                question_type=g_q.question_type,
                is_required=g_q.is_required,
                sort_order=g_q.sort_order,
                min_label=g_q.min_label,
                max_label=g_q.max_label,
            )
            db.add(question)
            await db.flush()

            for opt in g_q.options:
                option = FeedbackOption(
                    question_id=question.id,
                    label=opt.label,
                    value=opt.value,
                    sort_order=opt.sort_order,
                )
                db.add(option)

        # Form remains in 'draft' mode - never automatically published without user review!
        form.status = "draft"
        await db.commit()

        # Reload with relationships
        stmt = (
            select(FeedbackForm)
            .where(FeedbackForm.id == form.id)
            .options(
                selectinload(FeedbackForm.sections),
                selectinload(FeedbackForm.questions).selectinload(FeedbackQuestion.options),
            )
        )
        return await db.scalar(stmt)

    @classmethod
    async def publish_form(cls, db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> FeedbackForm:
        form = await cls.get_or_create_form(db, project_id, user_id)
        old_q_stmt = select(FeedbackQuestion).where(FeedbackQuestion.feedback_form_id == form.id)
        questions = list((await db.scalars(old_q_stmt)).all())
        if not questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot publish a feedback form with 0 questions.",
            )
        form.status = "published"
        await db.commit()

        stmt = (
            select(FeedbackForm)
            .where(FeedbackForm.id == form.id)
            .options(
                selectinload(FeedbackForm.sections),
                selectinload(FeedbackForm.questions).selectinload(FeedbackQuestion.options),
            )
        )
        return await db.scalar(stmt)

    @classmethod
    async def unpublish_form(cls, db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> FeedbackForm:
        form = await cls.get_or_create_form(db, project_id, user_id)
        form.status = "draft"
        await db.commit()

        stmt = (
            select(FeedbackForm)
            .where(FeedbackForm.id == form.id)
            .options(
                selectinload(FeedbackForm.sections),
                selectinload(FeedbackForm.questions).selectinload(FeedbackQuestion.options),
            )
        )
        return await db.scalar(stmt)

    @classmethod
    async def get_form_by_slug(cls, db: AsyncSession, slug: str) -> FeedbackForm:
        """Retrieves a published form by slug for public submission."""
        stmt = (
            select(FeedbackForm)
            .where(FeedbackForm.slug == slug, FeedbackForm.status == "published", FeedbackForm.is_active.is_(True))
            .options(
                selectinload(FeedbackForm.sections),
                selectinload(FeedbackForm.questions).selectinload(FeedbackQuestion.options),
                selectinload(FeedbackForm.project),
            )
        )
        form = await db.scalar(stmt)
        if not form:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Feedback form not found or currently closed.",
            )
        return form
