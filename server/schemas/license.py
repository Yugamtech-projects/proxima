"""
License and VIP Pass Schemas for Proxima.
Accepts both camelCase and snake_case while maintaining pure snake_case backend fields.
"""

from typing import List, Optional
from schemas.base import SnakeBaseModel


class InvoiceResponse(SnakeBaseModel):
    """Receipt invoice payload."""

    id: str
    date: str
    amount: float
    plan: str
    payment_id: Optional[str] = None
    order_id: Optional[str] = None
    status: str = "PAID"


class LicenseResponse(SnakeBaseModel):
    """Chapter License payload matching proxima_db.json."""

    id: str
    chapter_id: str
    status: str = "ACTIVE"
    plan: str
    price_inr: float = 0.00
    valid_until: str
    last_payment_date: Optional[str] = None
    last_payment_id: Optional[str] = None
    last_order_id: Optional[str] = None
    invoices: List[InvoiceResponse] = []


class GrantFreeLicenseRequest(SnakeBaseModel):
    """Payload for POST /api/chapters/grant-free-license."""

    chapter_id: str
    reason: Optional[str] = "Team Credit / Working Prototype"
    duration_days: Optional[int] = 365


class VipPassCreateRequest(SnakeBaseModel):
    """Payload for POST /api/licensing/vip-passes."""

    label: Optional[str] = "Team Credit / Working Prototype"
    max_uses: Optional[int] = 2
    plan_days: Optional[int] = 365


class VipPassResponse(SnakeBaseModel):
    """VIP Pass record payload."""

    id: str
    token: str
    label: str
    max_uses: int = 2
    used_count: int = 0
    plan_days: int = 365
    created_at: Optional[str] = None
