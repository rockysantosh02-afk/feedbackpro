"""Authentication Service with Argon2id and Refresh Token Rotation/Reuse Detection."""

from datetime import datetime, timedelta, timezone
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import (
    create_access_token,
    generate_secure_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.db.models.user import RefreshToken, User
from app.schemas.auth import TokenResponse, UserLoginRequest, UserRegisterRequest

settings = get_settings()


class AuthService:
    @classmethod
    async def register_user(cls, db: AsyncSession, data: UserRegisterRequest) -> User:
        clean_email = data.email.lower().strip()

        # Check existing user
        existing = await db.scalar(select(User).where(User.email == clean_email))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists.",
            )

        hashed_pw = hash_password(data.password)
        new_user = User(
            email=clean_email,
            password_hash=hashed_pw,
            name=data.name.strip(),
            role="user",
            email_verified=False,
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user

    @classmethod
    async def login_user(cls, db: AsyncSession, data: UserLoginRequest) -> TokenResponse:
        clean_email = data.email.lower().strip()
        user = await db.scalar(select(User).where(User.email == clean_email))
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Generate tokens
        access_token = create_access_token(user_id=user.id, role=user.role)
        plain_refresh_token = generate_secure_token()
        token_hash_val = hash_token(plain_refresh_token)

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        refresh_entry = RefreshToken(
            token_hash=token_hash_val,
            user_id=user.id,
            expires_at=expires_at,
        )
        db.add(refresh_entry)
        await db.commit()

        return TokenResponse(
            access_token=access_token,
            refresh_token=plain_refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    @classmethod
    async def rotate_refresh_token(cls, db: AsyncSession, refresh_token_str: str) -> TokenResponse:
        token_hash_val = hash_token(refresh_token_str)
        token_entry = await db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash_val))

        now = datetime.now(timezone.utc)

        if not token_entry:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token.",
            )

        # REUSE DETECTION: If token is already revoked or replaced, an attacker or compromised client is reusing it
        if token_entry.revoked_at is not None or token_entry.replaced_by_token is not None:
            # Revoke ALL refresh tokens for this user immediately as a safety precaution
            await db.execute(
                update(RefreshToken)
                .where(RefreshToken.user_id == token_entry.user_id)
                .values(revoked_at=now)
            )
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Security alert: Refresh token reuse detected. All active sessions have been revoked.",
            )

        # Check expiration
        if token_entry.expires_at.tzinfo is None:
            entry_expires = token_entry.expires_at.replace(tzinfo=timezone.utc)
        else:
            entry_expires = token_entry.expires_at

        if entry_expires < now:
            token_entry.revoked_at = now
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired. Please log in again.",
            )

        # Fetch user
        user = await db.get(User, token_entry.user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found.")

        # Rotate: Mark old token as revoked and generate new pair
        new_plain_refresh = generate_secure_token()
        new_token_hash = hash_token(new_plain_refresh)

        token_entry.revoked_at = now
        token_entry.replaced_by_token = new_token_hash

        new_entry = RefreshToken(
            token_hash=new_token_hash,
            user_id=user.id,
            expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        db.add(new_entry)

        new_access_token = create_access_token(user_id=user.id, role=user.role)
        await db.commit()

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_plain_refresh,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    @classmethod
    async def logout_user(cls, db: AsyncSession, refresh_token_str: str) -> None:
        token_hash_val = hash_token(refresh_token_str)
        token_entry = await db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash_val))
        if token_entry:
            token_entry.revoked_at = datetime.now(timezone.utc)
            await db.commit()
