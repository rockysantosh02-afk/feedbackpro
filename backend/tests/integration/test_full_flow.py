"""End-to-End Integration Flow: Project Creation to Feedback, Correlation, and Report Export."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_complete_platform_workflow(client: AsyncClient):
    # 1. Register & Login
    email = "lead_dev@hackathon.ai"
    password = "DevPassword123!"

    await client.post("/api/auth/register", json={"email": email, "password": password, "name": "Lead Dev"})
    login_res = await client.post("/api/auth/login", json={"email": email, "password": password})
    token = login_res.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Project with explicit audit authorization
    proj_res = await client.post(
        "/api/projects",
        headers=auth_headers,
        json={
            "name": "FeedbackPro Demo",
            "short_description": "AI Project Auditor & Feedback Platform for Hackathons",
            "event_name": "Global AI Hackathon 2026",
            "category": "ai-tools",
            "authorize_audit": True,
            "links": [
                {"link_type": "live_website", "url": "https://example.com", "label": "Live Demo"}
            ],
        },
    )
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]

    # 3. Trigger Audit
    audit_res = await client.post(f"/api/projects/{project_id}/audit", headers=auth_headers)
    assert audit_res.status_code == 202
    job_id = audit_res.json()["id"]
    assert job_id is not None

    # 4. Generate Feedback Form with AI
    form_gen_res = await client.post(
        f"/api/projects/{project_id}/form/generate",
        headers=auth_headers,
        json={"focus_area": "Usability and Mobile UX"},
    )
    assert form_gen_res.status_code == 200
    form_data = form_gen_res.json()
    assert len(form_data["questions"]) >= 5
    assert form_data["status"] == "draft"  # never auto-published without confirmation!

    # 5. Publish Form
    pub_res = await client.post(f"/api/projects/{project_id}/form/publish", headers=auth_headers)
    assert pub_res.status_code == 200
    published_form = pub_res.json()
    assert published_form["status"] == "published"
    slug = published_form["slug"]

    # 6. Public Submission (no auth header needed!)
    public_view = await client.get(f"/api/public/forms/{slug}")
    assert public_view.status_code == 200

    first_q_id = public_view.json()["questions"][0]["id"]
    submit_res = await client.post(
        f"/api/public/forms/{slug}/responses",
        json={
            "respondent_name": "Judge Smith",
            "is_anonymous": False,
            "answers": [
                {
                    "question_id": first_q_id,
                    "numeric_value": 9.0,
                    "text_value": "Exceptional presentation and fluid design!",
                }
            ],
        },
    )
    assert submit_res.status_code == 201

    # 7. Correlate Findings with Feedback
    corr_res = await client.post(f"/api/projects/{project_id}/analytics/correlate", headers=auth_headers)
    assert corr_res.status_code == 200
    recs = corr_res.json()
    assert len(recs) >= 1
    assert any(r["priority"] in ("P0", "P1") for r in recs)

    # 8. Fetch Final Health Report
    report_res = await client.get(f"/api/projects/{project_id}/report", headers=auth_headers)
    assert report_res.status_code == 200
    report_data = report_res.json()
    assert "scores" in report_data
    assert report_data["scores"]["overall"] > 0
    assert "No issues were detected within the checks performed" in report_data["disclaimer"]

    # 9. Test Multi-Format Exports
    # JSON export
    json_exp = await client.get(f"/api/projects/{project_id}/report/export?format=json", headers=auth_headers)
    assert json_exp.status_code == 200
    assert "project_name" in json_exp.text

    # CSV export
    csv_exp = await client.get(f"/api/projects/{project_id}/report/export?format=csv", headers=auth_headers)
    assert csv_exp.status_code == 200
    assert "--- AUDIT FINDINGS ---" in csv_exp.text

    # PDF export
    pdf_exp = await client.get(f"/api/projects/{project_id}/report/export?format=pdf", headers=auth_headers)
    assert pdf_exp.status_code == 200
    assert pdf_exp.headers["content-type"] == "application/pdf"
    assert pdf_exp.content.startswith(b"%PDF")
