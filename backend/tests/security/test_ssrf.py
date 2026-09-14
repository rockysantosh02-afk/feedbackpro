"""Security Test Suite: Comprehensive SSRF and Prohibited Network Target Validation."""

import pytest
from app.security.url_safety import URLSafetyService


PROHIBITED_SSRF_TARGETS = [
    "http://localhost",
    "http://localhost:8080",
    "http://127.0.0.1",
    "http://127.0.0.1:5000",
    "http://0.0.0.0",
    "http://10.0.0.1",
    "http://10.254.1.2",
    "http://172.16.0.1",
    "http://172.31.0.1",
    "http://192.168.1.1",
    "http://192.168.0.100",
    "http://169.254.169.254",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]",
    "http://[fe80::1]",
    "http://[fc00::1]",
    "http://[::ffff:127.0.0.1]",
    "http://[::ffff:192.168.1.1]",
    "file:///etc/passwd",
    "file:///C:/Windows/win.ini",
    "ftp://server.example.com",
    "gopher://server.example.com",
    "javascript:alert('xss')",
    "data:text/html,<script>alert(1)</script>",
]


@pytest.mark.parametrize("target", PROHIBITED_SSRF_TARGETS)
def test_ssrf_prohibited_targets_rejected(target: str):
    res = URLSafetyService.validate_url(target)
    assert res.is_safe is False, f"Target '{target}' should have been blocked by SSRF policy!"
