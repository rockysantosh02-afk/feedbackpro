"""Unit tests for URL parser and protocol safety."""

from app.security.url_safety import URLSafetyService


def test_url_protocol_enforcement():
    assert URLSafetyService.validate_url("https://example.com").is_safe is True
    assert URLSafetyService.validate_url("http://example.com/path").is_safe is True

    # Blocked protocols
    assert URLSafetyService.validate_url("file:///etc/passwd").is_safe is False
    assert URLSafetyService.validate_url("ftp://ftp.example.com").is_safe is False
    assert URLSafetyService.validate_url("gopher://example.com").is_safe is False
    assert URLSafetyService.validate_url("javascript:alert(1)").is_safe is False
    assert URLSafetyService.validate_url("data:text/html,<h1>test</h1>").is_safe is False


def test_url_length_limits():
    oversized = "https://example.com/" + "a" * 2050
    res = URLSafetyService.validate_url(oversized)
    assert res.is_safe is False
    assert "length" in res.error_message.lower()


def test_embedded_credentials_prohibited():
    res = URLSafetyService.validate_url("https://user:password@example.com")
    assert res.is_safe is False
    assert "credentials" in res.error_message.lower()


def test_direct_ip_literals():
    assert URLSafetyService.validate_url("http://127.0.0.1").is_safe is False
    assert URLSafetyService.validate_url("http://169.254.169.254/latest/meta-data").is_safe is False
    assert URLSafetyService.validate_url("http://[::1]/").is_safe is False
    assert URLSafetyService.validate_url("http://192.168.1.1").is_safe is False
