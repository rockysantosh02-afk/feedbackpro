"""AI Agent Structured Output Pydantic Schemas."""

from pydantic import BaseModel, Field


class ProjectUnderstandingOutput(BaseModel):
    project_summary: str
    target_users: list[str] = Field(default_factory=list)
    core_features: list[str] = Field(default_factory=list)
    technology: list[str] = Field(default_factory=list)
    expected_user_journey: list[str] = Field(default_factory=list)
    key_risk_areas: list[str] = Field(default_factory=list)


class FindingItem(BaseModel):
    title: str
    category: str = Field(
        ...,
        description="Functional, UI, Navigation, Forms, Performance, Accessibility, Compatibility, Content, Security posture",
    )
    severity: str = Field("medium", description="critical, high, medium, low, info")
    confidence: str = Field("high", description="high, medium, low")
    description: str
    evidence: str
    affected_url: str
    recommended_fix: str


class BugDetectionOutput(BaseModel):
    findings: list[FindingItem] = Field(default_factory=list)


class SecurityPostureOutput(BaseModel):
    findings: list[FindingItem] = Field(default_factory=list)
    security_score: int = Field(..., ge=0, le=100)
    summary: str


class UXAccessibilityOutput(BaseModel):
    findings: list[FindingItem] = Field(default_factory=list)
    ux_score: int = Field(..., ge=0, le=100)
    a11y_score: int = Field(..., ge=0, le=100)
    summary: str


class GeneratedQuestionOption(BaseModel):
    label: str
    value: str
    sort_order: int = 0


class GeneratedQuestion(BaseModel):
    prompt: str
    description: str | None = None
    question_type: str = Field(
        ...,
        description="rating, multiple_choice, checkbox, yes_no, likert, nps, short_text, long_text, emoji_rating",
    )
    is_required: bool = False
    sort_order: int
    min_label: str | None = None
    max_label: str | None = None
    options: list[GeneratedQuestionOption] = Field(default_factory=list)


class FeedbackFormGeneratorOutput(BaseModel):
    strategy_rationale: str
    suggested_title: str
    suggested_description: str
    questions: list[GeneratedQuestion] = Field(default_factory=list)


class FeedbackAnalysisOutput(BaseModel):
    executive_summary: str
    sentiment_distribution: dict[str, int] = Field(
        default_factory=lambda: {"positive": 50, "neutral": 30, "negative": 20}
    )
    positive_themes: list[str] = Field(default_factory=list)
    negative_themes: list[str] = Field(default_factory=list)
    feature_requests: list[str] = Field(default_factory=list)
    common_complaints: list[str] = Field(default_factory=list)
    most_praised: list[str] = Field(default_factory=list)
    user_satisfaction_score: int = Field(75, ge=0, le=100)


class CorrelatedIssueItem(BaseModel):
    finding_title: str
    theme_title: str
    correlation_strength: str = Field("strong", description="strong, moderate, weak")
    evidence: str
    confidence_boost: bool = True


class IssueCorrelationOutput(BaseModel):
    correlations: list[CorrelatedIssueItem] = Field(default_factory=list)
    correlation_summary: str


class RecommendationItem(BaseModel):
    priority: str = Field(..., description="P0, P1, P2, P3")
    title: str
    problem_statement: str
    why_it_matters: str
    remediation_steps: list[str]
    rationale: str
    correlated_feedback_count: int = 0
    ease_of_fixing: str = "Medium"


class RecommendationOutput(BaseModel):
    recommendations: list[RecommendationItem] = Field(default_factory=list)
