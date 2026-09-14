"""FastAPI Dependencies for Authentication, Database Sessions, and Anti-IDOR Authorization."""

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.firebase import verify_firebase_id_token
from app.core.security import decode_access_token
from app.db.models.project import Project
from app.db.models.user import User
from app.db.session import get_db

security_bearer = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extracts and validates either a Firebase ID token or legacy JWT Bearer token, returning the user."""
    token = credentials.credentials

    # Fast detection: Check if token is our internal HS256 JWT
    is_legacy_jwt = False
    try:
        import jwt
        header = jwt.get_unverified_header(token)
        if header.get("alg") == "HS256":
            is_legacy_jwt = True
    except Exception:
        pass

    if is_legacy_jwt:
        try:
            payload = decode_access_token(token)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(e),
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id_str = payload.get("sub")
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token subject",
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            user_uuid = uuid.UUID(user_id_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Malformed user UUID",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = await db.get(User, user_uuid)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return user

    # 2. Attempt Firebase ID token verification
    fb_payload = verify_firebase_id_token(token)
    if fb_payload:
        firebase_uid = fb_payload.get("uid")
        email = (fb_payload.get("email") or "").lower().strip()
        name = fb_payload.get("name") or (email.split("@")[0] if email else "User")
        email_verified = fb_payload.get("email_verified", False)

        user = None
        # Lookup by Firebase UID (stable external identity)
        if firebase_uid:
            user = await db.scalar(select(User).where(User.firebase_uid == firebase_uid))

        # Lookup by email if not found by Firebase UID (link existing account)
        if not user and email:
            user = await db.scalar(select(User).where(User.email == email))
            if user:
                user.firebase_uid = firebase_uid
                if email_verified and not user.email_verified:
                    user.email_verified = True
                await db.commit()
                await db.refresh(user)

        # Auto-provision new PostgreSQL user for verified Firebase identity
        if not user and (firebase_uid or email):
            user = User(
                id=uuid.uuid4(),
                email=email or f"{firebase_uid}@firebase.feedbackpro.ai",
                firebase_uid=firebase_uid,
                name=name,
                role="user",
                email_verified=email_verified,
                password_hash=None,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

        if user:
            return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_project_for_user(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Anti-IDOR Ownership Check: Verifies that project exists AND belongs to the authenticated user.

    Returns 404 if not found or unauthorized to prevent IDOR object enumeration.
    """
    stmt = (
        select(Project)
        .where(Project.id == project_id, Project.user_id == current_user.id)
        .options(selectinload(Project.links))
    )
    project = await db.scalar(stmt)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied.",
        )
    return project
