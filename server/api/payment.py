"""
Payment API Controller for Proxima.
Exposes /api/payment endpoints (create-order, verify, webhook, config).
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Header, Request

from auth.dependencies import require_master_admin
from schemas.payment import (
    CreateOrderRequest,
    PaymentConfigUpdateRequest,
    VerifyPaymentRequest,
)
from service.payment_service import PaymentService

router = APIRouter(prefix="/payment")


@router.get("/config")
async def get_payment_config() -> Dict[str, Any]:
    """Retrieves active public Razorpay merchant Key ID and mode status."""
    cfg = PaymentService.get_effective_config()
    return {"keyId": cfg["keyId"], "isLive": cfg["isLive"], "isConfigured": cfg["isConfigured"]}


@router.post("/config")
async def update_payment_config(payload: PaymentConfigUpdateRequest, current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Updates dynamic merchant Razorpay credentials (Master Admin only)."""
    return PaymentService.update_payment_config(key_id=payload.key_id, key_secret=payload.key_secret, webhook_secret=payload.webhook_secret)


@router.post("/create-order")
async def create_payment_order(payload: CreateOrderRequest) -> Dict[str, Any]:
    """Creates a server-authoritative Razorpay Order with an HMAC-signed price binding."""
    return await PaymentService.create_order(chapter_id=payload.chapter_id, plan_key=payload.plan_key)


@router.post("/verify")
async def verify_payment(payload: VerifyPaymentRequest) -> Dict[str, Any]:
    """Cryptographically verifies payment HMAC signature and extends chapter license validity."""
    return await PaymentService.verify_payment(chapter_id=payload.chapter_id, plan_key=payload.plan_key, razorpay_order_id=payload.razorpay_order_id, razorpay_payment_id=payload.razorpay_payment_id, razorpay_signature=payload.razorpay_signature)


@router.post("/webhook")
async def handle_payment_webhook(request: Request, x_razorpay_signature: Optional[str] = Header(default=None, alias="X-Razorpay-Signature")) -> Dict[str, Any]:
    """Processes automated server-to-server Razorpay webhooks with cryptographic validation."""
    body_bytes = await request.body()
    return PaymentService.process_webhook(raw_signature=x_razorpay_signature, payload_bytes=body_bytes)
