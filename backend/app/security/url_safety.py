"""6-Layer URL Safety and Safe HTTP Fetching Engine.

Provides defense-in-depth against SSRF, DNS rebinding, redirect exploitation,
and unbounded payload streaming.
"""

from dataclasses import dataclass, field
import time
from urllib.parse import urljoin, urlparse

import httpx

from app.security.dns_security import resolve_and_validate_hostname
from app.security.ip_classifier import classify_ip


@dataclass
class URLValidationResult:
    is_safe: bool
    normalized_url: str | None = None
    resolved_ips: list[str] = field(default_factory=list)
    error_message: str | None = None


@dataclass
class SafeFetchResponse:
    status_code: int
    headers: dict[str, str]
    body: str
    final_url: str
    redirect_chain: list[str]
    resolved_ips: list[str]
    response_time_ms: int


class URLSafetyService:
    MAX_URL_LENGTH = 2048
    MAX_REDIRECTS = 5
    CONNECT_TIMEOUT_SECONDS = 5.0
    READ_TIMEOUT_SECONDS = 10.0
    MAX_PAYLOAD_BYTES = 5 * 1024 * 1024  # 5 Megabytes
    DEFAULT_USER_AGENT = "FeedbackPro-SecurityAuditor/1.0 (+https://feedbackpro.ai/bot-info)"

    @classmethod
    def validate_url(cls, input_url: str) -> URLValidationResult:
        """Layer 1, 2, and 3: Protocol, bounds, DNS resolution, and IP classification."""
        if not input_url or not isinstance(input_url, str):
            return URLValidationResult(is_safe=False, error_message="URL must be a non-empty string")

        clean_url = input_url.strip()
        if len(clean_url) > cls.MAX_URL_LENGTH:
            return URLValidationResult(
                is_safe=False,
                error_message=f"URL exceeds maximum allowed length of {cls.MAX_URL_LENGTH} characters",
            )

        try:
            parsed = urlparse(clean_url)
        except Exception:
            return URLValidationResult(is_safe=False, error_message="Invalid URL structure")

        # Layer 1: Protocol enforcement
        if parsed.scheme.lower() not in ("http", "https"):
            return URLValidationResult(
                is_safe=False,
                error_message=(
                    f"Prohibited protocol '{parsed.scheme}'. Only 'http' and 'https' are allowed."
                ),
            )

        # Disallow embedded credentials to prevent auth smuggling
        if parsed.username or parsed.password:
            return URLValidationResult(
                is_safe=False, error_message="Embedded credentials (username/password) are prohibited in URLs"
            )

        hostname = parsed.hostname
        if not hostname:
            return URLValidationResult(is_safe=False, error_message="URL must contain a valid hostname")

        # Layer 2 & 3: Check whether hostname is an IP literal or needs DNS resolution
        # If it's directly an IP literal, test classification
        ip_direct = classify_ip(hostname)
        if ip_direct.reason != "Malformed IP address representation":
            # Hostname is directly an IP literal
            if not ip_direct.is_safe:
                return URLValidationResult(
                    is_safe=False,
                    error_message=f"Target IP {ip_direct.ip_str} is restricted: {ip_direct.reason}",
                )
            resolved_ips = [ip_direct.ip_str]
        else:
            # Resolve DNS and validate all A/AAAA records
            dns_result = resolve_and_validate_hostname(hostname)
            if not dns_result.is_safe:
                return URLValidationResult(
                    is_safe=False,
                    error_message=dns_result.error_message or "DNS validation failed",
                )
            resolved_ips = dns_result.resolved_ips

        # Normalize URL
        port_part = f":{parsed.port}" if parsed.port and parsed.port not in (80, 443) else ""
        path_part = parsed.path if parsed.path else "/"
        query_part = f"?{parsed.query}" if parsed.query else ""
        normalized = f"{parsed.scheme.lower()}://{hostname.lower()}{port_part}{path_part}{query_part}"

        return URLValidationResult(
            is_safe=True, normalized_url=normalized, resolved_ips=resolved_ips, error_message=None
        )

    @classmethod
    async def safe_fetch(cls, target_url: str) -> SafeFetchResponse:
        """Performs a safe HTTP GET request with DNS rebinding protection, manual redirect

        validation (Layer 4), and payload streaming bounds (Layer 5).
        """
        current_url = target_url
        redirect_chain: list[str] = []
        all_resolved_ips: list[str] = []

        start_time = time.perf_counter()

        timeout_config = httpx.Timeout(
            connect=cls.CONNECT_TIMEOUT_SECONDS,
            read=cls.READ_TIMEOUT_SECONDS,
            write=cls.CONNECT_TIMEOUT_SECONDS,
            pool=cls.CONNECT_TIMEOUT_SECONDS,
        )

        async with httpx.AsyncClient(
            timeout=timeout_config,
            verify=True,
            follow_redirects=False,
            headers={"User-Agent": cls.DEFAULT_USER_AGENT},
        ) as client:
            for hop in range(cls.MAX_REDIRECTS + 1):
                # Layer 1, 2, 3 validation on every hop
                validation = cls.validate_url(current_url)
                if not validation.is_safe:
                    raise ValueError(
                        f"SSRF validation blocked request at hop {hop} ('{current_url}'): {validation.error_message}"
                    )

                all_resolved_ips.extend(validation.resolved_ips)

                try:
                    # Stream response to enforce 5 MB cap without loading huge files into RAM
                    async with client.stream("GET", current_url) as response:
                        # Check for redirects
                        if response.status_code in (301, 302, 303, 307, 308):
                            location = response.headers.get("Location")
                            if not location:
                                raise ValueError(f"HTTP {response.status_code} received without Location header")

                            redirect_chain.append(current_url)
                            if hop >= cls.MAX_REDIRECTS:
                                raise ValueError(f"Exceeded maximum allowed redirects ({cls.MAX_REDIRECTS})")

                            # Resolve relative redirects
                            current_url = urljoin(current_url, location)
                            continue

                        # Terminal non-redirect response: download body up to MAX_PAYLOAD_BYTES
                        body_chunks: list[bytes] = []
                        total_bytes = 0

                        async for chunk in response.aiter_bytes():
                            body_chunks.append(chunk)
                            total_bytes += len(chunk)
                            if total_bytes > cls.MAX_PAYLOAD_BYTES:
                                raise ValueError(
                                    f"Response exceeded maximum payload limit of {cls.MAX_PAYLOAD_BYTES} bytes"
                                )

                        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
                        raw_body = b"".join(body_chunks)
                        text_body = raw_body.decode("utf-8", errors="replace")

                        # Extract clean headers dict
                        headers_dict = {k: v for k, v in response.headers.items()}

                        return SafeFetchResponse(
                            status_code=response.status_code,
                            headers=headers_dict,
                            body=text_body,
                            final_url=current_url,
                            redirect_chain=redirect_chain,
                            resolved_ips=list(set(all_resolved_ips)),
                            response_time_ms=elapsed_ms,
                        )
                except httpx.RequestError as e:
                    raise ConnectionError(f"HTTP request failed to '{current_url}': {e}") from e

        raise ValueError("Unexpected redirect loop or termination without response")
