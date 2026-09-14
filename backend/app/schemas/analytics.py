"""Analytics, Correlation, and Recommendation Pydantic Schemas."""

from datetime import datetime
import uuid
from pydantic import BaseModel, ConfigDict, Field


class FeedbackThemeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    theme_title: str
    sentiment: str
    occurrence_count: int
    severity: str | None
    ai_summary: str


class RecommendationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    audit_finding_id: uuid.UUID | None
    priority: str  # P0, P1, P2, P3
    title: str
    problem_statement: str
    why_it_matters: str
    remediation_steps: list | dict
    rationale: str
    correlated_feedback_count: int
    ease_of_fixing: str


class AnalyticsSummaryResponse(BaseModel):
    total_responses: int
    average_rating: float
    nps_score: int
    sentiment_distribution: dict[str, int]
    top_strengths: list[str]
    top_complaints: list[str]
    recurring_themes: list[FeedbackThemeResponse]
    recommendations: list[RecommendationResponse]
    correlated_issues_count: int
