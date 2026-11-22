"""
Chapter Schemas for Proxima.
Accepts both camelCase and snake_case while maintaining pure snake_case backend fields.
"""

from typing import Any, Dict, Optional
from schemas.base import SnakeBaseModel


class ChapterResponse(SnakeBaseModel):
    """Chapter payload matching proxima_db.json and frontend expectations."""

    id: str
    slug: str
    name: str
    organization_type: str = "Business Forum"
    city: str
    access_key: str
    status: str = "ACTIVE"


class ChapterOnboardRequest(SnakeBaseModel):
    """Payload for POST /api/chapters/onboard."""

    chapter_name: str
    city: str
    admin_login_id: str
    admin_password: str
    organization_type: Optional[str] = "Business Forum"
    plan_key: Optional[str] = "SEMI_ANNUAL"
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    vip_token: Optional[str] = None


class ChapterOnboardResponse(SnakeBaseModel):
    """Response returned upon successful chapter self-serve onboarding."""

    success: bool
    chapter: Optional[Dict[str, Any]] = None
    admin: Optional[Dict[str, Any]] = None
