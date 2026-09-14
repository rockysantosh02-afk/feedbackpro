"""Transactional Job Queue Manager for Audit Workers."""

from datetime import datetime, timedelta, timezone
import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.audit import AuditJob


class DatabaseJobQueue:
    @classmethod
    async def lease_next_job(
        cls,
        db: AsyncSession,
        worker_id: str,
        lease_timeout_seconds: int = 180,
    ) -> AuditJob | None:
        """Atomically leases the next available pending or timed-out job."""
        now = datetime.now(timezone.utc)
        stale_threshold = now - timedelta(seconds=lease_timeout_seconds)

        # Select next eligible job with row locking where supported
        stmt = (
            select(AuditJob)
            .where(
                or_(
                    AuditJob.status == "pending",
                    (AuditJob.status == "processing") & (AuditJob.locked_at < stale_threshold),
                ),
                AuditJob.attempts < AuditJob.max_attempts,
            )
            .order_by(AuditJob.created_at.asc())
            .limit(1)
        )

        try:
            bind = db.get_bind()
            if bind and bind.dialect.name == "postgresql":
                stmt = stmt.with_for_update(skip_locked=True)
        except Exception:
            pass

        job = await db.scalar(stmt)
        if not job:
            return None

        # Atomically claim the lease
        job.status = "processing"
        job.worker_id = worker_id
        job.locked_at = now
        await db.commit()
        await db.refresh(job)
        return job
