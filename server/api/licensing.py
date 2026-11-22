"""
Licensing & Razorpay Checkout API Controller for Proxima.
Exposes /api/licensing endpoints matching existing frontend client contracts.
"""

from typing import Any, Dict
from fastapi import APIRouter, Depends

from auth.dependencies import require_master_admin
from schemas.payment import (
    PaymentConfigUpdateRequest,
    CreateOrderRequest,
    VerifyPaymentRequest,
)
from schemas.license import VipPassCreateRequest
from service.payment_service import PaymentService
from service.licensing_service import LicensingService

router = APIRouter(prefix="/licensing")


@router.get("/config")
async def get_licensing_config() -> Dict[str, Any]:
    """Retrieves active public Razorpay merchant Key ID and mode status."""
    cfg = PaymentService.get_effective_config()
    return {"keyId": cfg["keyId"], "isLive": cfg["isLive"], "isConfigured": cfg["isConfigured"]}


@router.post("/config")
async def update_licensing_config(payload: PaymentConfigUpdateRequest, current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Dynamically updates merchant Razorpay credentials (Master Admin only)."""
    return PaymentService.update_payment_config(key_id=payload.key_id, key_secret=payload.key_secret, webhook_secret=payload.webhook_secret)


@router.post("/create-order")
async def create_licensing_order(payload: CreateOrderRequest) -> Dict[str, Any]:
    """Creates a server-authoritative Razorpay Order with an HMAC-signed price binding."""
    return await PaymentService.create_order(chapter_id=payload.chapter_id, plan_key=payload.plan_key)


@router.post("/verify-payment")
async def verify_licensing_payment(payload: VerifyPaymentRequest) -> Dict[str, Any]:
    """Cryptographically verifies payment HMAC signature and extends chapter license validity."""
    return await PaymentService.verify_payment(chapter_id=payload.chapter_id, plan_key=payload.plan_key, razorpay_order_id=payload.razorpay_order_id, razorpay_payment_id=payload.razorpay_payment_id, razorpay_signature=payload.razorpay_signature)


@router.get("/vip-passes")
async def list_vip_passes() -> Dict[str, Any]:
    """Retrieves all active and redeemed VIP passes."""
    return {"passes": LicensingService.get_vip_passes()}


@router.post("/vip-passes")
async def create_vip_pass(payload: VipPassCreateRequest, current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Generates a new complimentary 1-year VIP pass (Master Admin only)."""
    pass_obj = LicensingService.create_vip_pass(label=payload.label, max_uses=payload.max_uses, plan_days=payload.plan_days)
    return {"success": True, "pass": pass_obj}
