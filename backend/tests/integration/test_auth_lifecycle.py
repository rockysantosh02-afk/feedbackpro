"""Integration tests for Authentication Lifecycle and Token Reuse Defense."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_complete_auth_lifecycle(client: AsyncClient):
    email = "developer@feedbackpro.ai"
    password = "StrongPassword2026!"

    # 1. Register
    reg_res = await client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "name": "Dev User"},
    )
    assert reg_res.status_code == 201
    user_data = reg_res.json()
    assert user_data["email"] == email

    # 2. Duplicate registration fails
    dup_res = await client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "name": "Dev User"},
    )
    assert dup_res.status_code == 400

    # 3. Invalid password login fails
    bad_login = await client.post(
        "/api/auth/login",
        json={"email": email, "password": "WrongPassword!"},
    )
    assert bad_login.status_code == 401

    # 4. Successful login
    login_res = await client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    tokens = login_res.json()
    access_token_1 = tokens["access_token"]
    refresh_token_1 = tokens["refresh_token"]

    # 5. Access /api/auth/me with access token
    me_res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {access_token_1}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email

    # 6. Rotate refresh token
    rotate_res = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token_1},
    )
    assert rotate_res.status_code == 200
    new_tokens = rotate_res.json()
    access_token_2 = new_tokens["access_token"]
    refresh_token_2 = new_tokens["refresh_token"]
    assert refresh_token_2 != refresh_token_1

    # 7. REUSE DETECTION: Re-using old refresh_token_1 must fail and trigger compromise protection
    reuse_res = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token_1},
    )
    assert reuse_res.status_code == 401
    assert "reuse" in reuse_res.json()["detail"].lower()

    # 8. Because reuse was detected, the newest refresh token was also revoked
    subsequent_res = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token_2},
    )
    assert subsequent_res.status_code == 401
