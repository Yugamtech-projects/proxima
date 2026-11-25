"""
VIP Passes CRUD API Controller for Proxima.
Provides complete standard REST CRUD endpoints (GET, POST, PATCH, DELETE) for VIP voucher passes.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.dependencies import require_master_admin
from schemas.vip_pass import VipPassCreateRequest, VipPassUpdateRequest
from service.vip_pass_service import VipPassService

router = APIRouter(prefix="/vip-passes")


@router.get("")
async def list_vip_passes(
    pass_id: Optional[str] = Query(default=None),
    token: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    active_only: bool = Query(default=False),
) -> List[Dict[str, Any]]:
    """Unified filtered VIP pass retrieval from PostgreSQL."""
    return await VipPassService.get_vip_passes(pass_id=pass_id, token=token, search=search, active_only=active_only)


@router.get("/{pass_id}")
async def get_vip_pass(pass_id: str) -> Dict[str, Any]:
    """Retrieves a single VIP pass by ID or token from PostgreSQL."""
    passes = await VipPassService.get_vip_passes(pass_id=pass_id)
    if not passes:
        passes = await VipPassService.get_vip_passes(token=pass_id)
    if not passes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VIP pass not found.")
    return passes[0]


@router.post("")
async def create_vip_pass(payload: VipPassCreateRequest, current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Generates a new VIP voucher pass stored in PostgreSQL (Master Admin only)."""
    return await VipPassService.create_vip_pass(payload=payload)


@router.patch("/{pass_id}")
async def update_vip_pass(pass_id: str, payload: VipPassUpdateRequest, current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Applies dynamic partial updates to a VIP voucher pass (Master Admin only)."""
    updated = await VipPassService.update_vip_pass(pass_id=pass_id, payload=payload)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VIP pass not found.")
    return updated


@router.delete("/{pass_id}")
async def delete_vip_pass(pass_id: str, current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Revokes and deletes a VIP voucher pass from PostgreSQL (Master Admin only)."""
    success = await VipPassService.delete_vip_pass(pass_id=pass_id)
    return {"success": success}
