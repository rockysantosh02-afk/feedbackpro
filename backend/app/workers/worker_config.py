"""Background Audit Worker Configuration."""

import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "sqlite+aiosqlite:///./feedbackpro.db"
    WORKER_ID: str = os.getenv("WORKER_ID", f"worker-{os.getpid()}")
    POLL_INTERVAL_SECONDS: float = 2.0
    LEASE_TIMEOUT_SECONDS: int = 180
    MAX_ATTEMPTS: int = 3
