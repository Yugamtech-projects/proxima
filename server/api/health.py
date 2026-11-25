"""
Health Check & Observability Telemetry API Controller.
Exposes /api/health and /healthz endpoints.
"""

from typing import Any, Dict
from fastapi import APIRouter

from schemas.admin import AdminSystemHealthResponse
from service.admin_service import AdminService

router = APIRouter()


@router.get("/health", response_model=AdminSystemHealthResponse)
async def get_health() -> Dict[str, Any]:
    """Returns application health, uptime, active chapters, and database status."""
    return await AdminService.get_system_health()


@router.get("/healthz", response_model=AdminSystemHealthResponse)
async def get_healthz() -> Dict[str, Any]:
    """Kubernetes/container liveness probe alias for health check."""
    return await AdminService.get_system_health()
