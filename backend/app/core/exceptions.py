"""Application-wide custom HTTP exceptions."""

from typing import Any
from fastapi import HTTPException, status


class FeedbackProException(HTTPException):
    def __init__(
        self,
        status_code: int,
        detail: str,
        headers: dict[str, str] | None = None,
        extra: dict[str, Any] | None = None,
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.extra = extra or {}


class EntityNotFoundException(FeedbackProException):
    def __init__(self, entity_name: str = "Resource"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{entity_name} not found or access denied.",
        )


class AccessForbiddenException(FeedbackProException):
    def __init__(self, detail: str = "Forbidden: insufficient permissions or not resource owner."):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )


class SSRFSecurityViolation(FeedbackProException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security Error: Target URL violated SSRF policy ({detail})",
        )
