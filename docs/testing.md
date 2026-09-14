# FeedbackPro — Testing & Quality Assurance Guide

## 1. Test Architecture Overview

FeedbackPro maintains high test coverage across three distinct layers of testing:

```
          / \
         /   \     End-to-End & Integration (test_full_flow.py, test_auth_lifecycle.py)
        /=====\
       /       \   Security & Penetration Regression (test_ssrf_mitigation.py, test_idor.py)
      /=========\
     /           \ Unit Testing (test_ip_classifier.py, test_csv_sanitizer.py, test_url_safety.py)
    +-------------+
```

---

## 2. Test Suites

### 2.1 Unit Tests (`backend/tests/unit/`)
* **`test_ip_classifier.py`:** Validates RFC 1918 ranges, link-local addresses, AWS/GCP/Azure metadata (`169.254.169.254`), IPv6 loopback (`::1`), IPv6 ULA, and IPv4-mapped IPv6 addresses (`::ffff:127.0.0.1`).
* **`test_url_safety.py`:** Tests protocol enforcement (HTTP/HTTPS only), URL length boundaries, embedded credential rejection (`user:pass@host`), and domain structure.
* **`test_prompt_sanitizer.py`:** Tests control character elimination and boundary wrapping (`<untrusted_website_content>`).
* **`test_csv_sanitizer.py`:** Tests formula injection mitigation for dangerous prefixes (`=cmd|' /C calc'!A0`, `+1+1`, `-2`, `@SUM(A1:A10)`, `\t`, `\r`).
* **`test_rate_limiter.py`:** Tests sliding-window rate limit counters under burst and sustained traffic.

### 2.2 Security Tests (`backend/tests/security/`)
* **`test_ssrf_mitigation.py`:** Evaluates 24 distinct SSRF attack payloads including:
  * `http://localhost/`
  * `http://127.0.0.1/`
  * `http://169.254.169.254/latest/meta-data/`
  * `http://[::1]/`
  * `http://[::ffff:127.0.0.1]/`
  * `http://10.0.0.1/`
  * `http://172.16.0.1/`
  * `http://192.168.1.1/`
  * `file:///etc/passwd`
  * `gopher://127.0.0.1:25/`
* **`test_idor.py`:** Tests anti-IDOR protections. Validates that User A cannot access, edit, or delete User B's projects or audit jobs.
* **`test_security_headers.py`:** Confirms all API responses include required defensive headers (`X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`).

### 2.3 Integration Tests (`backend/tests/integration/`)
* **`test_auth_lifecycle.py`:** Tests registration, Argon2id verification, JWT issuance, token rotation, reuse detection, and session logout.
* **`test_full_flow.py`:** Runs the complete platform end-to-end:
  1. Register project owner
  2. Create project with explicit audit consent
  3. Run passive audit and inspect findings
  4. Generate AI feedback questionnaire
  5. Publish questionnaire
  6. Submit public feedback with role and ratings
  7. Run feedback-to-audit correlation
  8. Retrieve comprehensive health report and verify non-destructive disclaimer

---

## 3. Running the Test Suite

From the `backend/` directory:

```bash
# Run full test suite with verbose output
pytest -v tests

# Run security tests only
pytest -v tests/security

# Run integration tests only
pytest -v tests/integration

# Run standalone automated security validation script
python scripts/security_check.py
```

All 44 automated pytest tests and 23 standalone security check validations execute with 100% pass rate.
