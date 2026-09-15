"""Feedback System Models (Forms, Sections, Questions, Responses, Answers, Themes)."""

from datetime import datetime, timezone
import uuid

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class FeedbackForm(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "feedback_forms"

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), default="draft", nullable=False
    )  # draft, published, closed
    allow_anonymous: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    project: Mapped["Project"] = relationship("Project", back_populates="feedback_forms")  # type: ignore # noqa: F821
    sections: Mapped[list["FeedbackSection"]] = relationship(
        "FeedbackSection", back_populates="form", cascade="all, delete-orphan", order_by="FeedbackSection.sort_order"
    )
    questions: Mapped[list["FeedbackQuestion"]] = relationship(
        "FeedbackQuestion", back_populates="form", cascade="all, delete-orphan", order_by="FeedbackQuestion.sort_order"
    )
    responses: Mapped[list["FeedbackResponse"]] = relationship(
        "FeedbackResponse", back_populates="form", cascade="all, delete-orphan"
    )
    themes: Mapped[list["FeedbackTheme"]] = relationship(
        "FeedbackTheme", back_populates="form", cascade="all, delete-orphan"
    )


class FeedbackSection(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "feedback_sections"

    feedback_form_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("feedback_forms.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    form: Mapped["FeedbackForm"] = relationship("FeedbackForm", back_populates="sections")
    questions: Mapped[list["FeedbackQuestion"]] = relationship(
        "FeedbackQuestion", back_populates="section"
    )


class FeedbackQuestion(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "feedback_questions"

    feedback_form_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("feedback_forms.id", ondelete="CASCADE"), index=True, nullable=False
    )
    section_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("feedback_sections.id", ondelete="SET NULL"), nullable=True
    )
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    question_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # rating, multiple_choice, checkbox, yes_no, likert, nps, short_text, long_text, emoji_rating
    is_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    min_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    max_label: Mapped[str | None] = mapped_column(String(100), nullable=True)

    form: Mapped["FeedbackForm"] = relationship("FeedbackForm", back_populates="questions")
    section: Mapped["FeedbackSection | None"] = relationship("FeedbackSection", back_populates="questions")
    options: Mapped[list["FeedbackOption"]] = relationship(
        "FeedbackOption", back_populates="question", cascade="all, delete-orphan", order_by="FeedbackOption.sort_order"
    )
    answers: Mapped[list["ResponseAnswer"]] = relationship(
        "ResponseAnswer", back_populates="question", cascade="all, delete-orphan"
    )


class FeedbackOption(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "feedback_options"

    question_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("feedback_questions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    value: Mapped[str] = mapped_column(String(255), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    question: Mapped["FeedbackQuestion"] = relationship("FeedbackQuestion", back_populates="options")


class FeedbackResponse(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "feedback_responses"

    feedback_form_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("feedback_forms.id", ondelete="CASCADE"), index=True, nullable=False
    )
    respondent_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    respondent_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    ip_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)  # Privacy-preserving SHA-256 hash
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    form: Mapped["FeedbackForm"] = relationship("FeedbackForm", back_populates="responses")
    answers: Mapped[list["ResponseAnswer"]] = relationship(
        "ResponseAnswer", back_populates="response", cascade="all, delete-orphan"
    )


class ResponseAnswer(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "response_answers"

    feedback_response_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("feedback_responses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("feedback_questions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    numeric_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    text_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    selected_options: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    response: Mapped["FeedbackResponse"] = relationship("FeedbackResponse", back_populates="answers")
    question: Mapped["FeedbackQuestion"] = relationship("FeedbackQuestion", back_populates="answers")


class FeedbackTheme(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "feedback_themes"

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    feedback_form_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("feedback_forms.id", ondelete="CASCADE"), index=True, nullable=False
    )
    theme_title: Mapped[str] = mapped_column(String(255), nullable=False)
    sentiment: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # positive, negative, neutral
    occurrence_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    severity: Mapped[str | None] = mapped_column(String(50), nullable=True)  # high, medium, low
    ai_summary: Mapped[str] = mapped_column(Text, nullable=False)

    form: Mapped["FeedbackForm"] = relationship("FeedbackForm", back_populates="themes")
