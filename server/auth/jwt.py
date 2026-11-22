"""
JSON Web Token (JWT) Handling for Proxima.
Issues and verifies stateless Bearer tokens containing user role and chapter scope.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import jwt

from config.config import (
    JWT_SECRET,
    JWT_ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from utils.logger import logger


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generates an encoded JWT Bearer token with expiration."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)

    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": expire,
        "iat": now,
    })

    return jwt.encode(payload=to_encode, key=JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates an incoming JWT Bearer token."""
    try:
        payload = jwt.decode(jwt=token, key=JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("JWT validation failed: Token has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning("JWT validation failed: %s", str(e))
        return None
