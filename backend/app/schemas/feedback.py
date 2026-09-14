"""Feedback Forms, Questions, and Submission Pydantic Schemas."""

from datetime import datetime
import uuid
from pydantic import BaseModel, ConfigDict, Field


class FeedbackOptionBase(BaseModel):
    label: str = Field(..., max_length=255)
    value: str = Field(..., max_length=255)
    sort_order: int = 0


class FeedbackOptionCreate(FeedbackOptionBase):
    pass


class FeedbackOptionResponse(FeedbackOptionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    question_id: uuid.UUID


class FeedbackQuestionBase(BaseModel):
    prompt: str = Field(..., min_length=2, max_length=1000)
    description: str | None = Field(None, max_length=2000)
    question_type: str = Field(
        ...,
        description="rating, multiple_choice, checkbox, yes_no, likert, nps, short_text, long_text, emoji_rating",
    )
    is_required: bool = False
    sort_order: int = 0
    min_label: str | None = Field(None, max_length=100)
    max_label: str | None = Field(None, max_length=100)


class FeedbackQuestionCreate(FeedbackQuestionBase):
    section_id: uuid.UUID | None = None
    options: list[FeedbackOptionCreate] = Field(default_factory=list)


class FeedbackQuestionResponse(FeedbackQuestionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    feedback_form_id: uuid.UUID
    section_id: uuid.UUID | None
    options: list[FeedbackOptionResponse] = Field(default_factory=list)


class FeedbackSectionBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: str | None = Field(None, max_length=1000)
    sort_order: int = 0


class FeedbackSectionCreate(FeedbackSectionBase):
    pass


class FeedbackSectionResponse(FeedbackSectionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    feedback_form_id: uuid.UUID
    questions: list[FeedbackQuestionResponse] = Field(default_factory=list)


class FeedbackFormBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: str | None = Field(None, max_length=2000)
    allow_anonymous: bool = True


class FeedbackFormCreate(FeedbackFormBase):
    pass


class FeedbackFormUpdate(BaseModel):
    title: str | None = Field(None, min_length=2, max_length=255)
    description: str | None = None
    allow_anonymous: bool | None = None
    status: str | None = Field(None, description="draft, published, closed")


class FeedbackFormResponse(FeedbackFormBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    slug: str
    status: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    sections: list[FeedbackSectionResponse] = Field(default_factory=list)
    questions: list[FeedbackQuestionResponse] = Field(default_factory=list)


class FormGenerateRequest(BaseModel):
    focus_area: str | None = Field(
        None, description="Optional custom focus (e.g. 'Usability and UX', 'API Developer Experience')"
    )


# Public Submission Schemas
class ResponseAnswerSubmission(BaseModel):
    question_id: uuid.UUID
    numeric_value: float | None = None
    text_value: str | None = Field(None, max_length=5000)
    selected_options: list[str] | None = None


class PublicFeedbackSubmission(BaseModel):
    respondent_name: str | None = Field(None, max_length=255)
    respondent_email: str | None = Field(None, max_length=255)
    is_anonymous: bool = True
    answers: list[ResponseAnswerSubmission] = Field(..., min_length=1)
    honeypot: str | None = Field(None, description="Hidden anti-bot field")
