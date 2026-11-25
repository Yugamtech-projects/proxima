"""
Payment API Controller for Proxima.
Provides complete standard REST CRUD endpoints (GET, POST, PATCH, DELETE) for payment orders
and merchant credential management.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status

from auth.dependencies import require_master_admin
from schemas.payment import (
    PaymentCreateRequest,
    PaymentUpdateRequest,
    PaymentConfigUpdateRequest,
)
from service.payment_service import PaymentService

router = APIRouter(prefix="/payment")


@router.get("")
async def list_payments(
    chapter_id: Optional[str] = Query(default=None),
    order_id: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
) -> List[Dict[str, Any]]:
    """Lists payment transactions and invoices from licenses (READ operation in CRUD)."""
    return await PaymentService.get_payments(chapter_id=chapter_id, order_id=order_id, payment_status=status)


@router.get("/config")
async def get_payment_config() -> Dict[str, Any]:
    """Retrieves active public Razorpay merchant Key ID and mode status in pure snake_case."""
    config = await PaymentService.get_effective_config()
    return {"key_id": config["key_id"], "is_live": config["is_live"], "is_configured": config["is_configured"]}


@router.post("/config")
async def update_payment_config(payload: PaymentConfigUpdateRequest, current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Updates dynamic merchant Razorpay credentials in memory (Master Admin only)."""
    return await PaymentService.update_payment_config(payload=payload)


@router.get("/{order_id}")
async def get_payment(order_id: str) -> Dict[str, Any]:
    """Checks the status and details of a specific payment order or invoice (READ operation in CRUD)."""
    payments = await PaymentService.get_payments(order_id=order_id)
    if not payments:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment record not found.")
    return payments[0]


@router.post("")
async def create_payment(payload: PaymentCreateRequest) -> Dict[str, Any]:
    """Initiates a payment order with status 'PENDING' (CREATE operation in CRUD)."""
    return await PaymentService.create_payment(payload=payload)


@router.patch("/{order_id}")
async def update_payment(order_id: str, payload: PaymentUpdateRequest) -> Dict[str, Any]:
    """
    Submits payment proof and signature. Cryptographically verifies it,
    extends the chapter license in PostgreSQL, and records invoice (UPDATE operation in CRUD).
    """
    return await PaymentService.update_payment(order_id=order_id, payload=payload)


@router.delete("/{order_id}")
async def delete_payment(order_id: str, current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Cancels/removes an invoice payment record from chapter license (DELETE operation in CRUD)."""
    success = await PaymentService.delete_payment(order_id=order_id)
    return {"success": success}


@router.post("/webhook")
async def handle_payment_webhook(request: Request, x_razorpay_signature: Optional[str] = Header(default=None, alias="X-Razorpay-Signature")) -> Dict[str, Any]:
    """Processes automated server-to-server Razorpay webhooks with cryptographic validation."""
    body_bytes = await request.body()
    return await PaymentService.process_webhook(raw_signature=x_razorpay_signature, payload_bytes=body_bytes)
