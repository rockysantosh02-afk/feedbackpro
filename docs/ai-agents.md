# FeedbackPro — Multi-Agent AI System Specification

## 1. Overview

FeedbackPro employs a coordinated ensemble of **10 specialized AI agents** that run synchronously and asynchronously across the audit, survey generation, and feedback correlation lifecycles.

To ensure resilience, FeedbackPro includes a **Deterministic Provider** that runs entirely offline with zero external API dependencies, alongside pluggable integrations for **OpenAI** (GPT-4o) and **Google Gemini** (Gemini 1.5 Pro/Flash).

---

## 2. Agent Inventory & Capabilities

### 2.1 AuditorOrchestratorAgent
* **Role:** Master workflow coordinator for technical inspections.
* **Responsibilities:**
  * Coordinates sequential execution of pre-flight DNS validation, safe HTTP crawling, headless browser rendering, and passive scanner agents.
  * Enforces stage timeouts and recovers gracefully if a target website stalls.
  * Persists audit run status changes in real-time (`running`, `analyzing`, `completed`, `failed`).

### 2.2 SecurityPostureAgent
* **Role:** Passive security posture diagnostic agent.
* **Checks Performed:**
  * **Strict-Transport-Security (HSTS):** Validates presence, `max-age`, and `includeSubDomains`.
  * **Content-Security-Policy (CSP):** Checks for missing CSP or insecure directives (`unsafe-inline`, `unsafe-eval`).
  * **X-Frame-Options:** Checks clickjacking protection (`DENY` or `SAMEORIGIN`).
  * **X-Content-Type-Options:** Enforces `nosniff` MIME-type sniffing defense.
  * **Referrer-Policy:** Validates privacy leak prevention.
  * **Cookie Attributes:** Checks `Secure`, `HttpOnly`, and `SameSite` flags on cookies.
  * **HTTPS Enforcement:** Verifies automatic redirection from HTTP to HTTPS.

### 2.3 BugDetectionAgent
* **Role:** Observable functional flaw detection agent.
* **Checks Performed:**
  * Unhandled JavaScript errors and unhandled promise rejections logged in the browser console.
  * Broken asset links (404 Not Found images, stylesheets, or scripts).
  * HTTP 500/502/503 server errors during page loading.
  * Unresponsive click handlers or missing destination routes.

### 2.4 AccessibilityAgent
* **Role:** Usability and WCAG compliance agent.
* **Checks Performed:**
  * Missing image `alt` attributes.
  * Missing form field `<label>` associations.
  * Color contrast ratios between foreground text and background elements.
  * Viewport `<meta>` tag responsiveness configuration (`width=device-width`).
  * Structural HTML5 semantic landmarks (`<main>`, `<nav>`, `<header>`).

### 2.5 SurveyGeneratorAgent
* **Role:** Context-aware questionnaire synthesizer.
* **Responsibilities:**
  * Takes project metadata (name, description, tech stack, event name, category) and generates an optimized questionnaire.
  * Selects appropriate question types from the 9 supported variants (ratings, multiple choice, NPS, open text, boolean).
  * Adapts questions to judge evaluation rubrics (e.g. innovation, presentation, usability).

### 2.6 FeedbackAnalysisAgent
* **Role:** Qualitative sentiment and respondent classification agent.
* **Responsibilities:**
  * Analyzes each qualitative response and assigns a sentiment tag (`positive`, `neutral`, `negative`).
  * Calculates Net Promoter Scores (NPS) categorizing respondents into Promoters (9-10), Passives (7-8), and Detractors (0-6).
  * Detects respondent roles (Judge, Mentor, Participant, Organizer, Visitor) to weight feedback.

### 2.7 ThemeAggregationAgent
* **Role:** Unsupervised semantic pattern extraction agent.
* **Responsibilities:**
  * Clusters hundreds of qualitative responses into recurring themes.
  * Computes theme frequency and associated severity.
  * Generates concise summaries explaining *why* judges or users raised a specific point.

### 2.8 AuditFeedbackCorrelationAgent
* **Role:** Cross-domain intelligence synthesizer.
* **Responsibilities:**
  * Bridges the gap between what users complain about and what technical scanners observed.
  * *Example:* If respondents note "checkout button doesn't respond on mobile", the agent cross-references console errors for mobile viewport JS errors, creating an evidentiary link.
  * Increases recommendation priority when a technical finding correlates with negative user feedback.

### 2.9 RecommendationSynthesizerAgent
* **Role:** Actionable remediation planner.
* **Responsibilities:**
  * Consolidates audit findings and feedback themes into prioritized recommendations:
    * **P0 (Critical):** Immediate showstoppers or high-risk gaps.
    * **P1 (High):** Major usability or security issues directly hurting judge perception.
    * **P2 (Medium):** Quality-of-life and performance improvements.
    * **P3 (Low):** Minor polish or future enhancements.
  * Generates concrete remediation steps, rationale, and sample code/configuration snippets.

### 2.10 ExecutiveReportAgent
* **Role:** Final compilation and scoring agent.
* **Responsibilities:**
  * Generates an executive summary suitable for hackathon judges and team leads.
  * Calculates category pillar scores (Security, UX, Accessibility, Technical Readiness, Satisfaction) and the composite Overall Project Health Score (0-100).
  * Enforces the mandatory non-destructive security disclaimer across all outputs.

---

## 3. Provider Architecture & Offline Fallback

FeedbackPro is architected with a decoupled provider interface:

```python
class AIProvider(ABC):
    @abstractmethod
    async def generate_text(self, prompt: str, system_prompt: str | None = None) -> str:
        ...

    @abstractmethod
    async def generate_json(self, prompt: str, schema: dict, system_prompt: str | None = None) -> dict:
        ...
```

* **DeterministicProvider:** Implemented in `app/ai/deterministic_provider.py`. Uses pattern matching, lexicons, and rule-based heuristics. Requires zero external network calls, runs instantly, and guarantees 100% reproducible test suites.
* **OpenAIProvider:** Uses `openai.AsyncOpenAI` targeting GPT-4o with structured JSON schema outputs.
* **GeminiProvider:** Uses Google Generative AI targeting Gemini 1.5 Pro.

The provider is configured via the `AI_PROVIDER` environment variable (`deterministic`, `openai`, or `gemini`).
