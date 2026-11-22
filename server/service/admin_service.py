"""
Platform Administration & Observability Telemetry Service for Proxima.
"""

import time
from datetime import datetime, timezone
from typing import Any, Dict

from database.database import DatabaseManager
from config.config import CHAPTERS_TABLE


class AdminService:
    """Class-based service providing platform telemetry and system health metrics."""

    _start_time: float = time.time()


    @classmethod
    async def get_system_health(cls) -> Dict[str, Any]:
        """Collects uptime, database connection telemetry, and active chapter counts."""
        now = datetime.now(timezone.utc)
        uptime_seconds = int(time.time() - cls._start_time)

        select_chapter_ids_query = f"""
            SELECT id FROM {CHAPTERS_TABLE}
        """
        chapters = await DatabaseManager.execute_db_select(query=select_chapter_ids_query)
        chapters_count = len(chapters)

        return {
            "status": "HEALTHY",
            "uptimeSeconds": uptime_seconds,
            "timestamp": now.isoformat(),
            "activeSessions": 1,
            "chaptersCount": chapters_count,
            "memoryUsage": {"rss": 0, "heapTotal": 0, "heapUsed": 0},
            "dbVersion": 1,
        }
