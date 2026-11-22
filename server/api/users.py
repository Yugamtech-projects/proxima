"""
User Administration API Controller for Proxima.
Exposes /api/users endpoints (Master Admin only).
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import require_master_admin
from service.user_service import UserService

router = APIRouter(prefix="/users")


@router.get("")
async def list_users(current_user: Dict[str, Any] = Depends(require_master_admin)) -> List[Dict[str, Any]]:
    """Retrieves all administrative users (Master Admin only)."""
    return await UserService.get_all_users()


@router.get("/{user_id}")
async def get_user(user_id: str, current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Retrieves a single user by ID (Master Admin only)."""
    user = await UserService.get_user_by_id(user_id=user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user
