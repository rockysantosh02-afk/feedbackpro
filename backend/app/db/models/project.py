"""Project and ProjectLink Database Models."""

from datetime import datetime
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Project(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "projects"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    short_description: Mapped[str] = mapped_column(Text, nullable=False)
    detailed_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    problem_statement: Mapped[str | None] = mapped_column(Text, nullable=True)
    solution: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_users: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), default="general", nullable=False)

    # Event details
    event_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    event_organizer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    event_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    event_date: Mapped[str | None] = mapped_column(String(100), nullable=True)
    event_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Tech stack
    tech_frontend: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tech_backend: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tech_database: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tech_ai: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tech_apis: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tech_hosting: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tech_other: Mapped[str | None] = mapped_column(Text, nullable=True)

    feedback_goal: Mapped[str] = mapped_column(String(100), default="General Feedback", nullable=False)
    authorized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="projects")  # type: ignore # noqa: F821
    links: Mapped[list["ProjectLink"]] = relationship(
        "ProjectLink", back_populates="project", cascade="all, delete-orphan"
    )
    audit_jobs: Mapped[list["AuditJob"]] = relationship(  # type: ignore # noqa: F821
        "AuditJob", back_populates="project", cascade="all, delete-orphan"
    )
    audit_runs: Mapped[list["AuditRun"]] = relationship(  # type: ignore # noqa: F821
        "AuditRun", back_populates="project", cascade="all, delete-orphan"
    )
    feedback_forms: Mapped[list["FeedbackForm"]] = relationship(  # type: ignore # noqa: F821
        "FeedbackForm", back_populates="project", cascade="all, delete-orphan"
    )


class ProjectLink(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "project_links"

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    link_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # live_website, github, demo_video, docs, presentation
    url: Mapped[str] = mapped_column(Text, nullable=False)
    label: Mapped[str | None] = mapped_column(String(255), nullable=True)

    project: Mapped["Project"] = relationship("Project", back_populates="links")
