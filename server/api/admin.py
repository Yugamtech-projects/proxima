"""
SuperAdmin Analytics & Platform Telemetry API Controller for Proxima.
Provides validated endpoints under /admin/analytics for dashboard overview,
system health, security audit logs, chapter metrics, and revenue analytics.
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Query

from auth.dependencies import require_master_admin
from schemas.admin import (
    AdminDashboardResponse,
    AdminSystemHealthResponse,
    AdminSecurityAnalyticsResponse,
    AdminChapterAnalyticsResponse,
    AdminRevenueAnalyticsResponse,
)
from service.admin_service import AdminService

router = APIRouter(prefix="/admin/analytics")


@router.get("/dashboard", response_model=AdminDashboardResponse)
async def get_dashboard(
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    limit: int = Query(default=5, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: Dict[str, Any] = Depends(require_master_admin),
) -> Dict[str, Any]:
    """Retrieves high-level platform analytics and KPIs across all chapters and services."""
    return await AdminService.get_dashboard_summary(
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )


@router.get("/health", response_model=AdminSystemHealthResponse)
async def get_admin_system_health(current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Retrieves low-level database connection telemetry, uptime, and process health."""
    return await AdminService.get_system_health()


@router.get("/security", response_model=AdminSecurityAnalyticsResponse)
async def get_security_analytics(
    identifier: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: Dict[str, Any] = Depends(require_master_admin),
) -> Dict[str, Any]:
    """Retrieves authentication attempt statistics, lockout counters, and filtered security audit logs."""
    return await AdminService.get_security_analytics(
        identifier=identifier,
        status=status,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )


@router.get("/chapters", response_model=AdminChapterAnalyticsResponse)
async def get_chapter_analytics(
    city: Optional[str] = Query(default=None),
    organization_type: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: Dict[str, Any] = Depends(require_master_admin),
) -> Dict[str, Any]:
    """Retrieves geospatial distribution, organization type breakdown, and member roster sizes with filtering."""
    return await AdminService.get_chapter_analytics(
        city=city,
        organization_type=organization_type,
        status=status,
        limit=limit,
        offset=offset,
    )


@router.get("/revenue", response_model=AdminRevenueAnalyticsResponse)
async def get_revenue_analytics(
    plan: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: Dict[str, Any] = Depends(require_master_admin),
) -> Dict[str, Any]:
    """Retrieves licensing financial breakdown, paid vs complimentary distribution, and total revenue in INR."""
    return await AdminService.get_revenue_analytics(
        plan=plan,
        status=status,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )
