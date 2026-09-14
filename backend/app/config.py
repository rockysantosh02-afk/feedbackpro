"""Application Settings and Environment Configuration."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_SQLITE_PATH = Path(__file__).resolve().parent.parent / "feedbackpro.db"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"

    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{_DEFAULT_SQLITE_PATH}"

    # Security & Tokens
    JWT_SECRET: str = "dev_secret_key_feedbackpro_super_secure_32_chars_long"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    IP_HASH_SALT: str = "feedbackpro_privacy_salt_2026"

    # Worker Queue
    QUEUE_TYPE: Literal["database", "redis"] = "database"
    REDIS_URL: str = "redis://localhost:6379/0"
    WORKER_POLL_INTERVAL_SECONDS: float = 2.0
    WORKER_MAX_CONCURRENT_JOBS: int = 3
    INLINE_AUDIT_EXECUTION: bool = False

    # AI Provider
    AI_PROVIDER: Literal["deterministic", "openai", "gemini"] = "deterministic"
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Email
    EMAIL_PROVIDER: Literal["mock", "smtp", "resend"] = "mock"
    EMAIL_FROM: str = "no-reply@feedbackpro.ai"
    RESEND_API_KEY: str | None = None
    SMTP_HOST: str = "smtp.example.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None

    # Scanner bounds
    SCANNER_MAX_REDIRECTS: int = 5
    SCANNER_CONNECT_TIMEOUT_SECONDS: float = 5.0
    SCANNER_READ_TIMEOUT_SECONDS: float = 10.0
    SCANNER_MAX_RESPONSE_BYTES: int = 5 * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
