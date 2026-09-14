# FeedbackPro — System Architecture

## 1. High-Level Topology

FeedbackPro is architected as a modern, security-hardened, multi-agent platform designed to evaluate hackathon software submissions. It bridges automated passive technical diagnostics with human qualitative feedback (judges, mentors, participants).

```
+-----------------------------------------------------------------------------------+
|                                   Client Layer                                    |
|                                                                                   |
|  +-------------------------------------+   +------------------------------------+  |
|  |     Project Owner Dashboard         |   |    Public Respondent Portal        |  |
|  |   (React 18 + Vite + TypeScript)    |   |  (Mobile-First Responsive Web)     |  |
|  +------------------+------------------+   +-----------------+------------------+  |
+---------------------|----------------------------------------|--------------------+
                      | Bearer JWT                             | Unauthenticated / CORS
                      v                                        v
+-----------------------------------------------------------------------------------+
|                              FastAPI Gateway & Security                           |
|                                                                                   |
|  * Anti-IDOR Tenant Enforcement (uuid & user ownership validation)                 |
|  * Token Rotation & Compromise Detection (Argon2id + PyJWT)                       |
|  * Memory-Tier Sliding Window Rate Limiter                                         |
|  * CSV Formula Injection Sanitizer (=, +, -, @, \t, \r)                           |
|  * Public Honeypot & Anti-Spam Gateways                                           |
+-------------------------------------+---------------------------------------------+
                                      |
         +----------------------------+----------------------------+
         |                                                         |
         v                                                         v
+----------------------------------+     +------------------------------------------+
|       Synchronous Services       |     |        Asynchronous Worker Engine        |
|                                  |     |                                          |
| * Project Lifecycle Management   |     | * Async Queue (PostgreSQL / In-Memory)   |
| * Feedback Survey Generator      |     | * 6-Layer SSRF Protected Web Crawler     |
| * Multi-Format Exporter (PDF/CSV)|     | * Playwright Headless Inspection Agent   |
| * Email Invitation Dispatcher    |     | * Passive Security Scanner               |
+----------------+-----------------+     +---------------------+--------------------+
                 |                                             |
                 +----------------------+----------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                            Multi-Agent Intelligence Core                          |
|                                                                                   |
|  +-------------------------+  +--------------------------+  +-------------------+ |
|  | Passive Security Agent  |  |  Bug Detection Agent     |  | A11y & UX Agent   | |
|  +-------------------------+  +--------------------------+  +-------------------+ |
|  | Feedback Analysis Agent |  |  Theme Synthesis Agent   |  | Correlation Agent | |
|  +-------------------------+  +--------------------------+  +-------------------+ |
|                                                                                   |
|  * Provider Layer: Deterministic Offline NLP <---> OpenAI GPT-4o <---> Gemini 1.5 |
|  * Untrusted Boundary Isolation: `<untrusted_website_content>` & `<user_feedback>`|
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                               Persistence Layer                                   |
|                                                                                   |
|  * PostgreSQL 16 (or SQLite with aiosqlite for single-node local dev)            |
|  * SQLAlchemy 2.0 Async ORM with strict foreign key cascading                     |
|  * Alembic Migration Engine                                                       |
+-----------------------------------------------------------------------------------+
```

---

## 2. Component Boundaries & Responsibilities

### 2.1 Web Application (Frontend)
* **Framework:** React 18, Vite 5, TypeScript 5.
* **Aesthetic:** Obsidian Dark Glassmorphism with tailored emerald (`#10b981`), cyan (`#06b6d4`), and indigo (`#6366f1`) accents.
* **Pages:**
  * `LandingPage`: Feature showcases, value proposition, and quick sign-up.
  * `LoginPage` / `RegisterPage`: Token lifecycle auth.
  * `DashboardPage`: Portfolio overview, quick health indicators, project management.
  * `ProjectWizardPage`: 5-step onboarding wizard requiring explicit legal audit authorization.
  * `AuditPage`: Stage-by-stage real-time progress tracker, findings list with filtering by severity, and interactive drawer with remediation fixes.
  * `FeedbackBuilderPage`: AI-powered survey generator, editor for all 9 question types, live publish toggle, QR code generator, and email invitations.
  * `PublicFeedbackPage`: Hostile-facing, mobile-first responsive questionnaire with honeypot bot trap and receipt generator.
  * `AnalyticsPage`: Sentiment distribution, NPS meter, strengths vs complaints, and correlation synthesis trigger.
  * `ReportPage`: Comprehensive project health report with 5 pillar scores, P0-P3 prioritized recommendation cards, non-destructive disclaimer banner, and JSON/CSV/PDF exports.

### 2.2 Backend Gateway (FastAPI)
* **Python Version:** Python 3.12+
* **Framework:** FastAPI with async routes and Pydantic v2 schemas.
* **Security Middleware:**
  * Multi-layer SSRF filter inspecting DNS resolution, protocol, port, and IP literal representation.
  * Dependency-based anti-IDOR checks (`get_project_for_user`).
  * RFC 1918 / Cloud Metadata (`169.254.169.254`) network blockers.
  * Sliding-window rate limiters with specific rules for public feedback forms (`public_form_limiter`).

### 2.3 Asynchronous Worker Engine
* Runs audit jobs in the background without blocking HTTP requests.
* Coordinates the multi-step audit pipeline:
  1. DNS and target reachability check.
  2. Safe HTTP inspection (TLS validation, security header analysis).
  3. Safe headless browser rendering (Playwright) to capture console errors, failed network requests, and DOM accessibility cues.
  4. Passive security scanner execution.
  5. Multi-agent analysis to generate verified and potential findings.
  6. Health score calculation and database persistence.

### 2.4 Multi-Agent Intelligence Core
10 specialized agents execute focused tasks:
1. `AuditorOrchestratorAgent`: Coordinates the sequence of audit stages.
2. `SecurityPostureAgent`: Evaluates headers, cookie security, TLS configurations, and common attack surfaces.
3. `BugDetectionAgent`: Identifies broken links, JavaScript runtime errors, and unhandled promise rejections.
4. `AccessibilityAgent`: Analyzes contrast, ARIA landmarks, image alt attributes, and keyboard navigability.
5. `SurveyGeneratorAgent`: Drafts custom feedback questions mapped to the project category and tech stack.
6. `FeedbackAnalysisAgent`: Scores sentiment and classifies qualitative responses.
7. `ThemeAggregationAgent`: Discovers recurring topics, cluster complaints, and notable strengths.
8. `AuditFeedbackCorrelationAgent`: Cross-references technical audit findings with qualitative user feedback.
9. `RecommendationSynthesizerAgent`: Produces prioritized P0-P3 remediation cards with code snippets.
10. `ExecutiveReportAgent`: Compiles the final executive summary and pillar scores.

---

## 3. Data Flow

### 3.1 Project Audit Lifecycle
```
[User] -> (Authorize Audit & Submit Target URL)
       -> [FastAPI /projects/{id}/audit/start]
       -> [Anti-SSRF Verifier] (blocks 127.0.0.1, 169.254.169.254, AWS/GCP metadata)
       -> [Background Audit Worker]
          -> Safe HTTP Fetch (HSTS, CSP, X-Frame-Options)
          -> Safe Headless Browser (Console errors, 4xx/5xx network failures)
          -> Security Posture Agent
          -> Bug & Accessibility Agents
          -> Persist AuditFindings & Evidence
          -> Compute Category Scores
       -> [WebSocket / Polling] -> [Frontend AuditPage Real-time Tracker]
```

### 3.2 Feedback & Correlation Lifecycle
```
[Public Respondent] -> (Scan QR / Open URL / Submit Answers)
                    -> [Honeypot Check & Public Rate Limiter]
                    -> [Input Sanitization (CSV Formula Escaping & Prompt Isolation)]
                    -> [Persist FeedbackResponse & Answers]
                    -> [Sentiment Analysis Agent]
                    -> [Theme Aggregation Agent]
                    -> [Correlation Agent: Links Feedback Complaints to Audit Findings]
                    -> [Recommendation Synthesizer: Generates P0-P3 Action Plan]
                    -> [Project Owner Views ReportPage & Exports PDF/CSV/JSON]
```
