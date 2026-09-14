"""Audit Execution and Findings Routes."""

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.db.models.audit import AuditFinding, AuditJob, AuditRun
from app.db.models.user import User
from app.db.session import AsyncSessionLocal, get_db
from app.dependencies import get_current_user, get_project_for_user
from app.schemas.audit import AuditJobResponse, AuditRunResponse, AuditTriggerRequest
from app.schemas.finding import AuditFindingResponse
from app.security.rate_limiter import audit_trigger_limiter
from app.services.audit_service import AuditService

router = APIRouter(prefix="/projects/{project_id}/audit", tags=["Audit"])


async def run_audit_in_background(job_id: uuid.UUID):
    """Background task trigger for immediate local processing when worker is not a separate service."""
    async with AsyncSessionLocal() as db:
        try:
            await AuditService.execute_audit_pipeline(db, job_id)
        except Exception as e:
            print(f"[BackgroundAuditTask] Failed executing job {job_id}: {e}")


@router.post("", response_model=AuditJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def trigger_audit(
    project_id: uuid.UUID,
    request: Request,
    background_tasks: BackgroundTasks,
    data: AuditTriggerRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    audit_trigger_limiter.check(request, key_prefix="audit_trigger")
    target_url = data.target_url if data else None

    job = await AuditService.create_audit_job(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        target_url=target_url,
    )

    # Only run in-process if INLINE_AUDIT_EXECUTION is explicitly enabled; otherwise leave in queue for dedicated worker
    settings = get_settings()
    if settings.INLINE_AUDIT_EXECUTION:
        background_tasks.add_task(run_audit_in_background, job.id)

    return job


@router.get("", response_model=AuditRunResponse | None)
async def get_latest_audit(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AuditService.get_latest_audit_run(db, project_id, current_user.id)


@router.get("/findings", response_model=list[AuditFindingResponse])
async def list_findings(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify ownership
    await get_project_for_user(project_id, current_user, db)

    stmt = (
        select(AuditFinding)
        .where(AuditFinding.project_id == project_id)
        .options(selectinload(AuditFinding.evidence_items))
        .order_by(AuditFinding.severity.asc())
    )
    res = await db.scalars(stmt)
    return list(res.all())


@router.get("/findings/{finding_id}", response_model=AuditFindingResponse)
async def get_finding_detail(
    project_id: uuid.UUID,
    finding_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_for_user(project_id, current_user, db)

    stmt = (
        select(AuditFinding)
        .where(AuditFinding.id == finding_id, AuditFinding.project_id == project_id)
        .options(selectinload(AuditFinding.evidence_items))
    )
    finding = await db.scalar(stmt)
    if not finding:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding
