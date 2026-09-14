"""Security Test Suite: Response security headers verification."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_security_headers_present(client: AsyncClient):
    res = await client.get("/health")
    assert res.status_code == 200

    # Content-Security-Policy
    csp = res.headers.get("Content-Security-Policy")
    assert csp is not None
    assert "default-src 'self'" in csp

    # X-Frame-Options
    assert res.headers.get("X-Frame-Options") == "DENY"

    # X-Content-Type-Options
    assert res.headers.get("X-Content-Type-Options") == "nosniff"

    # Strict-Transport-Security
    hsts = res.headers.get("Strict-Transport-Security")
    assert hsts is not None
    assert "max-age=" in hsts

    # Referrer-Policy
    assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"

    # Request ID tracking
    assert res.headers.get("X-Request-ID") is not None
