"""Rate Limiter for API endpoints and public submission protection.

Provides an in-memory sliding-window rate limiter with per-key tracking.
"""

from collections import defaultdict
import time

from fastapi import HTTPException, Request, status


class RateLimiter:
    def __init__(self, requests_limit: int, window_seconds: int):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.requests_log: dict[str, list[float]] = defaultdict(list)

    def is_rate_limited(self, key: str) -> bool:
        now = time.time()
        window_start = now - self.window_seconds

        # Clean old timestamps
        timestamps = [t for t in self.requests_log[key] if t > window_start]
        self.requests_log[key] = timestamps

        if len(timestamps) >= self.requests_limit:
            return True

        self.requests_log[key].append(now)
        return False

    def check(self, request: Request, key_prefix: str = "global") -> None:
        client_ip = request.client.host if request.client else "unknown"
        rate_key = f"{key_prefix}:{client_ip}"

        if self.is_rate_limited(rate_key):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please slow down and try again later.",
                headers={"Retry-After": str(self.window_seconds)},
            )


# Global pre-configured rate limiters
public_form_limiter = RateLimiter(requests_limit=10, window_seconds=60) # 10 submissions per minute per IP
audit_trigger_limiter = RateLimiter(requests_limit=5, window_seconds=60) # 5 audits per minute per IP
auth_limiter = RateLimiter(requests_limit=10, window_seconds=60) # 10 auth attempts per minute per IP
ai_generation_limiter = RateLimiter(requests_limit=10, window_seconds=60) # 10 AI operations per minute
report_export_limiter = RateLimiter(requests_limit=10, window_seconds=60) # 10 report exports per minute
invitation_limiter = RateLimiter(requests_limit=5, window_seconds=60) # 5 invitation batches per minute
