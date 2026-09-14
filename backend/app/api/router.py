"""Central API Router aggregation."""

from fastapi import APIRouter

from app.api.routes import (
    analytics,
    audits,
    auth,
    feedback,
    health,
    invitations,
    projects,
    public_feedback,
    reports,
)

api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(projects.router)
api_router.include_router(audits.router)
api_router.include_router(feedback.router)
api_router.include_router(public_feedback.router)
api_router.include_router(analytics.router)
api_router.include_router(reports.router)
api_router.include_router(invitations.router)

# Root health route
root_router = APIRouter()
root_router.include_router(health.router)
root_router.include_router(api_router)
