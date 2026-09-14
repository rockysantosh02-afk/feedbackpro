"""Audit Job and Audit Run Pydantic schemas."""

from datetime import datetime
import uuid
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.finding import AuditFindingResponse


class AuditTriggerRequest(BaseModel):
    target_url: str | None = Field(
        None, max_length=2048, description="Target URL to audit (optional if project already has live_website link)"
    )


class AuditJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    target_url: str
    status: str
    stage: str
    attempts: int
    max_attempts: int
    error_message: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime


class AuditRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    job_id: uuid.UUID | None
    status: str
    stage: str
    target_url: str
    overall_score: int
    technical_score: int
    security_score: int
    ux_score: int
    a11y_score: int
    perf_score: int
    summary: str | None
    error_message: str | None
    disclaimer: str
    started_at: datetime
    completed_at: datetime | None
    findings: list[AuditFindingResponse] = []
