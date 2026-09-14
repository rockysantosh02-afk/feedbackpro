"""AI Analytics, Generations, and Prioritized Recommendations Models."""

from datetime import datetime
import uuid

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AIGeneration(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "ai_generations"

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    generation_type: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # project_understanding, form_generation, response_analysis, correlation, recommendations
    model_used: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    execution_time_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    raw_output: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )


class AIAnalysis(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "ai_analysis"

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    audit_run_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("audit_runs.id", ondelete="SET NULL"), nullable=True
    )
    executive_summary: Mapped[str] = mapped_column(Text, nullable=False)
    sentiment_distribution: Mapped[dict] = mapped_column(JSON, nullable=False)
    positive_themes: Mapped[list | None] = mapped_column(JSON, nullable=True)
    negative_themes: Mapped[list | None] = mapped_column(JSON, nullable=True)
    feature_requests: Mapped[list | None] = mapped_column(JSON, nullable=True)
    common_complaints: Mapped[list | None] = mapped_column(JSON, nullable=True)
    most_praised: Mapped[list | None] = mapped_column(JSON, nullable=True)
    user_satisfaction_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sample_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_sample_size_limited: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Recommendation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "recommendations"

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    audit_finding_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("audit_findings.id", ondelete="SET NULL"), nullable=True
    )
    priority: Mapped[str] = mapped_column(
        String(10), index=True, nullable=False
    )  # P0, P1, P2, P3
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    problem_statement: Mapped[str] = mapped_column(Text, nullable=False)
    why_it_matters: Mapped[str] = mapped_column(Text, nullable=False)
    remediation_steps: Mapped[list | dict] = mapped_column(JSON, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    correlated_feedback_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ease_of_fixing: Mapped[str] = mapped_column(
        String(50), default="Medium", nullable=False
    )  # Easy, Medium, Hard

    finding: Mapped["AuditFinding | None"] = relationship("AuditFinding")  # type: ignore # noqa: F821
