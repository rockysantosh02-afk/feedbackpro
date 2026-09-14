# FeedbackPro: AI Hackathon Project Auditor & Feedback Platform

FeedbackPro is a security-hardened, production-ready platform designed for hackathon organizers, participants, judges, and mentors. It automates non-destructive website auditing, generates context-aware feedback questionnaires via AI, collects public responses, and correlates technical audit findings with user sentiments to deliver prioritized (P0–P3) recommendations.

> **Security Disclaimer**
> *"No issues were detected within the tested scope. The system performs limited, non-destructive security posture checks and is not a substitute for exhaustive penetration testing or ongoing threat modeling."*

---

## 1. System Architecture

FeedbackPro follows a decoupled, defense-in-depth architecture where user-facing API traffic is isolated from background audit workers.

```
                  Internet / Public Users & Hackathon Judges
                                     │
                     ┌───────────────┴──────────────┐
                     │                              │
                     ▼                              ▼
          [feedbackpro-frontend]          [Public Feedback Form]
             React 18 / Vite SPA            Static Assets / CDN
                     │                              │
                     └───────────────┬──────────────┘
                                     │ HTTPS / REST API
                                     ▼
                           [feedbackpro-api]
                         FastAPI (Python 3.12)
                     (Auth, Projects, Forms, Reports)
                                     │
                     ┌───────────────┴──────────────┐
                     ▼                              ▼
          [Managed PostgreSQL 16]          [Transactional Queue]
             Multi-Tenant DB                 `audit_jobs` Table
             (19 Core Tables)              (SKIP LOCKED Concurrency)
                     ▲                              ▲
                     │                              │ Lease Claim
                     └───────────────┬──────────────┘
                                     │
                        [feedbackpro-audit-worker]
                       Headless Playwright / Python
                       - SSRF Interceptor & DNS Pinning
                       - DOM & UX Layout Inspector
                       - Non-destructive Passive Audit
                                     │
                                     ▼
                          [Target Public Website]
                          (Explicitly Authorized)
```

### Render Services Topology

| Service Name | Render Type | Runtime | Role & Exposure |
| :--- | :--- | :--- | :--- |
| **`feedbackpro-db`** | Managed Database | PostgreSQL 16 | Central persistent storage with automated backups |
| **`feedbackpro-api`** | Web Service | Python / FastAPI | Public REST API, runs `alembic upgrade head` before deploy |
| **`feedbackpro-audit-worker`** | Background Worker | Python / Playwright | Internal worker process; **no public HTTP port**, claims jobs via DB |
| **`feedbackpro-frontend`** | Static Site | Node / Vite SPA | Distributed client dashboard and public questionnaire UI |

---

## 2. Production Environment Variables Checklist

All configuration is strictly injected via environment variables. **No hardcoded secrets exist in the codebase or version control.**

### Backend & Worker (`feedbackpro-api`, `feedbackpro-audit-worker`)

| Variable | Description | Example / Format | Required |
| :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | Runtime mode (`production`, `development`, `testing`) | `production` | **Yes** |
| `DATABASE_URL` | Async PostgreSQL connection string | `postgresql+asyncpg://user:pass@host:5432/dbname` | **Yes** |
| `JWT_SECRET` | Cryptographic secret for signing auth tokens (≥32 chars) | Generated high-entropy string | **Yes** |
| `JWT_ALGORITHM` | JWT signing algorithm (default: `HS256`) | `HS256` | No |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifespan in minutes | `15` | No |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifespan in days | `7` | No |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend origins | `https://feedbackpro.onrender.com` | **Yes** |
| `FIREBASE_PROJECT_ID` | Firebase Project ID for server-side token verification | `feedbackpro-d2e02` | **Yes** |
| `FIREBASE_AUTH_ENABLED` | Enable Firebase ID token verification | `true` | No |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase service account credentials (JSON string or path) | Private server credential | Optional |
| `AI_PROVIDER` | AI backend provider (`gemini`, `openai`, `mock`) | `gemini` or `mock` | No |
| `AI_API_KEY` | Real provider API key (server-side only) | Provider secret key | If AI enabled |
| `AI_MODEL` | Provider model identifier | `gemini-1.5-flash` or `gpt-4o` | No |
| `RATE_LIMIT_LOGIN` | Login endpoint rate limit | `5/minute` | No |
| `RATE_LIMIT_REGISTER` | Registration endpoint rate limit | `3/minute` | No |
| `RATE_LIMIT_PUBLIC` | Public form submission rate limit | `10/minute` | No |
| `PUBLIC_BASE_URL` | Base URL for generating public feedback and QR links | `https://feedbackpro.onrender.com` | **Yes** |

### Frontend (`feedbackpro-frontend`)

| Variable | Description | Scope |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` / `VITE_API_URL` | Base URL pointing to deployed FastAPI service | Browser public |
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key (from Firebase Console) | Browser public |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | Browser public |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | Browser public |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | Browser public |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging Sender ID | Browser public |
| `VITE_FIREBASE_APP_ID` | Firebase Web Application ID | Browser public |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase Analytics Measurement ID | Browser public |

> **Security Rule**: Never prefix backend database credentials or server keys with `VITE_`. Only public web endpoints and public Firebase client identifiers may be exposed in Vite environment variables. Private service account keys must NEVER be exposed in the frontend.

---

## 3. Firebase Authentication Integration

FeedbackPro uses Firebase Authentication as the primary identity provider while retaining PostgreSQL as the definitive source of truth for all domain entities, tenancy, and authorization.

### Key Characteristics:
1. **Public Web Config vs. Private Admin Credentials**:
   - **Frontend (Public)**: Uses public Firebase Web client configuration injected via `VITE_FIREBASE_*`.
   - **Backend (Private)**: Uses `firebase-admin` SDK with Google Cloud default credentials or `FIREBASE_SERVICE_ACCOUNT_JSON`.
2. **Stable External Identity Mapping**:
   - `firebase_uid`: Indexed unique column in PostgreSQL `users` table.
   - Initial registration/login via Firebase sends the verified Firebase ID Token to the FastAPI backend.
   - The backend resolves the user by `firebase_uid`. If an existing user matches by email, the `firebase_uid` is seamlessly linked. If new, the user profile is auto-provisioned in PostgreSQL.
3. **Anti-IDOR Multi-Tenancy**:
   - Authentication identity is derived exclusively from the verified token; client-supplied user IDs in request bodies or query parameters are ignored.
   - Resource access checks strictly enforce `Project.user_id == current_user.id` against PostgreSQL.


---

## 3. Local Development Setup

### Prerequisites
- Python 3.12+
- Node.js 18+ / npm 10+
- PostgreSQL or SQLite (local testing uses SQLite / PostgreSQL)

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium

# Copy environment template
cp ../.env.example .env
# Configure .env with your local settings
```

### 2. Database Migrations
```bash
# Apply migrations to local database
python -m alembic upgrade head
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Running the Isolated Audit Worker
```bash
# In a separate terminal with backend venv activated:
python backend/app/worker.py
```

### 5. Running the API Server
```bash
# In a separate terminal with backend venv activated:
uvicorn app.main:app --reload --port 8000
```

---

## 4. Production Deployment Process (Render)

FeedbackPro is fully configured for automated Infrastructure-as-Code deployment via [`render.yaml`](file:///c:/Users/rocky/OneDrive/vs%20code%20project/feedbackpro/render.yaml).

### Step-by-Step Deployment
1. **Push Repository to GitHub**:
   Ensure all changes are committed on the `main` branch.
2. **Link Blueprint on Render**:
   - Log into Render Dashboard.
   - Click **Blueprints** → **New Blueprint Instance**.
   - Connect your GitHub repository.
3. **Automated Provisioning**:
   Render provisions all 4 services defined in `render.yaml`:
   - `feedbackpro-db` (PostgreSQL)
   - `feedbackpro-api` (FastAPI with automated `preDeployCommand: python -m alembic upgrade head`)
   - `feedbackpro-audit-worker` (Background Worker running Playwright)
   - `feedbackpro-frontend` (Static Site with SPA rewrite rules)
4. **Configure Environment Secrets**:
   - Supply `JWT_SECRET` in the Render dashboard for `feedbackpro-api` and `feedbackpro-audit-worker`.
   - If utilizing cloud AI, supply `AI_API_KEY`.
   - Configure `CORS_ORIGINS` to match your deployed frontend domain.
   - Configure `VITE_API_BASE_URL` on the frontend static site to point to `https://feedbackpro-api.onrender.com`.

---

## 5. Security Architecture & Controls

- **SSRF Defense**: Multi-layered IP pinning and private network isolation blocks RFC 1918 addresses, cloud metadata endpoints (`169.254.169.254`), loopbacks, IPv6 transitions, and redirect hops.
- **Authorization & Multi-Tenancy**: Tenant-isolated UUID data queries. Users cannot inspect or mutate projects, audits, or reports belonging to other accounts (verified 0% IDOR leakage).
- **Password Security**: State-of-the-art Argon2id hashing with unique per-user salts.
- **Token Security**: Refresh token family tracking with automatic revocation upon token replay detection.
- **Input Sanitization & Injection Defense**:
  - CSV formula injection protection (`=`, `+`, `-`, `@`, `\t`, `\r` neutralized with leading apostrophe).
  - Strict Pydantic v2 schemas and parameter validation.
  - LLM prompt isolation inside XML boundaries with instruction override disclaimers.
- **Security Headers**: HSTS, Content-Security-Policy (CSP), X-Frame-Options: DENY, X-Content-Type-Options: nosniff, and Referrer-Policy enforced on all HTTP responses.
- **Production Guard**: Demo seed script (`scripts/seed_demo.py`) explicitly halts if `ENVIRONMENT=production`.

---

## 6. Verification and Testing Commands

FeedbackPro includes automated test suites covering unit logic, integration flows, security controls, and resilience.

### Automated Test Suites
```bash
# 1. Run all pytest unit and integration tests (44 tests)
pytest -v backend/tests

# 2. Run defense-in-depth security gate (23 security checks)
python scripts/security_check.py

# 3. Verify fresh database migrations from zero (19 core entities)
python scripts/verify_migrations_fresh.py

# 4. Verify worker crash recovery and fault tolerance
python scripts/verify_resilience_and_failures.py

# 5. Run secret scan across repository and git history
python scripts/verify_secret_scan.py

# 6. Run comprehensive live environment verification (42 end-to-end checks)
python scripts/verify_live_environment.py

# 7. Frontend type check & production build
npm run build --prefix frontend
```

---

## 7. Known Limitations

1. **In-Memory Rate Limiting**: The current rate limiter (`slowapi`) uses an in-memory counter suitable for single-instance deployments. For horizontally scaled API clusters, a Redis-backed storage backend should be configured.
2. **AI Provider Fallback**: In the absence of live external LLM API credentials (`AI_API_KEY`), the system falls back safely to the deterministic mock AI generator without crashing or leaking state.
3. **Passive Security Scope**: Audits perform passive inspection only. The scanner does not perform active intrusion attempts, port scans, or destructive testing.
