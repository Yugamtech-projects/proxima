"""
SuperAdmin Analytics, Telemetry & Health Schemas for Proxima.
Provides structured Pydantic models for dashboard KPIs, security audit logs,
geospatial chapter data, and monetization analytics.
"""

from typing import Any, Dict, List, Optional
from schemas.base import SnakeBaseModel


# ============================================================================
# SECTION 1: SYSTEM HEALTH & TELEMETRY SCHEMAS
# ============================================================================

class MemoryUsageSchema(SnakeBaseModel):
    """Subschema for process memory consumption telemetry."""

    rss: int = 0
    heap_total: int = 0
    heap_used: int = 0


class AdminSystemHealthResponse(SnakeBaseModel):
    """Parent schema for GET /api/admin/analytics/health and GET /api/health."""

    status: str = "HEALTHY"
    uptime_seconds: int
    timestamp: str
    active_sessions: int = 1
    chapters_count: int = 0
    memory_usage: Optional[MemoryUsageSchema] = None
    db_version: int = 1


# ============================================================================
# SECTION 2: DASHBOARD OVERVIEW SCHEMAS
# ============================================================================

class AdminDashboardResponse(SnakeBaseModel):
    """Parent schema for GET /api/admin/analytics (Dashboard Overview)."""

    status: str = "HEALTHY"
    uptime_seconds: int
    timestamp: str
    total_chapters: int
    active_chapters: int
    total_members: int
    visible_members: int
    active_licenses: int
    total_revenue_inr: float
    claimed_vip_passes: int
    failed_logins_24h: int
    recent_chapters: List[Dict[str, Any]] = []
    recent_invoices: List[Dict[str, Any]] = []


# ============================================================================
# SECTION 3: SECURITY AUDIT & LOCKOUT ANALYTICS SCHEMAS
# ============================================================================

class SecurityAuditLogItem(SnakeBaseModel):
    """Subschema representing an individual authentication attempt entry."""

    id: str
    ip_address: str
    identifier: str
    status: str
    user_agent: Optional[str] = None
    attempted_at: str


class AdminSecurityAnalyticsResponse(SnakeBaseModel):
    """Parent schema for GET /api/admin/analytics/security."""

    total_attempts_24h: int
    failed_attempts_24h: int
    successful_logins_24h: int
    recent_audit_logs: List[SecurityAuditLogItem]


# ============================================================================
# SECTION 4: CHAPTER & GEOSPATIAL ANALYTICS SCHEMAS
# ============================================================================

class CityDistributionItem(SnakeBaseModel):
    """Subschema for chapter concentration count per city."""

    city: str
    count: int


class OrgDistributionItem(SnakeBaseModel):
    """Subschema for organization type concentration count."""

    organization_type: str
    count: int


class TopChapterItem(SnakeBaseModel):
    """Subschema for top chapter ranked by active member count."""

    id: str
    name: str
    city: str
    organization_type: str
    status: str
    member_count: int


class AdminChapterAnalyticsResponse(SnakeBaseModel):
    """Parent schema for GET /api/admin/analytics/chapters."""

    total_chapters: int
    total_members: int
    city_distribution: List[CityDistributionItem]
    organization_distribution: List[OrgDistributionItem]
    top_chapters_by_roster: List[TopChapterItem]
    chapters: List[Dict[str, Any]] = []


# ============================================================================
# SECTION 5: REVENUE & MONETIZATION ANALYTICS SCHEMAS
# ============================================================================

class PlanRevenueItem(SnakeBaseModel):
    """Subschema for revenue and count aggregated per license plan."""

    plan: str
    count: int
    total_revenue_inr: float


class AdminRevenueAnalyticsResponse(SnakeBaseModel):
    """Parent schema for GET /api/admin/analytics/revenue."""

    total_revenue_inr: float
    paid_licenses_count: int
    complimentary_licenses_count: int
    plan_breakdown: List[PlanRevenueItem]
    recent_invoices: List[Dict[str, Any]] = []
    active_licenses: List[Dict[str, Any]] = []
