"""Final Health Report and Multi-format Export Routes."""

import uuid
from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.db.session import get_db
from app.dependencies import get_current_user
from app.schemas.report import FinalHealthReport
from app.security.rate_limiter import report_export_limiter
from app.services.report_service import ReportService

router = APIRouter(prefix="/projects/{project_id}/report", tags=["Reports"])


@router.get("", response_model=FinalHealthReport)
async def get_report(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ReportService.build_health_report(db, project_id, current_user.id)


@router.get("/export")
async def export_report(
    project_id: uuid.UUID,
    request: Request,
    format: str = Query("json", pattern="^(json|csv|pdf)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    report_export_limiter.check(request, key_prefix="report_export")
    if format == "csv":
        csv_content = await ReportService.export_csv(db, project_id, current_user.id)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=project-{project_id}-health-report.csv"},
        )
    elif format == "pdf":
        pdf_bytes = await ReportService.export_pdf(db, project_id, current_user.id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=project-{project_id}-health-report.pdf"},
        )
    else:
        json_content = await ReportService.export_json(db, project_id, current_user.id)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=project-{project_id}-health-report.json"},
        )
