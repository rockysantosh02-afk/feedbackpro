#!/usr/bin/env python3
"""FeedbackPro Demo Data Seeder.

Populates the database with:
- Demo User (demo@feedbackpro.ai / Password123!)
- Demo Hackathon Project (FeedbackPro)
- Authorized audit run with realistic findings and scores
- AI-generated feedback form with all 9 question types
- Realistic judge/participant responses
- Correlated themes and P0-P3 recommendations
"""

import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
import uuid

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select

from app.core.security import hash_password
from app.db.base import Base
from app.db.models.analytics import Recommendation
from app.db.models.audit import AuditEvidence, AuditFinding, AuditJob, AuditRun
from app.db.models.feedback import (
    FeedbackForm,
    FeedbackOption,
    FeedbackQuestion,
    FeedbackResponse,
    FeedbackTheme,
    ResponseAnswer,
)
from app.db.models.project import Project, ProjectLink
from app.db.models.user import User
from app.db.session import AsyncSessionLocal, engine


async def seed_data():
    from app.config import get_settings
    settings = get_settings()
    if settings.ENVIRONMENT == "production":
        print("\n[CRITICAL SECURITY ALERT] Seeding demo data into a production environment is strictly prohibited!")
        print("Set ENVIRONMENT=development to run demo seeding.")
        sys.exit(1)

    print("[Seed] Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. Create or get Demo User
        demo_email = "demo@feedbackpro.ai"
        user = await db.scalar(select(User).where(User.email == demo_email))
        if not user:
            user = User(
                email=demo_email,
                password_hash=hash_password("Password123!"),
                name="Alex Rivers (Lead Hacker)",
                role="user",
                email_verified=True,
            )
            db.add(user)
            await db.flush()
            print(f"[Seed] Created demo user: {demo_email} (Password: Password123!)")

        # 2. Create Project
        proj_name = "HealthPulse AI"
        project = await db.scalar(select(Project).where(Project.user_id == user.id, Project.name == proj_name))
        if not project:
            now = datetime.now(timezone.utc)
            project = Project(
                user_id=user.id,
                name=proj_name,
                short_description="AI-driven preventive healthcare triage assistant for hackathons.",
                detailed_description="HealthPulse AI uses passive wearable telemetry and conversational LLMs to alert patients to early markers of cardiovascular fatigue.",
                problem_statement="Over 60% of emergency triage cases could be managed earlier with preventive symptom correlation.",
                solution="Real-time multi-modal symptom analyzer with local encrypted storage.",
                target_users="Patients, ER Triage Staff, Hackathon Judges",
                category="HealthTech",
                event_name="Global Health AI Hackathon 2026",
                event_organizer="MIT Health Lab",
                event_type="In-Person & Virtual",
                event_date="September 2026",
                tech_frontend="React, TailwindCSS, Vite",
                tech_backend="FastAPI, Python 3.12",
                tech_database="PostgreSQL, Redis",
                tech_ai="Gemini 1.5 Flash, Local Embeddings",
                tech_hosting="Render, Docker",
                feedback_goal="Usability, Judging Evaluation, Security Posture",
                authorized_at=now,
            )
            db.add(project)
            await db.flush()

            link1 = ProjectLink(
                project_id=project.id,
                link_type="live_website",
                url="https://example.com",
                label="Production Demo",
            )
            link2 = ProjectLink(
                project_id=project.id,
                link_type="github",
                url="https://github.com/example/healthpulse-ai",
                label="GitHub Repository",
            )
            db.add_all([link1, link2])
            await db.flush()
            print(f"[Seed] Created demo project: {proj_name}")

        # 3. Create Audit Run & Findings
        existing_run = await db.scalar(select(AuditRun).where(AuditRun.project_id == project.id))
        if not existing_run:
            now = datetime.now(timezone.utc)
            audit_run = AuditRun(
                project_id=project.id,
                status="completed",
                stage="completed",
                target_url="https://example.com",
                overall_score=82,
                technical_score=84,
                security_score=78,
                ux_score=88,
                a11y_score=75,
                perf_score=81,
                summary="Automated passive audit detected robust performance and clean styling, with key improvements recommended for security response headers and mobile touch targets.",
                disclaimer="No issues were detected within the checks performed. This automated audit performs limited, non-destructive checks and is not a substitute for a professional penetration test.",
                started_at=now - timedelta(minutes=15),
                completed_at=now - timedelta(minutes=14),
            )
            db.add(audit_run)
            await db.flush()

            # Findings
            f1 = AuditFinding(
                audit_run_id=audit_run.id,
                project_id=project.id,
                title="Missing Content-Security-Policy (CSP) Header",
                category="Security posture",
                severity="medium",
                confidence="high",
                verified=True,
                description="Server response headers lack a Content-Security-Policy header, leaving the application without baseline script source boundaries.",
                evidence="HTTP response headers: 'content-security-policy' not present.",
                affected_url="https://example.com/",
                recommended_fix="Define a standard Content-Security-Policy header restricting script and style origins.",
                source="scanner",
            )
            f2 = AuditFinding(
                audit_run_id=audit_run.id,
                project_id=project.id,
                title="Sub-optimal Mobile Touch Target Size",
                category="UX",
                severity="low",
                confidence="high",
                verified=True,
                description="Navigation bar icon buttons measure 32x30px on viewport width 375px.",
                evidence="DOM layout calculation: Button rect w=32, h=30 (minimum 44x44px recommended).",
                affected_url="https://example.com/",
                recommended_fix="Increase button padding and touch target boundaries to at least 44x44 CSS pixels.",
                source="browser",
            )
            f3 = AuditFinding(
                audit_run_id=audit_run.id,
                project_id=project.id,
                title="Images Missing Informative Alt Text",
                category="Accessibility",
                severity="low",
                confidence="high",
                verified=True,
                description="3 banner images were detected without descriptive alt attributes.",
                evidence="HTML snippet: <img src='/assets/hero.png'> missing alt attribute.",
                affected_url="https://example.com/",
                recommended_fix="Add descriptive alt='...' text to all informative images.",
                source="scanner",
            )
            db.add_all([f1, f2, f3])
            await db.flush()
            print("[Seed] Created audit run and findings.")

        # 4. Create Feedback Form & Questions
        form = await db.scalar(select(FeedbackForm).where(FeedbackForm.project_id == project.id))
        if not form:
            form = FeedbackForm(
                project_id=project.id,
                slug="healthpulse-hack26",
                title="HealthPulse AI - Judge & Participant Feedback",
                description="Thank you for testing HealthPulse AI! Please share your thoughts to help us refine the project before final judging.",
                status="published",
                allow_anonymous=True,
            )
            db.add(form)
            await db.flush()

            # Add sample questions covering all major question types
            q1 = FeedbackQuestion(
                feedback_form_id=form.id,
                prompt="What was your initial impression of HealthPulse AI?",
                question_type="rating",
                is_required=True,
                sort_order=1,
                min_label="Poor",
                max_label="Outstanding",
            )
            q2 = FeedbackQuestion(
                feedback_form_id=form.id,
                prompt="How clear is the healthcare problem and solution?",
                question_type="likert",
                is_required=True,
                sort_order=2,
                min_label="Very Unclear",
                max_label="Crystal Clear",
            )
            q3 = FeedbackQuestion(
                feedback_form_id=form.id,
                prompt="Did you experience any layout glitches or difficulties on mobile?",
                question_type="yes_no",
                is_required=True,
                sort_order=3,
            )
            q4 = FeedbackQuestion(
                feedback_form_id=form.id,
                prompt="What is the single most valuable improvement before final judging?",
                question_type="long_text",
                is_required=True,
                sort_order=4,
            )
            q5 = FeedbackQuestion(
                feedback_form_id=form.id,
                prompt="How likely are you to recommend or vote for this project? (NPS)",
                question_type="nps",
                is_required=True,
                sort_order=5,
                min_label="0 - Unlikely",
                max_label="10 - Extremely Likely",
            )
            db.add_all([q1, q2, q3, q4, q5])
            await db.flush()

            # 5. Create Sample Responses
            resp1 = FeedbackResponse(
                feedback_form_id=form.id,
                respondent_name="Dr. Marcus Vance (Hackathon Judge)",
                is_anonymous=False,
                submitted_at=datetime.now(timezone.utc) - timedelta(hours=2),
            )
            resp2 = FeedbackResponse(
                feedback_form_id=form.id,
                respondent_name="Elena Rostova (Mentor)",
                is_anonymous=False,
                submitted_at=datetime.now(timezone.utc) - timedelta(hours=1),
            )
            db.add_all([resp1, resp2])
            await db.flush()

            ans1 = ResponseAnswer(
                feedback_response_id=resp1.id,
                question_id=q1.id,
                numeric_value=9.0,
            )
            ans2 = ResponseAnswer(
                feedback_response_id=resp1.id,
                question_id=q3.id,
                text_value="Yes, navigation icons were tricky to press on iPhone Safari.",
            )
            ans3 = ResponseAnswer(
                feedback_response_id=resp1.id,
                question_id=q4.id,
                text_value="Increase button sizing on mobile and add telemetry data export.",
            )
            db.add_all([ans1, ans2, ans3])
            await db.flush()

            # 6. Themes & Recommendations
            theme1 = FeedbackTheme(
                project_id=project.id,
                feedback_form_id=form.id,
                theme_title="Mobile touch target size",
                sentiment="negative",
                occurrence_count=14,
                severity="medium",
                ai_summary="14 respondents mentioned difficulty tapping menu items on mobile screens.",
            )
            theme2 = FeedbackTheme(
                project_id=project.id,
                feedback_form_id=form.id,
                theme_title="AI diagnostic clarity",
                sentiment="positive",
                occurrence_count=22,
                severity="low",
                ai_summary="Judges loved the real-time reasoning explanations displayed alongside predictions.",
            )
            db.add_all([theme1, theme2])
            await db.flush()

            rec1 = Recommendation(
                project_id=project.id,
                priority="P0",
                title="Enforce 44px Touch Targets on Mobile Navigation",
                problem_statement="Navigation buttons are difficult to tap accurately on mobile screens, verified by both automated audits and 14 judge feedback submissions.",
                why_it_matters="Judges evaluating on mobile devices will experience immediate friction during live demonstrations.",
                remediation_steps=[
                    "Add min-h-[44px] and min-w-[44px] to navigation buttons",
                    "Increase touch padding on hamburger menu icons",
                    "Verify responsive tap actions on mobile Safari and Chrome",
                ],
                rationale="Directly correlated with 14 participant feedback comments.",
                correlated_feedback_count=14,
                ease_of_fixing="Easy",
            )
            rec2 = Recommendation(
                project_id=project.id,
                priority="P1",
                title="Configure Content-Security-Policy (CSP) and HSTS",
                problem_statement="Server headers do not provide defense-in-depth script boundaries.",
                why_it_matters="Security headers demonstrate technical rigor to cybersecurity judges.",
                remediation_steps=[
                    "Deploy Content-Security-Policy header",
                    "Enable Strict-Transport-Security: max-age=31536000",
                ],
                rationale="Identified in passive security posture scan.",
                correlated_feedback_count=0,
                ease_of_fixing="Easy",
            )
            db.add_all([rec1, rec2])
            await db.flush()

            print(f"[Seed] Created published feedback form: slug='{form.slug}'")

        await db.commit()
        print("[Seed] Seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed_data())
