"""Audit Service and Execution Pipeline."""

from datetime import datetime, timezone
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.agents.bug_detection import BugDetectionAgent
from app.agents.security_posture import SecurityPostureAgent
from app.agents.ux_accessibility import UXAccessibilityAgent
from app.agents.website_inspection import WebsiteInspectionAgent
from app.db.models.audit import AuditEvidence, AuditFinding, AuditJob, AuditRun
from app.db.models.project import Project, ProjectLink
from app.schemas.finding import AuditEvidenceResponse, AuditFindingResponse
from app.security.url_safety import URLSafetyService


class AuditService:
    @classmethod
    async def create_audit_job(
        cls,
        db: AsyncSession,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
        target_url: str | None = None,
    ) -> AuditJob:
        """Validates project ownership, audit authorization, and target URL before queuing an audit job."""
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

        # Explicit authorization requirement
        if not project.authorized_at:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Automated audit has not been explicitly authorized by the project owner.",
            )

        # Resolve target URL
        resolved_url = target_url
        if not resolved_url:
            for link in project.links:
                if link.link_type == "live_website":
                    resolved_url = link.url
                    break

        if not resolved_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No live website URL provided or associated with this project.",
            )

        # 6-Layer SSRF Pre-Validation
        validation = URLSafetyService.validate_url(resolved_url)
        if not validation.is_safe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Security Policy: Target URL rejected ({validation.error_message})",
            )

        job = AuditJob(
            project_id=project.id,
            target_url=validation.normalized_url or resolved_url,
            status="pending",
            stage="queued",
            attempts=0,
            max_attempts=3,
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)
        return job

    @classmethod
    async def execute_audit_pipeline(cls, db: AsyncSession, job_id: uuid.UUID) -> AuditRun:
        """Executes the safe, passive audit pipeline across all stages."""
        job = await db.get(AuditJob, job_id)
        if not job:
            raise ValueError(f"AuditJob {job_id} not found")

        now = datetime.now(timezone.utc)
        job.status = "processing"
        job.started_at = now
        job.attempts += 1

        # Create or fetch associated audit run
        audit_run = AuditRun(
            project_id=job.project_id,
            job_id=job.id,
            status="running",
            stage="validating_url",
            target_url=job.target_url,
            started_at=now,
        )
        db.add(audit_run)
        await db.commit()
        await db.refresh(audit_run)

        try:
            # Stage 1: Validating URL
            job.stage = "validating"
            audit_run.stage = "validating"
            await db.commit()

            validation = URLSafetyService.validate_url(job.target_url)
            if not validation.is_safe:
                raise ValueError(f"SSRF validation blocked target: {validation.error_message}")

            # Stage 2: Safe HTTP Inspection
            job.stage = "inspecting"
            audit_run.stage = "inspecting"
            await db.commit()

            fetch_result = await URLSafetyService.safe_fetch(validation.normalized_url or job.target_url)

            # Stage 3: Passive Security Posture Checks
            job.stage = "security_checks"
            audit_run.stage = "security_checks"
            await db.commit()

            sec_agent = SecurityPostureAgent()
            sec_output = await sec_agent.evaluate_posture(fetch_result.headers, fetch_result.final_url)

            # Stage 4: UX & Accessibility Checks
            job.stage = "ux_accessibility"
            audit_run.stage = "ux_accessibility"
            await db.commit()

            ux_agent = UXAccessibilityAgent()
            ux_output = await ux_agent.evaluate_ux_and_a11y(fetch_result.body, fetch_result.final_url)

            # Stage 5: Bug Detection & Website Inspection
            job.stage = "bug_detection"
            audit_run.stage = "bug_detection"
            await db.commit()

            inspect_agent = WebsiteInspectionAgent()
            inspection_findings = await inspect_agent.inspect(
                {
                    "status_code": fetch_result.status_code,
                    "response_time_ms": fetch_result.response_time_ms,
                    "target_url": fetch_result.final_url,
                }
            )

            bug_agent = BugDetectionAgent()
            bug_findings = await bug_agent.detect_bugs(
                {
                    "target_url": fetch_result.final_url,
                    "console_errors": [],
                    "failed_network_requests": [],
                },
                html_sample=fetch_result.body[:2000],
            )

            # Combine all findings
            all_findings = []
            all_findings.extend(inspection_findings)
            all_findings.extend(sec_output.findings)
            all_findings.extend(ux_output.findings)
            all_findings.extend(bug_findings)

            # Stage 6: Deterministic Scoring Calculation
            job.stage = "scoring"
            audit_run.stage = "scoring"
            await db.commit()

            # Technical score
            technical_score = 100
            for f in inspection_findings + bug_findings:
                if f.severity == "critical":
                    technical_score -= 25
                elif f.severity == "high":
                    technical_score -= 15
                elif f.severity == "medium":
                    technical_score -= 10
                else:
                    technical_score -= 5
            technical_score = max(technical_score, 10)

            # Performance score
            perf_score = max(100 - int(fetch_result.response_time_ms / 50), 20)

            security_score = sec_output.security_score
            ux_score = ux_output.ux_score
            a11y_score = ux_output.a11y_score

            # Overall weighted score
            overall_score = int(
                (0.25 * technical_score)
                + (0.25 * security_score)
                + (0.20 * ux_score)
                + (0.15 * a11y_score)
                + (0.15 * perf_score)
            )

            # Save findings and evidence in DB
            for f_item in all_findings:
                finding = AuditFinding(
                    audit_run_id=audit_run.id,
                    project_id=job.project_id,
                    title=f_item.title,
                    category=f_item.category,
                    severity=f_item.severity,
                    confidence=f_item.confidence,
                    verified=True,
                    description=f_item.description,
                    evidence=f_item.evidence,
                    affected_url=f_item.affected_url,
                    recommended_fix=f_item.recommended_fix,
                    source="scanner",
                )
                db.add(finding)
                await db.flush()

                # Add evidence item
                evidence_obj = AuditEvidence(
                    audit_finding_id=finding.id,
                    evidence_type="http_inspection",
                    data={
                        "status_code": fetch_result.status_code,
                        "response_time_ms": fetch_result.response_time_ms,
                        "resolved_ips": fetch_result.resolved_ips,
                    },
                    raw_snippet=f_item.evidence,
                )
                db.add(evidence_obj)

            # Mark audit run complete
            audit_run.status = "completed"
            audit_run.stage = "completed"
            audit_run.overall_score = overall_score
            audit_run.technical_score = technical_score
            audit_run.security_score = security_score
            audit_run.ux_score = ux_score
            audit_run.a11y_score = a11y_score
            audit_run.perf_score = perf_score
            audit_run.summary = (
                f"Automated passive audit completed successfully. Overall project health score: {overall_score}/100. "
                f"Identified {len(all_findings)} observable findings."
            )
            audit_run.completed_at = datetime.now(timezone.utc)

            job.status = "completed"
            job.stage = "completed"
            job.completed_at = datetime.now(timezone.utc)
            await db.commit()

            return audit_run

        except Exception as e:
            error_text = str(e)
            job.status = "failed"
            job.error_message = error_text
            audit_run.status = "failed"
            audit_run.error_message = error_text
            audit_run.completed_at = datetime.now(timezone.utc)
            await db.commit()
            raise

    @classmethod
    async def get_latest_audit_run(
        cls, db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID
    ) -> AuditRun | None:
        # Verify ownership
        p_stmt = select(Project).where(Project.id == project_id, Project.user_id == user_id)
        if not await db.scalar(p_stmt):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        stmt = (
            select(AuditRun)
            .where(AuditRun.project_id == project_id)
            .options(
                selectinload(AuditRun.findings).selectinload(AuditFinding.evidence_items)
            )
            .order_by(AuditRun.created_at.desc())
        )
        return await db.scalar(stmt)
