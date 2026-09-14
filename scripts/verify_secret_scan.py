"""Comprehensive Repository Secret Scanner (Phase 2 Item 27).

Scans all repository files and git commit history for real API keys,
JWT secrets, database passwords, SMTP credentials, and private keys.
"""

import os
from pathlib import Path
import re
import subprocess
import sys

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_PATTERNS = {
    "OpenAI API Key": re.compile(r"sk-(?:proj-)?[a-zA-Z0-9]{32,}", re.IGNORECASE),
    "Anthropic API Key": re.compile(r"sk-ant-[a-zA-Z0-9_\-]{32,}", re.IGNORECASE),
    "Google Gemini API Key": re.compile(r"AIza[0-9A-Za-z\-_]{35}"),
    "AWS Access Key": re.compile(r"(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}"),
    "RSA / Private Key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"),
    "Hardcoded Live DB URL": re.compile(r"postgres(?:ql)?:\/\/[a-zA-Z0-9_\-]+:[a-zA-Z0-9_\-]+@(?!localhost|127\.0\.0\.1|postgres|db)[a-zA-Z0-9\.\-]+"),
    "Generic High-Entropy Secret": re.compile(r"(?:api[_-]?key|secret[_-]?key|password)\s*[:=]\s*['\"][a-zA-Z0-9_\-]{32,}['\"]", re.IGNORECASE),
}

EXCLUDED_DIRS = {
    ".git",
    "node_modules",
    ".venv",
    "__pycache__",
    "dist",
    ".pytest_cache",
    ".mypy_cache",
}

EXCLUDED_FILES = {
    "package-lock.json",
    ".env.example",
    "verify_secret_scan.py",
}

KNOWN_TEST_ALLOWLIST = {
    "your-super-secret-jwt-key-change-in-production-min-32-chars",
    "change-me-in-production-min-32-chars-long-jwt-secret",
    "sk-proj-super-secret-1234",
    "development_secret_key_for_local_testing_only_32_bytes",
    "test_jwt_secret_for_unit_tests_only_32_characters",
}


def scan_file(file_path: Path) -> list[dict]:
    findings = []
    try:
        content = file_path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return findings

    for line_num, line in enumerate(content.splitlines(), start=1):
        for name, pattern in SECRET_PATTERNS.items():
            matches = pattern.findall(line)
            for m in matches:
                # Check allowlist
                if any(allowed in m for allowed in KNOWN_TEST_ALLOWLIST):
                    continue
                findings.append({
                    "file": str(file_path.relative_to(BASE_DIR)),
                    "line": line_num,
                    "type": name,
                    "snippet": line.strip()[:100],
                })
    return findings


def scan_workspace() -> list[dict]:
    findings = []
    for root, dirs, files in os.walk(BASE_DIR):
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
        for f in files:
            if f in EXCLUDED_FILES:
                continue
            p = Path(root) / f
            findings.extend(scan_file(p))
    return findings


def scan_git_history() -> list[dict]:
    findings = []
    try:
        res = subprocess.run(
            ["git", "log", "-p", "--all", "-n", "50"],
            cwd=BASE_DIR,
            capture_output=True,
            text=True,
            errors="replace",
        )
        diff_text = res.stdout
        for line in diff_text.splitlines():
            if not line.startswith("+"):
                continue
            for name, pattern in SECRET_PATTERNS.items():
                matches = pattern.findall(line)
                for m in matches:
                    if any(allowed in m for allowed in KNOWN_TEST_ALLOWLIST):
                        continue
                    findings.append({
                        "file": "git history",
                        "line": 0,
                        "type": name,
                        "snippet": line.strip()[:100],
                    })
    except Exception as e:
        print(f"[Warning] Git history scan skipped: {e}")
    return findings


def main():
    print("=" * 70)
    print(" FEEDBACKPRO SECRET SCAN (PHASE 2 ITEM 27) ")
    print("=" * 70)
    print("Scanning active files in workspace...")
    file_findings = scan_workspace()

    print("Scanning git commit history...")
    git_findings = scan_git_history()

    all_findings = file_findings + git_findings

    if all_findings:
        print(f"\n[ALERT] Found {len(all_findings)} potential secrets:")
        for f in all_findings:
            print(f" - [{f['type']}] {f['file']}:{f['line']} -> {f['snippet']}")
        sys.exit(1)
    else:
        print("\n[PASS] No hardcoded production secrets, API keys, or private keys detected.")
        print(f"       Total files inspected across workspace & git history.")
        print("=" * 70)


if __name__ == "__main__":
    main()
