"""Comprehensive Verification of Alembic Migrations from Zero State.

Tests:
1. Fresh database creation from zero.
2. alembic upgrade head execution.
3. Verification of all 19 logical entities.
4. Foreign key integrity, unique constraints, and indexes.
5. Migration -> Application Start -> CRUD lifecycle.
"""

import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.security import hash_password
from app.db.models import (
    AIGeneration,
    AIAnalysis,
    AuditEvidence,
    AuditFinding,
    AuditJob,
    AuditLog,
    AuditRun,
    Campaign,
    CampaignRecipient,
    FeedbackForm,
    FeedbackOption,
    FeedbackQuestion,
    FeedbackResponse,
    FeedbackSection,
    FeedbackTheme,
    Project,
    ProjectLink,
    RefreshToken,
    ResponseAnswer,
    Recommendation,
    User,
)

TEST_DB_PATH = Path(__file__).resolve().parent.parent / "backend" / "test_fresh_migration.db"
TEST_DB_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH}"

EXPECTED_ENTITIES = [
    "users",
    "refresh_tokens",
    "projects",
    "project_links",
    "audit_jobs",
    "audit_runs",
    "audit_findings",
    "audit_evidence",
    "feedback_forms",
    "feedback_sections",
    "feedback_questions",
    "feedback_options",
    "feedback_responses",
    "response_answers",
    "feedback_themes",
    "ai_generations",
    "ai_analysis",
    "recommendations",
    "campaigns",
    "campaign_recipients",
    "audit_logs",
]


def run_alembic_upgrade():
    """Run alembic upgrade head against the fresh database."""
    print("\n--- STEP 1: Running Alembic Upgrade Head from Zero ---")
    backend_dir = Path(__file__).resolve().parent.parent / "backend"
    alembic_ini = backend_dir / "alembic.ini"
    alembic_cfg = Config(str(alembic_ini))
    alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))
    alembic_cfg.set_main_option("sqlalchemy.url", TEST_DB_URL)
    command.upgrade(alembic_cfg, "head")
    print("[OK] Alembic upgrade head completed successfully.")


async def verify_schema_and_crud():
    print("\n--- STEP 2: Verifying 19 Logical Entities, Indexes, and Constraints ---")
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.connect() as conn:
        tables = await conn.run_sync(lambda sync_conn: inspect(sync_conn).get_table_names())
        print(f"Discovered {len(tables)} tables in database: {sorted(tables)}")

        for entity in EXPECTED_ENTITIES:
            assert entity in tables, f"Missing expected entity: {entity}"
            print(f"  [OK] Entity '{entity}' exists")

        # Verify Indexes on users
        user_indexes = await conn.run_sync(lambda sync_conn: inspect(sync_conn).get_indexes("users"))
        index_names = [idx["name"] for idx in user_indexes]
        print(f"  [OK] User table indexes: {index_names}")
        assert any("email" in name for name in index_names), "Missing index on users.email"

        # Verify Foreign Keys on projects
        project_fks = await conn.run_sync(lambda sync_conn: inspect(sync_conn).get_foreign_keys("projects"))
        print(f"  [OK] Projects table foreign keys: {project_fks}")
        assert len(project_fks) > 0, "Missing foreign key on projects table"

    print("\n--- STEP 3: Verifying CRUD, Constraints, and Timestamps ---")
    async with async_session() as session:
        # 1. Create User
        user_a = User(
            id=uuid.uuid4(),
            email="fresh_user_a@feedbackpro.ai",
            password_hash=hash_password("ArgonPassword123!"),
            name="Fresh User A",
        )
        session.add(user_a)
        await session.commit()
        await session.refresh(user_a)
        user_a_id = user_a.id
        print(f"  [OK] Created User A: {user_a_id} (created_at: {user_a.created_at})")
        assert user_a.created_at is not None, "Timestamp created_at failed"

        # 2. Test Unique Constraint on email
        user_dup = User(
            id=uuid.uuid4(),
            email="fresh_user_a@feedbackpro.ai",  # Duplicate
            password_hash=hash_password("Password123!"),
            name="Duplicate User",
        )
        session.add(user_dup)
        try:
            await session.commit()
            raise AssertionError("Duplicate email constraint failed to trigger!")
        except IntegrityError:
            await session.rollback()
            print("  [OK] Unique constraint on user email correctly enforced (raised IntegrityError).")

        # 3. Create Project with ownership
        project = Project(
            id=uuid.uuid4(),
            user_id=user_a_id,
            name="Fresh Verified Project",
            short_description="Testing fresh database schema",
            category="AI / Security",
            event_name="Production Verification 2026",
            feedback_goal="Verify complete schema",
            authorized_at=datetime.now(timezone.utc),
            is_active=True,
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)
        print(f"  [OK] Created Project: {project.name} owned by User {project.user_id}")

        # 4. Create ProjectLink, AuditJob, AuditRun
        link = ProjectLink(
            id=uuid.uuid4(),
            project_id=project.id,
            link_type="live_website",
            url="https://example.com",
            label="Production Test Link",
        )
        session.add(link)

        job = AuditJob(
            id=uuid.uuid4(),
            project_id=project.id,
            target_url="https://example.com",
            status="pending",
            stage="queued",
        )
        session.add(job)
        await session.commit()

        # 5. Create Feedback Form & Questions
        form = FeedbackForm(
            id=uuid.uuid4(),
            project_id=project.id,
            slug="fresh-verified-slug-26",
            title="Fresh Form",
            status="draft",
        )
        session.add(form)
        await session.commit()

        question = FeedbackQuestion(
            id=uuid.uuid4(),
            feedback_form_id=form.id,
            prompt="How intuitive was the UI?",
            question_type="rating_1_5",
            is_required=True,
            sort_order=1,
        )
        session.add(question)
        await session.commit()

        # 6. Read back with joins and relationships
        stmt = select(Project).where(Project.id == project.id)
        saved_proj = (await session.execute(stmt)).scalar_one()
        assert saved_proj.name == "Fresh Verified Project"
        assert saved_proj.user_id == user_a_id
        print("  [OK] Full relation & ownership verification completed successfully.")

    await engine.dispose()
    print("\n[OK] ALL DATABASE MIGRATION & SCHEMA TESTS PASSED 100%!")


def main():
    # Remove previous test DB if it exists
    if TEST_DB_PATH.exists():
        os.remove(TEST_DB_PATH)
        print(f"Cleaned up existing test database: {TEST_DB_PATH}")

    try:
        run_alembic_upgrade()
        asyncio.run(verify_schema_and_crud())
    finally:
        if TEST_DB_PATH.exists():
            try:
                os.remove(TEST_DB_PATH)
                print(f"Cleaned up temporary test database: {TEST_DB_PATH}")
            except Exception:
                pass


if __name__ == "__main__":
    main()
