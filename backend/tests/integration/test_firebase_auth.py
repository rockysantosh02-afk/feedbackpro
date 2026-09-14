"""Integration and Security Test Suite for Firebase Authentication and User Mapping."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_firebase_auth_missing_token_rejected(client: AsyncClient):
    """Missing Authorization header must return 401 or 403."""
    res = await client.get("/api/auth/me")
    assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_firebase_auth_invalid_and_forged_token_rejected(client: AsyncClient):
    """Forged or invalid Firebase token must fail closed with 401."""
    # 1. Non-existent token
    res = await client.get("/api/auth/me", headers={"Authorization": "Bearer test_fb_invalid"})
    assert res.status_code == 401

    # 2. Arbitrary forged string
    res2 = await client.get("/api/auth/me", headers={"Authorization": "Bearer forged_fake_token_xyz"})
    assert res2.status_code == 401

    # 3. Expired token
    res3 = await client.get("/api/auth/me", headers={"Authorization": "Bearer test_fb_expired"})
    assert res3.status_code == 401

    # 4. Malformed authorization scheme
    res4 = await client.get("/api/auth/me", headers={"Authorization": "Basic dXNlcjpwYXNz"})
    assert res4.status_code in (401, 403)


@pytest.mark.asyncio
async def test_firebase_auth_new_user_provisioning(client: AsyncClient):
    """Valid Firebase token automatically provisions a PostgreSQL user mapped by firebase_uid."""
    fb_uid = "fb_user_alpha_12345"
    email = "alpha@firebase.test"
    name = "Alpha Firebase"
    token = f"test_fb_valid:{fb_uid}:{email}:{name}"

    # 1. Call /api/auth/me with valid Firebase token
    res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == email
    assert data["name"] == name
    assert "id" in data
    user_id = data["id"]

    # 2. Subsequent call with same token returns same PostgreSQL user ID
    res2 = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res2.status_code == 200
    assert res2.json()["id"] == user_id


@pytest.mark.asyncio
async def test_firebase_auth_existing_user_linking(client: AsyncClient):
    """Existing PostgreSQL user is resolved and linked to Firebase UID on first Firebase login."""
    existing_email = "pre_existing_dev@feedbackpro.ai"

    # 1. Create user via legacy registration
    reg_res = await client.post(
        "/api/auth/register",
        json={"email": existing_email, "password": "Password123!", "name": "Pre Existing Dev"},
    )
    assert reg_res.status_code == 201
    original_id = reg_res.json()["id"]

    # 2. Now user signs in with Firebase (same email, new Firebase UID)
    fb_uid = "fb_linked_uid_998877"
    token = f"test_fb_valid:{fb_uid}:{existing_email}:Pre Existing Dev"

    res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    linked_data = res.json()
    # The PostgreSQL user ID must remain the original internal identity!
    assert linked_data["id"] == original_id
    assert linked_data["email"] == existing_email


@pytest.mark.asyncio
async def test_firebase_sync_profile_endpoint(client: AsyncClient):
    """Endpoint /api/auth/firebase-sync updates display name in PostgreSQL."""
    fb_uid = "fb_sync_user_4455"
    email = "sync@firebase.test"
    token = f"test_fb_valid:{fb_uid}:{email}:InitialName"

    # 1. Call sync with new display name
    sync_res = await client.post(
        "/api/auth/firebase-sync",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Updated Hackathon Lead"},
    )
    assert sync_res.status_code == 200
    assert sync_res.json()["name"] == "Updated Hackathon Lead"

    # 2. Confirm /me reflects the updated name
    me_res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["name"] == "Updated Hackathon Lead"


@pytest.mark.asyncio
async def test_firebase_auth_multi_tenant_anti_idor(client: AsyncClient):
    """Verify User A cannot access User B resources when authenticated via Firebase."""
    token_a = "test_fb_valid:uid_user_a:usera@fb.test:User A"
    token_b = "test_fb_valid:uid_user_b:userb@fb.test:User B"

    # 1. User A creates a project
    proj_res = await client.post(
        "/api/projects",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "name": "Firebase Project Alpha",
            "short_description": "User A project with Firebase auth",
            "event_name": "MIT Hackathon",
            "authorize_audit": True,
        },
    )
    assert proj_res.status_code == 201
    proj_a_id = proj_res.json()["id"]

    # 2. User A can access own project
    get_own = await client.get(f"/api/projects/{proj_a_id}", headers={"Authorization": f"Bearer {token_a}"})
    assert get_own.status_code == 200

    # 3. User B CANNOT access User A's project (IDOR blocked with 404)
    get_res = await client.get(f"/api/projects/{proj_a_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert get_res.status_code == 404, "User B should be denied access to User A project"

    # 4. User B CANNOT update User A's project
    put_res = await client.put(
        f"/api/projects/{proj_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"name": "Hacked Title"},
    )
    assert put_res.status_code == 404

    # 5. User B CANNOT delete User A's project
    del_res = await client.delete(f"/api/projects/{proj_a_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert del_res.status_code == 404

    # 6. User B CANNOT view User A's project audit
    audit_res = await client.get(f"/api/projects/{proj_a_id}/audit", headers={"Authorization": f"Bearer {token_b}"})
    assert audit_res.status_code == 404

    # 7. User B CANNOT view User A's project report
    report_res = await client.get(f"/api/projects/{proj_a_id}/report", headers={"Authorization": f"Bearer {token_b}"})
    assert report_res.status_code == 404
