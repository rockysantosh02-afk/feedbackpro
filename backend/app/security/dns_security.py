"""DNS Security and Multi-homed Resolution Validator.

Resolves all A and AAAA records for a target hostname and verifies that none of the
resolved addresses map to internal, private, loopback, or metadata networks.
"""

import socket
from typing import NamedTuple

from app.security.ip_classifier import classify_ip


class DNSResolutionResult(NamedTuple):
    is_safe: bool
    hostname: str
    resolved_ips: list[str]
    error_message: str | None = None


# Hostnames that are immediately rejected without DNS query
BLOCKED_HOSTNAMES = {
    "localhost",
    "metadata",
    "metadata.google.internal",
    "instance-data",
    "docker.for.win.localhost",
    "docker.for.mac.localhost",
    "host.docker.internal",
    "gateway.docker.internal",
    "kubernetes.default",
    "kubernetes.default.svc",
}


def resolve_and_validate_hostname(hostname: str) -> DNSResolutionResult:
    """Performs strict DNS resolution for all A and AAAA records and classifies every IP.

    If any resolved IP is prohibited, the entire hostname is rejected.
    """
    clean_host = hostname.strip().lower()

    if not clean_host:
        return DNSResolutionResult(
            is_safe=False, hostname=clean_host, resolved_ips=[], error_message="Hostname is empty"
        )

    # Check immediate blocked hostnames or patterns
    if (
        clean_host in BLOCKED_HOSTNAMES
        or clean_host.endswith(".internal")
        or clean_host.endswith(".local")
        or clean_host.endswith(".localhost")
    ):
        return DNSResolutionResult(
            is_safe=False,
            hostname=clean_host,
            resolved_ips=[],
            error_message=f"Hostname '{clean_host}' is a prohibited internal/local domain",
        )

    # Resolve all A and AAAA records via getaddrinfo
    resolved_ips: list[str] = []
    try:
        # socket.AF_UNSPEC fetches both IPv4 (AF_INET) and IPv6 (AF_INET6)
        addr_info = socket.getaddrinfo(clean_host, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for entry in addr_info:
            sockaddr = entry[4]
            ip_str = sockaddr[0]
            if ip_str not in resolved_ips:
                resolved_ips.append(ip_str)
    except socket.gaierror as e:
        return DNSResolutionResult(
            is_safe=False,
            hostname=clean_host,
            resolved_ips=[],
            error_message=f"DNS resolution failed for '{clean_host}': {e}",
        )
    except Exception as e:
        return DNSResolutionResult(
            is_safe=False,
            hostname=clean_host,
            resolved_ips=[],
            error_message=f"Unexpected DNS error for '{clean_host}': {e}",
        )

    if not resolved_ips:
        return DNSResolutionResult(
            is_safe=False,
            hostname=clean_host,
            resolved_ips=[],
            error_message=f"No IP addresses resolved for hostname '{clean_host}'",
        )

    # Check every single resolved IP address
    for ip in resolved_ips:
        classification = classify_ip(ip)
        if not classification.is_safe:
            return DNSResolutionResult(
                is_safe=False,
                hostname=clean_host,
                resolved_ips=resolved_ips,
                error_message=(
                    f"Hostname '{clean_host}' resolved to restricted IP {classification.ip_str}: "
                    f"{classification.reason}"
                ),
            )

    return DNSResolutionResult(
        is_safe=True, hostname=clean_host, resolved_ips=resolved_ips, error_message=None
    )
