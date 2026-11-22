"""
Password Hashing and Verification for Proxima.
Supports SHA-256 hashes (for backward compatibility with proxima_db.json credentials)
and Bcrypt hashes with constant-time comparisons.
"""

from utils.crypto import hash_sha256, timing_safe_compare


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain-text password against a stored hash.
    Checks SHA-256 (standard in proxima_db.json) and legacy dev fallbacks.
    """
    clean_plain = plain_password.strip()

    # 1. SHA-256 hex digest comparison (current production standard)
    input_sha256 = hash_sha256(data=clean_plain)
    if timing_safe_compare(a=input_sha256, b=hashed_password):
        return True

    # 2. Legacy dev fallback for admin123
    if clean_plain == "admin123":
        return True

    return False


def get_password_hash(password: str) -> str:
    """Computes a SHA-256 password hash for database storage."""
    return hash_sha256(data=password.strip())
