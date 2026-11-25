"""
Payment & Razorpay Schemas for Proxima.
Maintains pure snake_case backend fields.
"""

from typing import Literal, Optional
from schemas.base import SnakeBaseModel
from schemas.license import LicensePlan

PaymentStatus = Literal["PENDING", "COMPLETED", "FAILED", "CANCELLED"]


class PaymentConfigUpdateRequest(SnakeBaseModel):
    """Payload for POST /api/payment/config to override merchant credentials in memory."""

    key_id: Optional[str] = None
    key_secret: Optional[str] = None
    webhook_secret: Optional[str] = None


class PaymentConfigResponse(SnakeBaseModel):
    """Response for GET /api/payment/config."""

    key_id: str
    is_live: bool
    is_configured: bool


class PaymentCreateRequest(SnakeBaseModel):
    """Payload for POST /api/payment to initiate a payment order."""

    chapter_id: str
    plan_key: Optional[LicensePlan] = "SEMI_ANNUAL"


class PaymentUpdateRequest(SnakeBaseModel):
    """Payload for PATCH /api/payment/{order_id} to verify and complete a payment."""

    chapter_id: str
    plan_key: Optional[LicensePlan] = "ANNUAL"
    razorpay_payment_id: str
    razorpay_signature: Optional[str] = None
