# FeedbackPro — Technical Audit Methodology

## 1. Principles of Passive Inspection

Hackathon projects are frequently deployed to temporary cloud infrastructure or shared hosting. Executing invasive vulnerability scans against these environments can trigger cloud account suspensions, firewall IP bans, or service crashes.

FeedbackPro adheres strictly to **Passive, Non-Destructive Inspection**:
1. **Zero Fuzzing:** The auditor never injects SQL payloads, XSS test vectors, or directory traversal strings.
2. **Zero Brute Force:** No authentication cracking or endpoint enumeration is attempted.
3. **Observation Only:** The platform inspects only standard HTTP responses, publicly advertised TLS certificates, response headers, and DOM structures rendered by modern browsers.

---

## 2. Safe Headless Browser Architecture

FeedbackPro uses a sandboxed Playwright headless browser instance to observe real-world rendering behavior:

* **Sandbox Flags:** Runs with `--no-sandbox`, `--disable-setuid-sandbox`, and `--disable-dev-shm-usage`.
* **Execution Timeout:** Enforces a strict 30-second hard navigation timeout.
* **Console Interception:** Listens to `page.on("console")` and captures errors and unhandled exceptions.
* **Network Interception:** Listens to `page.on("requestfailed")` and `page.on("response")` to flag failed asset fetches (404/500/502).
* **Isolation:** Storage, cookies, and cache are completely cleared between audit runs.

---

## 3. Four Core Audit Dimensions

### 3.1 Passive Security Posture
* **Transport Layer:** Enforces HTTPS; flags cleartext HTTP and protocol downgrade vulnerabilities.
* **HTTP Security Headers:**
  * `Strict-Transport-Security` (HSTS): Checks duration (`max-age >= 31536000`) and subdomains.
  * `Content-Security-Policy` (CSP): Checks for default-src, script-src, and absence of `unsafe-inline`.
  * `X-Frame-Options`: Checks clickjacking defense (`DENY` or `SAMEORIGIN`).
  * `X-Content-Type-Options`: Enforces `nosniff`.
  * `Referrer-Policy`: Enforces modern referer privacy controls.
* **Cookie Hygiene:** Inspects Set-Cookie headers for `Secure`, `HttpOnly`, and `SameSite` flags.

### 3.2 Functional Flaws & Observable Bugs
* **Client-Side Runtime Exceptions:** Uncaught `TypeError`, `ReferenceError`, or unhandled promise rejections in the browser console.
* **Asset Loading Failures:** Broken image files, missing JavaScript chunks, or missing stylesheets.
* **API Failure Responses:** 4xx client errors or 5xx server errors during initial page boot.

### 3.3 Usability & Accessibility (WCAG Heuristics)
* **Visual Contrast:** Evaluates foreground text versus background colors.
* **Form Accessibility:** Flags `<input>` elements without associated `<label>` or `aria-label` attributes.
* **Image Accessibility:** Detects `<img>` elements lacking `alt` descriptions.
* **Responsive Viewport:** Verifies `<meta name="viewport" content="width=device-width, initial-scale=1">`.
* **HTML5 Semantic Structure:** Checks for standard navigation and content landmarks.

### 3.4 Technical Readiness & Performance
* **Response Latency:** Measures Time to First Byte (TTFB).
* **Asset Optimization:** Flags uncompressed media or oversized bundles that slow page load.

---

## 4. Evidence Capture & Finding Classification

Every finding produced by FeedbackPro is categorized by:
* **Severity:** `critical`, `high`, `medium`, `low`, or `info`.
* **Confidence:** `high`, `medium`, or `low`.
* **Verification Status:**
  * **Verified:** Objective, deterministically measured fact (e.g. missing header, 404 broken script, HTTP 500 status code).
  * **Potential:** Heuristic inference requiring human context (e.g. questionable layout shift or missing semantic tag).
* **Evidence String:** Direct excerpt of headers, console logs, or DOM snippets documenting the exact issue observed.

---

## 5. Non-Destructive Commitments & Disclaimer

FeedbackPro mandates that every report, exported document, and interface display the standard safety disclosure:

> *"No issues were detected within the checks performed. This automated audit performs limited, non-destructive checks and is not a substitute for a professional penetration test."*

The system **never** claims a project is "100% secure", "flawless", or "unhackable."
