 md


🚀 FeedbackPro — AI Hackathon Project Auditor & Feedback Intelligence Platform
Audit. Collect. Correlate. Improve.
FeedbackPro is an AI-powered platform for hackathon organizers, judges, mentors, and participants. It combines non-destructive website auditing, AI-generated feedback forms, public feedback collection, feedback analytics, and technical/feedback correlation in one production-oriented platform.

It helps hackathon teams answer two important questions:

Does the submitted project work correctly and safely within the tested scope?

What do users, judges, and mentors actually think about the project?

FeedbackPro connects both sides to generate prioritized P0–P3 recommendations.

Security Disclaimer

"No issues were detected within the tested scope. The system performs limited, non-destructive security posture checks and is not a substitute for exhaustive penetration testing or ongoing threat modeling."

📸 Core Features
Feature	Description
🔍 Website Audit	Performs passive, non-destructive inspection of deployed websites
🐞 Bug Detection	Detects browser/DOM issues, console errors, broken links and related problems
♿ UX & Accessibility	Checks selected accessibility, contrast and UX indicators
🔐 Security Posture	Reviews security headers, TLS posture and other passive security signals
🤖 AI Feedback Forms	Generates role-specific questionnaires for participants, judges and mentors
📝 9 Question Types	Supports multiple feedback question formats
🌐 Public Forms	Publishes shareable feedback forms using public URLs/slugs
🛡️ Honeypot Protection	Adds anti-bot protection to public submissions
📊 Feedback Analytics	Calculates NPS, sentiment, themes and response insights
🔗 Issue Correlation	Correlates technical audit findings with feedback signals
💡 Recommendations	Produces prioritized P0–P3 improvement recommendations
📄 Reports	Generates PDF and CSV reports
📱 QR Codes	Generates QR codes for public feedback collection
📧 Invitations	Supports controlled/mock or SMTP-based feedback invitations
🔑 Firebase Auth	Uses Firebase Authentication for identity verification
🗄️ PostgreSQL	Keeps PostgreSQL as the source of truth for application data
⚙️ Background Worker	Processes website audits outside the API request cycle
🧠 AI Fallback	Supports deterministic fallback when external AI credentials are unavailable
🏗️ System Architecture
FeedbackPro uses a decoupled architecture. API requests are handled by FastAPI while long-running Playwright audits are processed by a separate worker.

                         INTERNET / USERS
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
      ┌──────────────────┐          ┌────────────────────┐
      │ FeedbackPro       │          │ Public Feedback    │
      │ React Frontend    │          │ Form               │
      │ Vite SPA          │          │ Public URL / QR    │
      └────────┬─────────┘          └──────────┬─────────┘
               │ HTTPS / REST API              │
               └──────────────┬────────────────┘
                              ▼
                   ┌─────────────────────┐
                   │ FeedbackPro API     │
                   │ FastAPI / Python    │
                   │                     │
                   │ Auth                │
                   │ Projects            │
                   │ Audits              │
                   │ Feedback            │
                   │ Analytics           │
                   │ Reports             │
                   └─────────┬───────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
       ┌────────────┐  ┌────────────┐  ┌──────────────┐
       │ PostgreSQL │  │ audit_jobs │  │ AI Providers │
       │ Source of  │  │ DB Queue   │  │ Gemini/OpenAI│
       │ Truth      │  │            │  │ + fallback   │
       └────────────┘  └─────┬──────┘  └──────────────┘
                             │
                       Lease / Claim
                             ▼
                 ┌────────────────────────┐
                 │ Audit Worker            │
                 │ Python + Playwright     │
                 │                        │
                 │ URL Safety              │
                 │ DNS / SSRF Protection   │
                 │ Browser Inspection      │
                 │ Accessibility / UX      │
                 │ Security Posture        │
                 └────────────┬───────────┘
                              │
                              ▼
                    Target Public Website
                    Explicitly Authorized
🔄 End-to-End Application Flow
User
 │
 ▼
Firebase Authentication
 │
 ▼
React Frontend
 │
 ▼
FastAPI Backend
 │
 ├──► PostgreSQL
 │
 ├──► AI Agent Pipeline
 │
 └──► Create audit job
          │
          ▼
      audit_jobs
          │
          ▼
   Background Worker
          │
          ▼
      Playwright
          │
          ▼
 Target Website
          │
          ▼
 Audit Findings
          │
          ▼
 PostgreSQL
          │
          ├──────────────► Feedback Form
          │                       │
          │                       ▼
          │                  Public Responses
          │                       │
          │                       ▼
          └──────────────► Analytics / Correlation
                                  │
                                  ▼
                           Recommendations
                                  │
                                  ▼
                              PDF / CSV
☁️ Render Deployment Architecture
FeedbackPro is designed to be deployed as separate services.

Service	Render Type	Purpose
feedbackpro-frontend	Static Site	React/Vite production frontend
feedbackpro-api	Web Service	Public FastAPI REST API
feedbackpro-audit-worker	Background Worker	Long-running Playwright audit processing
feedbackpro-db	PostgreSQL	Persistent application database
Important
The audit worker is part of the backend architecture. The API can accept/enqueue audit requests without the worker, but queued website audits will not be processed until a worker is running.

🗂️ Project Structure
feedbackpro/
│
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── bug_detection/
│   │   │   ├── feedback_analysis/
│   │   │   ├── feedback_form_generator/
│   │   │   ├── feedback_strategy/
│   │   │   ├── issue_correlation/
│   │   │   ├── project_understanding/
│   │   │   ├── recommendation/
│   │   │   ├── security_posture/
│   │   │   ├── ux_accessibility/
│   │   │   └── website_inspection/
│   │   │
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── workers/
│   │   └── main.py
│   │
│   ├── alembic/
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── lib/
│   │   └── ...
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
│
├── database/
├── docs/
├── scripts/
├── .env.example
├── .github/
├── render.yaml
└── README.md
🧰 Technology Stack
Frontend
⚛️ React 18

🟦 TypeScript

⚡ Vite

🎨 Tailwind CSS

🧭 React Router

🔥 Firebase Web SDK

Backend
🐍 Python 3.12

⚡ FastAPI

🚀 Uvicorn

🗄️ SQLAlchemy 2.x

🐘 PostgreSQL 16

🔄 Alembic

🔥 Firebase Admin SDK

🔐 Argon2id

🎫 JWT access/refresh tokens

🛡️ SlowAPI

🎭 Playwright

AI
FeedbackPro contains specialized AI agents for:

Project Understanding
       │
       ├──► Website Inspection
       ├──► Bug Detection
       ├──► UX / Accessibility
       ├──► Security Posture
       │
       ▼
Feedback Strategy
       │
       ▼
Feedback Form Generator
       │
       ▼
Feedback Analysis
       │
       ├──► Sentiment
       ├──► NPS
       └──► Themes
       │
       ▼
Issue Correlation
       │
       ▼
Recommendations
Supported provider architecture includes external AI providers and a deterministic fallback mode.

🔐 Authentication & Authorization
Firebase Authentication is used for identity while PostgreSQL remains the source of truth for application data, tenancy and authorization.

Authentication Flow
Frontend
   │
   ▼
Firebase Authentication
   │
   ▼
Firebase ID Token
   │
   ▼
FastAPI
   │
   ▼
Firebase Admin Verification
   │
   ▼
firebase_uid
   │
   ▼
PostgreSQL User
   │
   ▼
Authorized Resource Access
Multi-Tenant Protection
Every project-scoped operation must be associated with the authenticated PostgreSQL user.

Verified Identity
       │
       ▼
current_user
       │
       ▼
PostgreSQL user.id
       │
       ▼
Project.user_id == current_user.id
       │
       ▼
Resource Allowed
Client-supplied user IDs are not trusted for authorization.

🔒 Security Architecture
FeedbackPro uses defense-in-depth controls for a passive auditing platform.

SSRF Protection
The website auditor validates target URLs and protects against requests to inappropriate network destinations, including private/loopback and metadata-style targets.

Redirects are also validated rather than blindly trusted.

Passive Website Auditing
The auditor is intentionally non-destructive.

It focuses on inspection such as:

DOM/browser errors

Console errors

Broken links

Accessibility indicators

Contrast checks

Security headers

TLS posture

UX/layout observations

It does not perform destructive testing or active intrusion attempts.

Authentication Security
Firebase ID token verification

Argon2id password hashing where local password authentication is used

Short-lived access tokens

Refresh-token rotation

Refresh-token replay/revocation handling

Injection Protection
Pydantic request validation

CSV formula-injection protection

Prompt sanitization/isolation

Untrusted website content boundaries

Output validation where applicable

HTTP Security Headers
Configured security controls include:

Content-Security-Policy
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security
Referrer-Policy
Rate Limiting
Rate limiting is applied to sensitive/high-abuse operations such as:

Login

Registration

Public feedback submission

Audit operations

AI generation

Report export

Invitations

🤖 Audit Worker Architecture
Website audits are not executed inside the HTTP request cycle.

Instead:

POST /audit
    │
    ▼
Validate URL
    │
    ▼
Create audit_jobs row
    │
    ▼
Return queued/pending response
    │
    ▼
Background Worker
    │
    ▼
Claim job with database locking
    │
    ▼
Playwright audit
    │
    ▼
Store findings/evidence
    │
    ▼
Mark job completed
The queue uses database coordination so multiple worker processes can safely claim different jobs.

Worker reliability includes lease/timeout and retry handling.

🧠 Feedback Intelligence Pipeline
Hackathon / Project Details
          │
          ▼
   Project Understanding
          │
          ▼
   Feedback Strategy
          │
          ▼
 AI Feedback Form Generator
          │
          ▼
      Publish Form
          │
          ▼
 Participants / Judges / Mentors
          │
          ▼
     Public Responses
          │
          ▼
   Feedback Analysis
      │     │     │
      ▼     ▼     ▼
     NPS Sentiment Themes
          │
          ▼
    Issue Correlation
          │
          ▼
    Recommendations
       P0 / P1 / P2 / P3
📊 Reports & Analytics
FeedbackPro can combine technical and human feedback into an actionable report.

Technical Signals
Audit score

Findings

Severity

Evidence

Website issues

UX/accessibility indicators

Security posture observations

Feedback Signals
Response count

NPS

Sentiment

Themes

Role-based feedback

Form/question performance

Combined Intelligence
Technical Finding
       +
User Feedback
       +
Sentiment / Theme
       ↓
Issue Correlation
       ↓
Priority
       ↓
Recommendation
Reports can be exported in:

PDF

CSV

⚙️ Environment Variables
Backend & Worker
Variable	Purpose	Required
ENVIRONMENT	Runtime environment	Yes
DATABASE_URL	PostgreSQL connection	Yes
JWT_SECRET	JWT signing secret	Yes
JWT_ALGORITHM	JWT algorithm, normally HS256	No
ACCESS_TOKEN_EXPIRE_MINUTES	Access-token lifetime	No
REFRESH_TOKEN_EXPIRE_DAYS	Refresh-token lifetime	No
CORS_ORIGINS	Allowed frontend origins	Yes
FIREBASE_PROJECT_ID	Firebase project identifier	Yes
FIREBASE_AUTH_ENABLED	Enable Firebase verification	No
FIREBASE_SERVICE_ACCOUNT_JSON	Private Firebase Admin credential	If required
AI_PROVIDER	AI provider/fallback selection	No
AI_API_KEY	Server-side AI credential	If AI enabled
AI_MODEL	AI model identifier	No
RATE_LIMIT_LOGIN	Login rate limit	No
RATE_LIMIT_REGISTER	Registration rate limit	No
RATE_LIMIT_PUBLIC	Public submission limit	No
PUBLIC_BASE_URL	Public URL generation base	Yes
Frontend
Variable	Purpose	Scope
VITE_API_BASE_URL / VITE_API_URL	Deployed API URL	Public browser config
VITE_FIREBASE_API_KEY	Firebase Web API key	Public browser config
VITE_FIREBASE_AUTH_DOMAIN	Firebase Auth domain	Public browser config
VITE_FIREBASE_PROJECT_ID	Firebase project ID	Public browser config
VITE_FIREBASE_STORAGE_BUCKET	Firebase storage bucket	Public browser config
VITE_FIREBASE_MESSAGING_SENDER_ID	Firebase sender ID	Public browser config
VITE_FIREBASE_APP_ID	Firebase application ID	Public browser config
VITE_FIREBASE_MEASUREMENT_ID	Firebase measurement ID	Public browser config
Security Rule: VITE_* values are exposed to the browser. Never put PostgreSQL credentials, JWT secrets, Firebase Admin service-account credentials, or private AI credentials in frontend environment variables.

⚡ Quick Start
Prerequisites
Python 3.12+

Node.js / npm compatible with the frontend lockfile

PostgreSQL for production-style local testing

Playwright browser dependencies for audit-worker testing

Firebase project if authentication is enabled

Optional AI provider credentials

1. Clone the Repository
git clone <your-feedbackpro-repository-url>
cd feedbackpro
2. Backend Setup
Windows
cd backend

python -m venv .venv
.venv\Scripts\activate

pip install -r requirements.txt
playwright install chromium
Linux / macOS
cd backend

python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
playwright install chromium
3. Configure Environment
Copy the example environment file and configure the required values.

cp .env.example .env
On Windows PowerShell, you can also copy it with:

Copy-Item .env.example .env
Do not commit the real .env file.

4. Run Database Migrations
cd backend
python -m alembic upgrade head
5. Start the API
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
The local API is expected to be available at:

http://localhost:8000
6. Start the Frontend
Open another terminal:

cd frontend
npm install
npm run dev
Then open the Vite development URL shown in the terminal.

7. Start the Audit Worker
Open another terminal with the backend virtual environment activated:

python -m app.workers.audit_worker
The exact worker module should always be kept aligned with the current repository implementation.

🧪 Testing & Verification
FeedbackPro includes automated checks for application logic, security controls, migrations, resilience, secrets and live environment behavior.

Run the Main Test Suite
pytest -v backend/tests
Security Gate
python scripts/security_check.py
Fresh Migration Verification
python scripts/verify_migrations_fresh.py
Worker Resilience Verification
python scripts/verify_resilience_and_failures.py
Secret Scan
python scripts/verify_secret_scan.py
Live Environment Verification
python scripts/verify_live_environment.py
Frontend Production Build
npm run build --prefix frontend
Test counts can change as the project evolves. The commands above are the source of truth for running the current verification suite.

🚀 Render Deployment
FeedbackPro can be deployed as separate frontend, API, worker and database services.

1. Backend API
Recommended Render service:

Type: Web Service
Root Directory: backend
Runtime: Python
Typical commands:

Build:
pip install -r requirements.txt
Pre-Deploy:
python -m alembic upgrade head
Start:
uvicorn app.main:app --host 0.0.0.0 --port $PORT
Use the project's health endpoint for the Render health check.

2. Audit Worker
Recommended Render service:

Type: Background Worker
Root Directory: backend
Runtime: Python
Typical start command:

python -m app.workers.audit_worker
The worker needs the same database connection and the configuration required by the audit/AI pipeline.

If Playwright browsers are not already installed by the project build process, the worker build must install the required browser and system dependencies.

3. Frontend
Recommended Render service:

Type: Static Site
Root Directory: frontend
Typical build command:

npm ci
npm run build
Publish directory:

dist
Configure the SPA rewrite:

/*  →  /index.html
Set the frontend API environment variable to the deployed backend URL.

4. Database
Use PostgreSQL as the persistent source of truth.

The backend and worker should use the same production database connection.

Database migrations must be applied before the API depends on the updated schema.

🔄 Production Deployment Order
1. PostgreSQL
      │
      ▼
2. Backend API
      │
      ├──► Run migrations
      └──► Verify health
      │
      ▼
3. Audit Worker
      │
      └──► Verify worker can claim jobs
      │
      ▼
4. Frontend
      │
      └──► Configure deployed API URL
      │
      ▼
5. Firebase Authorized Domains
      │
      ▼
6. End-to-End Verification
After deployment, verify:

Frontend URL
     │
     ▼
Backend URL
     │
     ▼
PostgreSQL
     │
     ├──► Audit Worker
     │
     └──► AI / Feedback / Reports
🛡️ Production Checklist
Before calling the deployment ready, verify:

Backend
Production environment enabled

PostgreSQL configured

Alembic migrations applied

Health endpoint works

CORS contains only intended frontend origins

JWT secret is strong and private

Firebase Admin credentials are private

AI credentials are private

Rate limits are enabled

Security headers are enabled

SSRF protections are active

Audit requests are queued rather than executed in the HTTP request

Worker is running

Logs do not expose secrets

Frontend
Production build succeeds

API URL points to deployed backend

Firebase web configuration is correct

Firebase authorized domain includes deployed frontend

Login/register works

Protected routes work

API authentication works

SPA refresh works on nested routes

Public feedback URLs work

No private environment variables are exposed

Integration
Frontend → API works

API → PostgreSQL works

API → worker queue works

Worker → target website works

Audit results return to dashboard

Feedback form generation works

Public feedback submission works

Analytics update correctly

Correlation/recommendations work

PDF export works

CSV export works

QR/public URLs point to the correct frontend domain

⚠️ Known Limitations
In-Memory Rate Limiting
The current SlowAPI rate limiter uses in-memory counters. This is suitable for a single API instance but should be replaced/configured with shared storage such as Redis when horizontally scaling the API.

AI Provider Fallback
When live external AI credentials are unavailable, FeedbackPro can use a deterministic fallback so core flows do not fail simply because an external LLM is unavailable.

Passive Security Scope
Website audits are intentionally limited to passive, non-destructive checks. FeedbackPro is not an automated penetration-testing platform.

External Target Dependency
Audit results depend on the availability, network behavior, TLS configuration and client-side behavior of the target website.

Email Delivery
SMTP-based invitation delivery depends on correct provider configuration and external mail-service behavior.

📌 Responsible Use
FeedbackPro is designed for authorized testing and evaluation of hackathon projects.

Only submit websites for auditing when you have permission to evaluate them.

The auditing system is intentionally designed to be:

Authorized
    +
Passive
    +
Non-destructive
    +
Scope-limited
📚 Useful Development Commands
# Backend tests
pytest -v backend/tests

# Database migrations
cd backend
python -m alembic upgrade head

# Start API
uvicorn app.main:app --reload --port 8000

# Start worker
python -m app.workers.audit_worker

# Frontend development
cd frontend
npm run dev

# Frontend production build
npm run build

# Security verification
python scripts/security_check.py

# Secret verification
python scripts/verify_secret_scan.py

# Migration verification
python scripts/verify_migrations_fresh.py

# Resilience verification
python scripts/verify_resilience_and_failures.py

# Live environment verification
python scripts/verify_live_environment.py
🏆 Project Goals
FeedbackPro is designed to turn hackathon evaluation from a disconnected process into an evidence-driven feedback loop.

                 HACKATHON PROJECT
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        TECHNICAL AUDIT        HUMAN FEEDBACK
              │                     │
              │              Judges / Mentors
              │              Participants
              │                     │
              └──────────┬──────────┘
                         ▼
                  AI CORRELATION
                         │
                         ▼
                  PRIORITIZATION
                    P0 / P1 / P2 / P3
                         │
                         ▼
                  RECOMMENDATIONS
                         │
                         ▼
                  BETTER PROJECT
📜 License
Add the project's applicable license here when the repository license is finalized.

❤️ Built for Better Hackathons
FeedbackPro brings together:

Website Auditing + AI Feedback + Analytics + Correlation + Recommendations

so hackathon teams can move from simply collecting feedback to understanding what should be improved next, and why.
