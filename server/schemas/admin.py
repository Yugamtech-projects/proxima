"""
Health and SuperAdmin Telemetry Schemas for Proxima.
"""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Payload returned for GET /api/health."""

    status: str = "HEALTHY"
    uptime_seconds: int = Field(alias="uptimeSeconds")
    timestamp: str
    active_sessions: int = Field(default=0, alias="activeSessions")
    chapters_count: int = Field(default=0, alias="chaptersCount")
    memory_usage: Optional[Dict[str, Any]] = Field(default=None, alias="memoryUsage")
    db_version: int = Field(default=1, alias="dbVersion")

    model_config = {
        "populate_by_name": True,
    }
