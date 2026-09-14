"""Standalone Audit Background Worker Daemon."""

import asyncio
import signal
import sys

from app.core.logging import logger
from app.db.session import AsyncSessionLocal
from app.services.audit_service import AuditService
from app.workers.queue import DatabaseJobQueue
from app.workers.worker_config import WorkerSettings


class AuditWorkerDaemon:
    def __init__(self):
        self.settings = WorkerSettings()
        self.is_running = False
        self.worker_id = self.settings.WORKER_ID

    async def run(self):
        self.is_running = True
        logger.info(f"[AuditWorker] Starting daemon {self.worker_id} (poll interval: {self.settings.POLL_INTERVAL_SECONDS}s)...")

        while self.is_running:
            try:
                async with AsyncSessionLocal() as db:
                    job = await DatabaseJobQueue.lease_next_job(
                        db=db,
                        worker_id=self.worker_id,
                        lease_timeout_seconds=self.settings.LEASE_TIMEOUT_SECONDS,
                    )

                    if job:
                        logger.info(f"[AuditWorker {self.worker_id}] Leased job {job.id} for target: {job.target_url}")
                        await AuditService.execute_audit_pipeline(db, job.id)
                        logger.info(f"[AuditWorker {self.worker_id}] Finished job {job.id}")
                    else:
                        await asyncio.sleep(self.settings.POLL_INTERVAL_SECONDS)

            except Exception as e:
                logger.error(f"[AuditWorker {self.worker_id}] Error in worker loop: {e}")
                await asyncio.sleep(self.settings.POLL_INTERVAL_SECONDS)

    def stop(self):
        logger.info(f"[AuditWorker] Stopping daemon {self.worker_id}...")
        self.is_running = False


async def main():
    daemon = AuditWorkerDaemon()

    def handle_sigterm(*_):
        daemon.stop()

    if sys.platform != "win32":
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, daemon.stop)

    await daemon.run()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass
