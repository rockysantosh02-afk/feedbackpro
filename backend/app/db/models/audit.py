"""Audit Pipeline Database Models (Jobs, Runs, Findings, Evidence)."""

from datetime import datetime, timezone
import uuid

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AuditJob(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "audit_jobs"

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    target_url: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default="pending", index=True, nullable=False
    )  # pending, processing, completed, failed
    stage: Mapped[str] = mapped_column(String(100), default="queued", nullable=False)
    worker_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    project: Mapped["Project"] = relationship("Project", back_populates="audit_jobs")  # type: ignore # noqa: F821
    runs: Mapped[list["AuditRun"]] = relationship("AuditRun", back_populates="job")


class AuditRun(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "audit_runs"

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    job_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("audit_jobs.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(50), default="running", nullable=False
    )  # running, completed, failed, partial
    stage: Mapped[str] = mapped_column(String(100), default="validating_url", nullable=False)
    target_url: Mapped[str] = mapped_column(Text, nullable=False)

    # 6-Dimension Deterministic Scores
    overall_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    technical_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    security_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ux_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    a11y_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    perf_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    disclaimer: Mapped[str] = mapped_column(
        Text,
        default="This automated audit performs limited, non-destructive checks. It is not a substitute for a professional penetration test or comprehensive security assessment.",
        nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    project: Mapped["Project"] = relationship("Project", back_populates="audit_runs")  # type: ignore # noqa: F821
    job: Mapped["AuditJob | None"] = relationship("AuditJob", back_populates="runs")
    findings: Mapped[list["AuditFinding"]] = relationship(
        "AuditFinding", back_populates="audit_run", cascade="all, delete-orphan"
    )


class AuditFinding(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "audit_findings"

    audit_run_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("audit_runs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # Functional, UI, UX, Performance, Accessibility, Compatibility, Navigation, Forms, Content, Security posture
    severity: Mapped[str] = mapped_column(
        String(50), index=True, nullable=False
    )  # critical, high, medium, low, info
    confidence: Mapped[str] = mapped_column(String(50), nullable=False)  # high, medium, low
    verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[str] = mapped_column(Text, nullable=False)
    affected_url: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_fix: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(50), default="scanner", nullable=False)  # scanner, browser, ai
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    audit_run: Mapped["AuditRun"] = relationship("AuditRun", back_populates="findings")
    evidence_items: Mapped[list["AuditEvidence"]] = relationship(
        "AuditEvidence", back_populates="finding", cascade="all, delete-orphan"
    )


class AuditEvidence(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "audit_evidence"

    audit_finding_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("audit_findings.id", ondelete="CASCADE"), index=True, nullable=False
    )
    evidence_type: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # http_status, response_header, console_error, network_error, dom_snippet, responsive_viewport
    data: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    raw_snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    finding: Mapped["AuditFinding"] = relationship("AuditFinding", back_populates="evidence_items")
