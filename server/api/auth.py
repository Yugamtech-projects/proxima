"""
Authentication API Controller for Proxima.
Exposes /api/auth/login and /api/auth/me endpoints.
"""

from typing import Any, Dict
from fastapi import APIRouter, Depends, Request

from auth.dependencies import get_current_user
from schemas.user import LoginRequest
from service.auth_service import AuthService

router = APIRouter(prefix="/auth")


@router.post("/login")
async def login(payload: LoginRequest, request: Request) -> Dict[str, Any]:
    """Authenticates credentials against stored password hashes with brute-force lockout defense."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    return await AuthService.authenticate_user(login_id=payload.login_id, password=payload.password, client_ip=client_ip)


@router.get("/me")
async def get_my_profile(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Retrieves profile and active chapter context for the authenticated user."""
    return {
        "id": current_user.get("id"),
        "email": current_user.get("email"),
        "name": current_user.get("name"),
        "role": current_user.get("role"),
        "chapter_id": current_user.get("chapter_id"),
        "chapter_slug": current_user.get("chapter_slug"),
        "chapter_name": current_user.get("chapter_name"),
    }
