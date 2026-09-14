"""Project and ProjectLink Pydantic schemas."""

from datetime import datetime
import uuid
from pydantic import BaseModel, ConfigDict, Field


class ProjectLinkBase(BaseModel):
    link_type: str = Field(..., description="live_website, github, demo_video, docs, presentation")
    url: str = Field(..., max_length=2048)
    label: str | None = Field(None, max_length=255)


class ProjectLinkCreate(ProjectLinkBase):
    pass


class ProjectLinkResponse(ProjectLinkBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    short_description: str = Field(..., min_length=10, max_length=1000)
    detailed_description: str | None = Field(None, max_length=10000)
    problem_statement: str | None = Field(None, max_length=5000)
    solution: str | None = Field(None, max_length=5000)
    target_users: str | None = Field(None, max_length=2000)
    category: str = Field("general", max_length=100)

    # Event info
    event_name: str = Field(..., min_length=2, max_length=255)
    event_organizer: str | None = Field(None, max_length=255)
    event_type: str | None = Field(None, max_length=100)
    event_date: str | None = Field(None, max_length=100)
    event_description: str | None = Field(None, max_length=5000)

    # Tech Stack
    tech_frontend: str | None = Field(None, max_length=255)
    tech_backend: str | None = Field(None, max_length=255)
    tech_database: str | None = Field(None, max_length=255)
    tech_ai: str | None = Field(None, max_length=255)
    tech_apis: str | None = Field(None, max_length=255)
    tech_hosting: str | None = Field(None, max_length=255)
    tech_other: str | None = Field(None, max_length=2000)

    feedback_goal: str = Field("General Feedback", max_length=100)


class ProjectCreate(ProjectBase):
    authorize_audit: bool = Field(False, description="Must explicitly authorize automated non-destructive audit")
    links: list[ProjectLinkCreate] = Field(default_factory=list)


class ProjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=200)
    short_description: str | None = Field(None, min_length=10, max_length=1000)
    detailed_description: str | None = None
    problem_statement: str | None = None
    solution: str | None = None
    target_users: str | None = None
    category: str | None = None
    event_name: str | None = None
    event_organizer: str | None = None
    event_type: str | None = None
    event_date: str | None = None
    event_description: str | None = None
    tech_frontend: str | None = None
    tech_backend: str | None = None
    tech_database: str | None = None
    tech_ai: str | None = None
    tech_apis: str | None = None
    tech_hosting: str | None = None
    tech_other: str | None = None
    feedback_goal: str | None = None
    authorize_audit: bool | None = None


class ProjectResponse(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    authorized_at: datetime | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    links: list[ProjectLinkResponse] = Field(default_factory=list)
