"""
Cryptographic Utilities for Proxima.
Provides constant-time comparisons, SHA-256 hashing, HMAC SHA-256 generation,
and 24-character cryptographic chapter access key generation.
"""

import hashlib
import hmac
import secrets


def hash_sha256(data: str) -> str:
    """Computes a standard SHA-256 hexadecimal digest for credentials and data verification."""
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def timing_safe_compare(a: str, b: str) -> bool:
    """Performs a constant-time comparison to protect against side-channel timing attacks."""
    if not isinstance(a, str) or not isinstance(b, str):
        return False
    return hmac.compare_digest(a.encode("utf-8"), b.encode("utf-8"))


def generate_secure_token(nbytes: int = 32) -> str:
    """Generates a high-entropy hexadecimal cryptographic token."""
    return secrets.token_hex(nbytes=nbytes)


def generate_chapter_access_key() -> str:
    """
    Generates an unguessable 27-character chapter access key.
    Format: 'px_' followed by 24 hexadecimal characters.
    """
    random_hex = secrets.token_hex(nbytes=12)
    return f"px_{random_hex}"


def create_hmac_sha256(key: str, message: str) -> str:
    """Computes an HMAC SHA-256 signature for Razorpay orders and webhook validation."""
    key_bytes = key.encode("utf-8")
    message_bytes = message.encode("utf-8")
    return hmac.new(key=key_bytes, msg=message_bytes, digestmod=hashlib.sha256).hexdigest()
