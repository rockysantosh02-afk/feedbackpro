"""Anti-abuse, honeypot, and privacy-preserving IP hashing utility."""

import hashlib
import os


class AbuseDetector:
    # Dedicated salt for IP anonymization to respect user privacy while preventing spam
    _IP_SALT = os.getenv("IP_HASH_SALT", "feedbackpro_default_privacy_salt_2026")

    @classmethod
    def hash_ip(cls, ip_address: str | None) -> str:
        """Computes a one-way salted SHA-256 hash of an IP address.

        Ensures raw IP addresses are not stored indefinitely in the database.
        """
        if not ip_address:
            return "anonymous"
        salted = f"{cls._IP_SALT}:{ip_address}".encode("utf-8")
        return hashlib.sha256(salted).hexdigest()

    @classmethod
    def verify_honeypot(cls, honeypot_value: str | None) -> bool:
        """Returns True if submission is clean (honeypot field is empty).

        Bots frequently fill hidden input fields.
        """
        if honeypot_value and honeypot_value.strip():
            return False
        return True
