"""
Payment & Razorpay Schemas for Proxima.
Accepts both camelCase and snake_case while maintaining pure snake_case backend fields.
"""

from typing import Optional
from schemas.base import SnakeBaseModel


class PaymentConfigResponse(SnakeBaseModel):
    """Response returned for GET /api/licensing/config or /api/payment/config."""

    key_id: str
    is_live: bool
    is_configured: bool


class PaymentConfigUpdateRequest(SnakeBaseModel):
    """Payload for POST /api/licensing/config or /api/payment/config."""

    key_id: Optional[str] = None
    key_secret: Optional[str] = None
    webhook_secret: Optional[str] = None


class CreateOrderRequest(SnakeBaseModel):
    """Payload for POST /api/licensing/create-order."""

    chapter_id: str
    plan_key: Optional[str] = "SEMI_ANNUAL"


class CreateOrderResponse(SnakeBaseModel):
    """Response returned for POST /api/licensing/create-order."""

    order_id: str
    amount: int
    currency: str = "INR"
    key_id: str
    plan: str
    duration: str
    server_signature: str
    is_live_order: bool = False
    is_configured: bool = True


class VerifyPaymentRequest(SnakeBaseModel):
    """Payload for POST /api/licensing/verify-payment or /api/payment/verify."""

    chapter_id: str
    plan_key: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: Optional[str] = None


class VerifyPaymentResponse(SnakeBaseModel):
    """Response returned for POST /api/licensing/verify-payment."""

    success: bool
    license: Optional[dict] = None
    invoice: Optional[dict] = None
    error: Optional[str] = None
