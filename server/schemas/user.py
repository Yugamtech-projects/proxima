"""
User and Authentication Schemas for Proxima.
Accepts both camelCase and snake_case while maintaining pure snake_case backend fields.
"""

from typing import Optional
from schemas.base import SnakeBaseModel


class LoginRequest(SnakeBaseModel):
    """Payload for POST /api/auth/login."""

    login_id: str
    password: str


class UserCreateRequest(SnakeBaseModel):
    """Payload for creating a new administrative user."""

    email: str
    name: str
    password: str
    role: str = "CHAPTER_ADMIN"
    chapter_id: Optional[str] = None
    chapter_slug: Optional[str] = None
    chapter_name: Optional[str] = None


class UserUpdateRequest(SnakeBaseModel):
    """Payload for partial updates to an administrative user."""

    email: Optional[str] = None
    name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
