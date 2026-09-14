"""Firebase Admin SDK Integration for Server-Side ID Token Verification."""

import json
import logging
import os
from pathlib import Path
from typing import Any

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_firebase_app: Any = None
_firebase_initialized: bool = False


def initialize_firebase() -> Any:
    """Safely initializes the Firebase Admin SDK singleton.
    
    Prefers:
    1. FIREBASE_SERVICE_ACCOUNT_JSON (direct JSON string or filepath)
    2. Google Application Default Credentials / Project ID
    3. Safe development fallback if credentials are omitted
    """
    global _firebase_app, _firebase_initialized

    if _firebase_initialized and _firebase_app is not None:
        return _firebase_app

    if not settings.FIREBASE_AUTH_ENABLED:
        logger.info("Firebase authentication is disabled in configuration.")
        return None

    try:
        import firebase_admin
        from firebase_admin import credentials

        # Check if already initialized in default app
        try:
            _firebase_app = firebase_admin.get_app()
            _firebase_initialized = True
            return _firebase_app
        except ValueError:
            pass  # Not yet initialized

        # Option A: Service account JSON string or file path
        if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
            sa_val = settings.FIREBASE_SERVICE_ACCOUNT_JSON.strip()
            if sa_val.startswith("{"):
                cred_dict = json.loads(sa_val)
                cred = credentials.Certificate(cred_dict)
            elif Path(sa_val).is_file():
                cred = credentials.Certificate(sa_val)
            else:
                raise ValueError("FIREBASE_SERVICE_ACCOUNT_JSON is neither valid JSON nor an existing file path.")
            _firebase_app = firebase_admin.initialize_app(cred)
        # Option B: Project ID with default credentials
        elif settings.FIREBASE_PROJECT_ID:
            _firebase_app = firebase_admin.initialize_app(options={"projectId": settings.FIREBASE_PROJECT_ID})
        else:
            _firebase_app = firebase_admin.initialize_app()

        _firebase_initialized = True
        logger.info("Firebase Admin SDK initialized successfully (Project: %s).", settings.FIREBASE_PROJECT_ID)
        return _firebase_app

    except Exception as e:
        logger.warning("Firebase Admin SDK initialization skipped or deferred: %s", str(e))
        if settings.ENVIRONMENT == "production":
            logger.error("[CRITICAL] Production environment requires valid Firebase Admin configuration.")
        return None


def verify_firebase_id_token(id_token: str) -> dict[str, Any] | None:
    """Verifies a Firebase ID token and returns decoded claims.
    
    Returns:
        dict containing 'uid', 'email', 'name', 'email_verified' if valid.
        None if verification fails.
    """
    if not id_token or not isinstance(id_token, str):
        return None

    # Safe test harness hook for offline unit/integration test suites
    # Only active if settings.ENVIRONMENT != "production"
    if settings.ENVIRONMENT != "production" and id_token.startswith("test_fb_"):
        if id_token.startswith("test_fb_valid:"):
            # Format: test_fb_valid:{uid}:{email}:{name}
            parts = id_token.split(":", 3)
            uid = parts[1] if len(parts) > 1 else "test_fb_user"
            email = parts[2] if len(parts) > 2 else f"{uid}@example.com"
            name = parts[3] if len(parts) > 3 else "Test Firebase User"
            return {
                "uid": uid,
                "email": email,
                "name": name,
                "email_verified": True,
                "firebase": {"sign_in_provider": "password"},
            }
        elif id_token in ("test_fb_expired", "test_fb_invalid"):
            return None

    try:
        import firebase_admin.auth

        app = initialize_firebase()
        if not app:
            return None

        decoded = firebase_admin.auth.verify_id_token(id_token, check_revoked=True)
        return {
            "uid": decoded.get("uid"),
            "email": decoded.get("email"),
            "name": decoded.get("name") or decoded.get("displayName") or (decoded.get("email", "").split("@")[0]),
            "email_verified": decoded.get("email_verified", False),
            "firebase": decoded.get("firebase", {}),
        }
    except Exception as e:
        logger.debug("Firebase ID token verification failed: %s", str(e))
        return None
