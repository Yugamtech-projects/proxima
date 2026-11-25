"""Shared API rate-limit configuration."""

from slowapi import Limiter
from slowapi.util import get_remote_address

from config.config import DEV_ENV, RATE_LIMIT_DEFAULT, RATE_LIMIT_AUTH, RATE_LIMIT_API

RATE_LIMIT_STORAGE = "memory"

rate_limiter = Limiter(
    key_func=get_remote_address,
    default_limits=RATE_LIMIT_DEFAULT,
    headers_enabled=False,
    key_prefix="proxima-api",
    storage_uri="memory://",
    strategy="fixed-window",
    swallow_errors=False,
    enabled=not DEV_ENV,
    key_style="endpoint",
)

__all__ = [
    "RATE_LIMIT_DEFAULT",
    "RATE_LIMIT_AUTH",
    "RATE_LIMIT_API",
    "RATE_LIMIT_STORAGE",
    "rate_limiter",
]
