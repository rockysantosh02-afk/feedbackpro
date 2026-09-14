"""IP Classifier and SSRF Validation Engine.

Implements strict Layer 3 Zero-Trust network classification for both IPv4 and IPv6,
including IPv4-mapped IPv6 normalization and cloud metadata protection.
"""

import ipaddress
from typing import NamedTuple


class IPClassification(NamedTuple):
    is_safe: bool
    ip_str: str
    reason: str | None = None


# Explicitly blocked private, link-local, multicast, and reserved IPv4 ranges
BLOCKED_IPV4_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),       # Current network ("this" network)
    ipaddress.ip_network("10.0.0.0/8"),      # RFC 1918 Private
    ipaddress.ip_network("127.0.0.0/8"),     # Loopback
    ipaddress.ip_network("169.254.0.0/16"),  # Link-local / AWS / GCP / Azure metadata
    ipaddress.ip_network("172.16.0.0/12"),   # RFC 1918 Private
    ipaddress.ip_network("192.168.0.0/16"),  # RFC 1918 Private
    ipaddress.ip_network("224.0.0.0/4"),     # Multicast
    ipaddress.ip_network("240.0.0.0/4"),     # Reserved / Future use
    ipaddress.ip_network("255.255.255.255/32"), # Broadcast
]

# Explicitly blocked IPv6 ranges
BLOCKED_IPV6_NETWORKS = [
    ipaddress.ip_network("::1/128"),         # IPv6 Loopback
    ipaddress.ip_network("fc00::/7"),        # Unique Local Address (ULA)
    ipaddress.ip_network("fe80::/10"),       # Link-Local Unicast
    ipaddress.ip_network("ff00::/8"),        # Multicast
    ipaddress.ip_network("::/128"),          # Unspecified address
]

# Explicit high-risk metadata IPs (AWS, GCP, Azure, OpenStack, DigitalOcean)
BLOCKED_METADATA_IPS = {
    "169.254.169.254",
    "fd00:ec2::254",
}


def unmap_ipv6(ip_obj: ipaddress.IPv6Address) -> ipaddress.IPv4Address | ipaddress.IPv6Address:
    """Unmaps IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1 -> 127.0.0.1)."""
    if ip_obj.ipv4_mapped:
        return ip_obj.ipv4_mapped
    return ip_obj


def classify_ip(ip_str: str) -> IPClassification:
    """Evaluates an IP string against blocked CIDRs, loopbacks, link-locals, and metadata addresses.

    Returns an IPClassification tuple indicating whether the IP is safe to connect to.
    """
    clean_ip = ip_str.strip()
    # Strip brackets from IPv6 literals if present: "[::1]" -> "::1"
    if clean_ip.startswith("[") and clean_ip.endswith("]"):
        clean_ip = clean_ip[1:-1]

    try:
        ip_obj = ipaddress.ip_address(clean_ip)
    except ValueError:
        return IPClassification(is_safe=False, ip_str=clean_ip, reason="Malformed IP address representation")

    # Handle IPv4-mapped IPv6
    if isinstance(ip_obj, ipaddress.IPv6Address):
        ip_obj = unmap_ipv6(ip_obj)

    ip_repr = str(ip_obj)

    # Check explicit cloud metadata addresses
    if ip_repr in BLOCKED_METADATA_IPS:
        return IPClassification(
            is_safe=False,
            ip_str=ip_repr,
            reason=f"Blocked cloud metadata service IP address ({ip_repr})"
        )

    # Check IPv4 classification
    if isinstance(ip_obj, ipaddress.IPv4Address):
        for network in BLOCKED_IPV4_NETWORKS:
            if ip_obj in network:
                return IPClassification(
                    is_safe=False,
                    ip_str=ip_repr,
                    reason=f"Blocked IPv4 range ({network}): {ip_repr} is non-routable or private"
                )

        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local or ip_obj.is_multicast or ip_obj.is_reserved:
            return IPClassification(
                is_safe=False,
                ip_str=ip_repr,
                reason=f"Blocked non-public IPv4 address ({ip_repr})"
            )

    # Check IPv6 classification
    elif isinstance(ip_obj, ipaddress.IPv6Address):
        for network in BLOCKED_IPV6_NETWORKS:
            if ip_obj in network:
                return IPClassification(
                    is_safe=False,
                    ip_str=ip_repr,
                    reason=f"Blocked IPv6 range ({network}): {ip_repr} is non-routable or private"
                )

        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local or ip_obj.is_multicast or ip_obj.is_reserved:
            return IPClassification(
                is_safe=False,
                ip_str=ip_repr,
                reason=f"Blocked non-public IPv6 address ({ip_repr})"
            )

    return IPClassification(is_safe=True, ip_str=ip_repr, reason=None)
