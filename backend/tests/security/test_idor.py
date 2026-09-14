"""Security Test Suite: Anti-IDOR Authorization and Ownership Verification."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_anti_idor_cross_user_access_blocked(client: AsyncClient):
    # 1. Register User A
    reg_a = await client.post(
        "/api/auth/register",
        json={"email": "usera@example.com", "password": "Password123!", "name": "User A"},
    )
    assert reg_a.status_code == 201

    login_a = await client.post(
        "/api/auth/login",
        json={"email": "usera@example.com", "password": "Password123!"},
    )
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. User A creates Project A
    proj_res = await client.post(
        "/api/projects",
        headers=headers_a,
        json={
            "name": "Project Alpha",
            "short_description": "User A proprietary project for hackathon",
            "event_name": "AI Global Hackathon",
            "authorize_audit": True,
        },
    )
    assert proj_res.status_code == 201
    project_a_id = proj_res.json()["id"]

    # 3. Register User B
    reg_b = await client.post(
        "/api/auth/register",
        json={"email": "userb@example.com", "password": "Password123!", "name": "User B"},
    )
    assert reg_b.status_code == 201

    login_b = await client.post(
        "/api/auth/login",
        json={"email": "userb@example.com", "password": "Password123!"},
    )
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 4. User B attempts IDOR attack against Project A
    # GET /api/projects/{project-A}
    get_res = await client.get(f"/api/projects/{project_a_id}", headers=headers_b)
    assert get_res.status_code in (403, 404), "IDOR GET should be denied!"

    # PUT /api/projects/{project-A}
    put_res = await client.put(
        f"/api/projects/{project_a_id}",
        headers=headers_b,
        json={"name": "Hacked Project"},
    )
    assert put_res.status_code in (403, 404), "IDOR PUT should be denied!"

    # DELETE /api/projects/{project-A}
    del_res = await client.delete(f"/api/projects/{project_a_id}", headers=headers_b)
    assert del_res.status_code in (403, 404), "IDOR DELETE should be denied!"

    # GET /api/projects/{project-A}/audit
    audit_res = await client.get(f"/api/projects/{project_a_id}/audit", headers=headers_b)
    assert audit_res.status_code in (403, 404), "IDOR audit access should be denied!"

    # GET /api/projects/{project-A}/report
    report_res = await client.get(f"/api/projects/{project_a_id}/report", headers=headers_b)
    assert report_res.status_code in (403, 404), "IDOR report access should be denied!"
