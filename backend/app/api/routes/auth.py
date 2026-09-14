"""Authentication API Routes."""

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.db.session import get_db
from app.dependencies import get_current_user
from app.schemas.auth import (
    FirebaseSyncRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.security.rate_limiter import auth_limiter
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    data: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    auth_limiter.check(request, key_prefix="auth_register")
    user = await AuthService.register_user(db, data)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    data: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    auth_limiter.check(request, key_prefix="auth_login")
    return await AuthService.login_user(db, data)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request,
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    auth_limiter.check(request, key_prefix="auth_refresh")
    return await AuthService.rotate_refresh_token(db, data.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    await AuthService.logout_user(db, data.refresh_token)
    return None


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/firebase-sync", response_model=UserResponse)
async def firebase_sync(
    data: FirebaseSyncRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Syncs updated display name or profile metadata from Firebase to the PostgreSQL user record."""
    if data.name and data.name.strip():
        current_user.name = data.name.strip()
        await db.commit()
        await db.refresh(current_user)
    return current_user
