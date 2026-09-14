"""Project Health Report Schemas."""

from datetime import datetime
import uuid
from pydantic import BaseModel

from app.schemas.analytics import FeedbackThemeResponse, RecommendationResponse
from app.schemas.finding import AuditFindingResponse


class DimensionScores(BaseModel):
    overall: int
    technical: int
    security: int
    ux: int
    accessibility: int
    performance: int
    satisfaction: int


class FinalHealthReport(BaseModel):
    project_id: uuid.UUID
    project_name: str
    event_name: str
    generated_at: datetime
    scores: DimensionScores
    executive_summary: str
    top_strengths: list[str]
    top_problems: list[str]
    verified_findings_count: int
    potential_findings_count: int
    informational_findings_count: int
    findings: list[AuditFindingResponse]
    feedback_themes: list[FeedbackThemeResponse]
    recommendations: list[RecommendationResponse]
    disclaimer: str = (
        "No issues were detected within the checks performed. "
        "This automated audit performs limited, non-destructive checks and is not a substitute for a professional penetration test."
    )
