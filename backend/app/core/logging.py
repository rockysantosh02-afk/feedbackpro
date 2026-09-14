"""Structured Logging Configuration with Sensitive Data Masking."""

import logging
import re
import sys

# Regex patterns for sensitive keys and tokens
SENSITIVE_PATTERNS = [
    (re.compile(r"(password|token|secret|api_key|authorization)[:=]\s*['\"]?([^'\"\s]+)", re.IGNORECASE), r"\1=[REDACTED]"),
    (re.compile(r"(Bearer\s+)[A-Za-z0-9\-._~+/]+=*", re.IGNORECASE), r"\1[REDACTED]"),
]


class SensitiveDataFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            for pattern, repl in SENSITIVE_PATTERNS:
                record.msg = pattern.sub(repl, record.msg)
        return True


def setup_logging(level: str = "INFO") -> logging.Logger:
    logger = logging.getLogger("feedbackpro")
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        handler.addFilter(SensitiveDataFilter())
        logger.addHandler(handler)

    return logger


logger = setup_logging()
