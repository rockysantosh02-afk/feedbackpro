"""Project Management Service with Strict Ownership Enforcement."""

from datetime import datetime, timezone
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.project import Project, ProjectLink
from app.schemas.project import ProjectCreate, ProjectLinkCreate, ProjectUpdate


class ProjectService:
    @classmethod
    async def create_project(cls, db: AsyncSession, user_id: uuid.UUID, data: ProjectCreate) -> Project:
        now = datetime.now(timezone.utc)
        authorized_at = now if data.authorize_audit else None

        project = Project(
            user_id=user_id,
            name=data.name.strip(),
            short_description=data.short_description.strip(),
            detailed_description=data.detailed_description.strip() if data.detailed_description else None,
            problem_statement=data.problem_statement.strip() if data.problem_statement else None,
            solution=data.solution.strip() if data.solution else None,
            target_users=data.target_users.strip() if data.target_users else None,
            category=data.category,
            event_name=data.event_name.strip(),
            event_organizer=data.event_organizer.strip() if data.event_organizer else None,
            event_type=data.event_type,
            event_date=data.event_date,
            event_description=data.event_description,
            tech_frontend=data.tech_frontend,
            tech_backend=data.tech_backend,
            tech_database=data.tech_database,
            tech_ai=data.tech_ai,
            tech_apis=data.tech_apis,
            tech_hosting=data.tech_hosting,
            tech_other=data.tech_other,
            feedback_goal=data.feedback_goal,
            authorized_at=authorized_at,
        )
        db.add(project)
        await db.flush()

        for link_in in data.links:
            link = ProjectLink(
                project_id=project.id,
                link_type=link_in.link_type,
                url=link_in.url.strip(),
                label=link_in.label.strip() if link_in.label else None,
            )
            db.add(link)

        await db.commit()

        # Reload with links
        stmt = (
            select(Project)
            .where(Project.id == project.id)
            .options(selectinload(Project.links))
        )
        return await db.scalar(stmt)

    @classmethod
    async def list_projects(cls, db: AsyncSession, user_id: uuid.UUID) -> list[Project]:
        stmt = (
            select(Project)
            .where(Project.user_id == user_id, Project.is_active.is_(True))
            .options(selectinload(Project.links))
            .order_by(Project.created_at.desc())
        )
        res = await db.scalars(stmt)
        return list(res.all())

    @classmethod
    async def get_project(cls, db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> Project:
        stmt = (
            select(Project)
            .where(Project.id == project_id, Project.user_id == user_id)
            .options(selectinload(Project.links))
        )
        project = await db.scalar(stmt)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or access denied.",
            )
        return project

    @classmethod
    async def update_project(
        cls, db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID, data: ProjectUpdate
    ) -> Project:
        project = await cls.get_project(db, project_id, user_id)

        update_dict = data.model_dump(exclude_unset=True)
        if "authorize_audit" in update_dict:
            authorize = update_dict.pop("authorize_audit")
            project.authorized_at = datetime.now(timezone.utc) if authorize else None

        for field, value in update_dict.items():
            setattr(project, field, value)

        await db.commit()
        await db.refresh(project)
        return project

    @classmethod
    async def delete_project(cls, db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> None:
        project = await cls.get_project(db, project_id, user_id)
        await db.delete(project)
        await db.commit()

    @classmethod
    async def add_link(
        cls, db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID, link_data: ProjectLinkCreate
    ) -> ProjectLink:
        # verify ownership
        await cls.get_project(db, project_id, user_id)
        link = ProjectLink(
            project_id=project_id,
            link_type=link_data.link_type,
            url=link_data.url.strip(),
            label=link_data.label.strip() if link_data.label else None,
        )
        db.add(link)
        await db.commit()
        await db.refresh(link)
        return link
