"""
Sliding-Window Rate Limiter for Proxima Authentication.
Defends against brute-force attacks by enforcing a 15-minute lockout
after 5 consecutive failed attempts per IP and login identifier.
"""

import time
from typing import Dict, Tuple
from utils.logger import logger


class RateLimiter:
    """In-memory sliding window rate limiter with live lockout countdown."""

    MAX_FAILED_ATTEMPTS: int = 5
    LOCKOUT_SECONDS: int = 15 * 60  # 15 minutes


    def __init__(self):
        # Maps key -> {"count": int, "lockout_until": float, "last_attempt": float}
        self._store: Dict[str, Dict[str, float]] = {}


    def check_rate_limit(self, key: str) -> Tuple[bool, int]:
        """
        Checks if the specified key is currently locked out.
        Returns: (is_locked: bool, remaining_seconds: int)
        """
        record = self._store.get(key)
        if not record:
            return False, 0

        now = time.time()
        lockout_until = record.get("lockout_until", 0)

        if lockout_until > now:
            remaining = int(lockout_until - now)
            return True, remaining

        if lockout_until <= now and record.get("count", 0) >= self.MAX_FAILED_ATTEMPTS:
            self._store.pop(key, None)
            return False, 0

        return False, 0


    def record_failure(self, key: str) -> Tuple[bool, int]:
        """
        Records a failed authentication attempt.
        Locks the key for 15 minutes upon reaching 5 failures.
        """
        now = time.time()
        record = self._store.get(key, {"count": 0, "last_attempt": now, "lockout_until": 0})
        record["count"] = record.get("count", 0) + 1
        record["last_attempt"] = now

        if record["count"] >= self.MAX_FAILED_ATTEMPTS:
            record["lockout_until"] = now + self.LOCKOUT_SECONDS
            self._store[key] = record
            logger.warning(
                "Security lockout triggered | key=%s, lockout_seconds=%d",
                key,
                self.LOCKOUT_SECONDS,
            )
            return True, self.LOCKOUT_SECONDS

        self._store[key] = record
        return False, 0


    def reset_rate_limit(self, key: str) -> None:
        """Clears the rate limit record upon successful authentication."""
        self._store.pop(key, None)


# Module-level singleton instance
rate_limiter = RateLimiter()
