"""
User Administration CRUD API Controller for Proxima.
Provides complete CRUD endpoints (GET, POST, PATCH, DELETE) for administrative accounts (Master Admin only).
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.dependencies import require_master_admin, get_current_user
from schemas.user import UserCreateRequest, UserUpdateRequest
from service.user_service import UserService

router = APIRouter(prefix="/users")


@router.get("")
async def list_users(
    user_id: Optional[str] = Query(default=None),
    email: Optional[str] = Query(default=None),
    chapter_id: Optional[str] = Query(default=None),
    role: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: Optional[int] = Query(default=None),
    offset: Optional[int] = Query(default=None),
    current_user: Dict[str, Any] = Depends(require_master_admin),
) -> List[Dict[str, Any]]:
    """Unified filtered user retrieval supporting all combinations of filters (Master Admin only)."""
    return await UserService.get_users(
        user_id=user_id,
        email=email,
        chapter_id=chapter_id,
        role=role,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get("/{user_id}")
async def get_user(user_id: str, current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Retrieves a single user by primary key ID (Master Admin only)."""
    users = await UserService.get_users(user_id=user_id)
    if not users:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return users[0]


@router.post("")
async def create_user(payload: UserCreateRequest, current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Creates a new administrative user (Master Admin only)."""
    return await UserService.create_user(payload=payload)


@router.patch("/{user_id}")
async def update_user(
    user_id: str,
    payload: UserUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Applies dynamic partial updates to an administrative user (Master Admin or self)."""
    is_self = current_user.get("id") == user_id or current_user.get("email", "").lower() == user_id.lower()
    is_master = current_user.get("role") == "MASTER_ADMIN"
    if not (is_self or is_master):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: You can only update your own account.")

    if not is_master and payload.role is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Only Master Admin can modify roles.")

    updated = await UserService.update_user(user_id=user_id, payload=payload)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return updated


@router.post("/{user_id}/revoke")
async def revoke_user_sessions(user_id: str, current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Immediately revokes all active JWT tokens for a target user by incrementing their token_version."""
    success = await UserService.revoke_user_tokens(user_id=user_id)
    return {"success": success, "message": f"All active sessions for user {user_id} have been revoked."}


@router.delete("/{user_id}")
async def delete_user(user_id: str, current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Deletes an administrative user (Master Admin only)."""
    success = await UserService.delete_user(user_id=user_id)
    return {"success": success}
