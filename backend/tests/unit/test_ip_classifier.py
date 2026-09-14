"""Unit tests for IP Classifier and SSRF IP evaluation."""

from app.security.ip_classifier import classify_ip


def test_public_safe_ips():
    assert classify_ip("8.8.8.8").is_safe is True
    assert classify_ip("1.1.1.1").is_safe is True
    assert classify_ip("93.184.216.34").is_safe is True
    assert classify_ip("2606:4700:4700::1111").is_safe is True


def test_private_ipv4_blocked():
    assert classify_ip("127.0.0.1").is_safe is False
    assert classify_ip("127.10.20.30").is_safe is False
    assert classify_ip("0.0.0.0").is_safe is False
    assert classify_ip("10.0.0.1").is_safe is False
    assert classify_ip("10.254.0.1").is_safe is False
    assert classify_ip("172.16.0.1").is_safe is False
    assert classify_ip("172.31.255.255").is_safe is False
    assert classify_ip("192.168.1.1").is_safe is False
    assert classify_ip("192.168.0.254").is_safe is False


def test_cloud_metadata_blocked():
    meta = classify_ip("169.254.169.254")
    assert meta.is_safe is False
    assert "metadata" in meta.reason.lower() or "blocked" in meta.reason.lower()

    link_local = classify_ip("169.254.10.20")
    assert link_local.is_safe is False


def test_ipv6_loopback_and_private_blocked():
    assert classify_ip("::1").is_safe is False
    assert classify_ip("[::1]").is_safe is False
    assert classify_ip("fc00::1").is_safe is False
    assert classify_ip("fe80::1").is_safe is False


def test_ipv4_mapped_ipv6_blocked():
    # ::ffff:127.0.0.1 and ::ffff:192.168.1.1 must unmap to IPv4 and be blocked
    mapped_loopback = classify_ip("::ffff:127.0.0.1")
    assert mapped_loopback.is_safe is False

    mapped_private = classify_ip("::ffff:192.168.1.1")
    assert mapped_private.is_safe is False


def test_malformed_ips():
    assert classify_ip("999.999.999.999").is_safe is False
    assert classify_ip("not-an-ip").is_safe is False
