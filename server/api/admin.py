"""
SuperAdmin Analytics & Platform Telemetry API Controller for Proxima.
"""

from typing import Any, Dict
from fastapi import APIRouter, Depends

from auth.dependencies import require_master_admin
from service.admin_service import AdminService
from service.chapter_service import ChapterService

router = APIRouter(prefix="/admin")


@router.get("/dashboard")
async def get_dashboard(current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Retrieves network-wide platform analytics and KPIs for the SuperAdmin portal."""
    health_data = await AdminService.get_system_health()
    chapters = await ChapterService.get_all_chapters()
    return {
        "status": "HEALTHY",
        "totalChapters": len(chapters),
        "uptimeSeconds": health_data.get("uptimeSeconds", 0),
        "timestamp": health_data.get("timestamp"),
    }
