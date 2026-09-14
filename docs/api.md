# FeedbackPro — REST API Reference

All API routes are prefixed with `/api/v1` unless noted otherwise.

---

## 1. Authentication (`/api/v1/auth`)

### `POST /api/v1/auth/register`
Register a new project owner account.
* **Request Body:**
  ```json
  {
    "email": "developer@hackathon.org",
    "password": "SecurePassword123!",
    "full_name": "Alex Developer"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "user": {
      "id": "c1f7a4e0-...",
      "email": "developer@hackathon.org",
      "full_name": "Alex Developer",
      "is_active": true
    },
    "tokens": {
      "access_token": "eyJhbGciOi...",
      "refresh_token": "eyJhbGciOi...",
      "token_type": "bearer"
    }
  }
  ```

### `POST /api/v1/auth/login`
Authenticate with email and password.
* **Request Body:**
  ```json
  {
    "email": "developer@hackathon.org",
    "password": "SecurePassword123!"
  }
  ```
* **Response (200 OK):**
  Same token and user schema as register.

### `POST /api/v1/auth/refresh`
Exchange a refresh token for a new access token and rotated refresh token.
* **Request Body:**
  ```json
  {
    "refresh_token": "eyJhbGciOi..."
  }
  ```
* **Response (200 OK):** Rotated token pair.

### `GET /api/v1/auth/me`
Retrieve currently authenticated user profile.
* **Header:** `Authorization: Bearer <access_token>`
* **Response (200 OK):** `UserResponse`

---

## 2. Projects (`/api/v1/projects`)

### `GET /api/v1/projects`
List all projects owned by the authenticated user.
* **Response (200 OK):** Array of `ProjectResponse`

### `POST /api/v1/projects`
Create a new project. Requires explicit audit authorization.
* **Request Body:**
  ```json
  {
    "name": "HealthPulse AI",
    "short_description": "AI-powered wearable telemetry monitoring",
    "category": "AI / Healthcare",
    "event_name": "HackMIT 2026",
    "feedback_goal": "Prepare for final judge review",
    "authorize_audit": true,
    "links": [
      {
        "link_type": "website",
        "url": "https://healthpulse-ai.vercel.app",
        "label": "Production Demo"
      }
    ]
  }
  ```
* **Response (201 Created):** `ProjectResponse`

### `GET /api/v1/projects/{id}`
Retrieve project details by ID with ownership verification (anti-IDOR).

---

## 3. Automated Audits (`/api/v1/projects/{id}/audit`)

### `POST /api/v1/projects/{id}/audit/start`
Trigger an asynchronous passive audit run.
* **Header:** `Authorization: Bearer <access_token>`
* **Response (200 OK):**
  ```json
  {
    "job_id": "a1b2c3d4-...",
    "status": "queued",
    "message": "Audit job queued successfully"
  }
  ```

### `GET /api/v1/projects/{id}/audit/status`
Poll current status and stage progress of an active audit job.
* **Response (200 OK):**
  ```json
  {
    "status": "running",
    "stage": "security_headers",
    "progress_percent": 60,
    "findings_count": 4,
    "error_message": null
  }
  ```

### `GET /api/v1/projects/{id}/audit/findings`
Retrieve all technical findings for the latest audit run.
* **Response (200 OK):**
  ```json
  [
    {
      "id": "f89a12c4-...",
      "title": "Missing Strict-Transport-Security (HSTS) Header",
      "category": "security",
      "severity": "medium",
      "confidence": "high",
      "verified": true,
      "description": "The response did not include an HSTS header, allowing potential protocol downgrade attacks.",
      "evidence": "Headers observed: content-type, server. Missing: strict-transport-security",
      "affected_url": "https://healthpulse-ai.vercel.app",
      "recommended_fix": "Add Strict-Transport-Security: max-age=31536000; includeSubDomains to your reverse proxy configuration."
    }
  ]
  ```

---

## 4. Feedback Questionnaire (`/api/v1/projects/{id}/form`)

### `GET /api/v1/projects/{id}/form`
Retrieve or auto-create the feedback questionnaire for a project.

### `POST /api/v1/projects/{id}/form/generate`
Use the SurveyGeneratorAgent to synthesize questions.
* **Request Body (optional):**
  ```json
  {
    "focus_area": "Usability & Accessibility"
  }
  ```

### `POST /api/v1/projects/{id}/form/publish`
Publish questionnaire to the public portal (`status = 'published'`).

### `POST /api/v1/projects/{id}/form/unpublish`
Revert questionnaire to draft mode.

### `GET /api/v1/projects/{id}/form/qr`
Generate a high-contrast QR code pointing to the public feedback form.
* **Response (200 OK):**
  ```json
  {
    "slug": "healthpulse-hack26",
    "qr_code_url": "data:image/png;base64,iVBORw0KGgo..."
  }
  ```

---

## 5. Public Feedback Portal (`/api/v1/public/forms`)

*Hostile-facing endpoints protected by sliding-window rate limiters and honeypot validation.*

### `GET /api/v1/public/forms/{slug}`
Fetch public questionnaire structure by slug. No authentication required.

### `POST /api/v1/public/forms/{slug}/responses`
Submit respondent answers.
* **Request Body:**
  ```json
  {
    "respondent_name": "Jordan Smith",
    "respondent_email": "jordan@example.com",
    "is_anonymous": false,
    "honeypot": "",
    "answers": [
      {
        "question_id": "q1-uuid",
        "numeric_value": 5
      },
      {
        "question_id": "q2-uuid",
        "text_value": "The telemetry chart loads instantly, but the axis labels on mobile are clipped."
      }
    ]
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Thank you! Your feedback has been recorded safely.",
    "response_id": "resp-uuid"
  }
  ```

---

## 6. Feedback Analytics (`/api/v1/projects/{id}/analytics`)

### `GET /api/v1/projects/{id}/analytics`
Retrieve aggregated sentiment distribution, NPS score, top strengths, and recurring themes.

### `POST /api/v1/projects/{id}/analytics/correlate`
Trigger the AuditFeedbackCorrelationAgent to correlate feedback with audit findings.

---

## 7. Reports & Multi-Format Exports (`/api/v1/projects/{id}/report`)

### `GET /api/v1/projects/{id}/report`
Retrieve the comprehensive Project Health Report.

### `GET /api/v1/projects/{id}/report/export?format=json|csv|pdf`
Download the report in the requested format with headers configured for attachment download.
* Supported formats: `json`, `csv`, `pdf`.
* CSV output is guaranteed safe against formula injection (`CSVSanitizer`).
