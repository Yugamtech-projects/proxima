"""
Chapter Schemas for Proxima.
Accepts both camelCase and snake_case while maintaining pure snake_case backend fields.
Provides clean type definitions for dropdown selections in OpenAPI docs.
"""

from typing import Literal, Optional
from schemas.base import SnakeBaseModel
from schemas.license import LicensePlan

ChapterStatus = Literal["ACTIVE", "INACTIVE", "SUSPENDED"]
OrganizationType = Literal[
    "Business Forum",
    "BNI Chapter",
    "CNI Chapter",
    "Rotary Club",
    "Lions Club",
    "TiE",
    "Yi",
    "Round Table",
    "Independent Business Group",
]


class ChapterOnboardRequest(SnakeBaseModel):
    """Payload for POST /api/chapters with clean OpenAPI plan dropdown selector."""

    chapter_name: str
    city: str
    admin_login_id: str
    admin_password: str
    organization_type: Optional[OrganizationType | str] = "Business Forum"
    plan_key: Optional[LicensePlan] = "SEMI_ANNUAL"
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    vip_token: Optional[str] = None


class ChapterUpdateRequest(SnakeBaseModel):
    """Payload for updating chapter metadata with clean status dropdown selector."""

    name: Optional[str] = None
    city: Optional[str] = None
    organization_type: Optional[OrganizationType | str] = None
    status: Optional[ChapterStatus] = None
    default_zoom: Optional[int] = None
