"""Audit Finding and Evidence Pydantic schemas."""

from datetime import datetime
import uuid
from pydantic import BaseModel, ConfigDict


class AuditEvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    audit_finding_id: uuid.UUID
    evidence_type: str
    data: dict | list | None
    raw_snippet: str | None
    created_at: datetime


class AuditFindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    audit_run_id: uuid.UUID
    project_id: uuid.UUID
    title: str
    category: str
    severity: str
    confidence: str
    verified: bool
    description: str
    evidence: str
    affected_url: str
    recommended_fix: str
    source: str
    is_resolved: bool
    created_at: datetime
    evidence_items: list[AuditEvidenceResponse] = []
