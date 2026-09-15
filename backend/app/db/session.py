"""Database Session and Async Engine Configuration."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings

settings = get_settings()

raw_url = settings.DATABASE_URL
# Normalize Render's standard postgresql:// URL to asyncpg driver
if raw_url.startswith("postgres://"):
    raw_url = raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+asyncpg://"):
    raw_url = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# SQLite specific connect args for async support
connect_args = {}
if "sqlite" in raw_url:
    connect_args["check_same_thread"] = False

# Engine kwargs
engine_kwargs = {
    "echo": False,
    "future": True,
    "pool_pre_ping": True,
    "connect_args": connect_args,
}

if "sqlite" not in raw_url:
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_recycle": 1800,
    })

engine = create_async_engine(
    raw_url,
    **engine_kwargs,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
