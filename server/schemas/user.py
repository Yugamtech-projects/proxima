"""
User and Authentication Schemas for Proxima.
Accepts both camelCase and snake_case while maintaining pure snake_case backend fields.
"""

from typing import Any, Dict, Optional
from schemas.base import SnakeBaseModel


class LoginRequest(SnakeBaseModel):
    """Payload for POST /api/auth/login."""

    login_id: str
    password: str


class ChapterSessionInfo(SnakeBaseModel):
    """Chapter details attached to an active Chapter Admin session."""

    id: str
    slug: str
    name: str
    organization_type: Optional[str] = "Business Forum"
    city: str
    access_key: str
    status: str = "ACTIVE"


class SessionData(SnakeBaseModel):
    """Session object returned inside ServerAuthResponse."""

    token: str
    role: str
    email: str
    name: str
    chapter: Optional[Dict[str, Any]] = None
    expires_at: int


class ServerAuthResponse(SnakeBaseModel):
    """Standard authentication response consumed by the frontend."""

    success: bool
    session: Optional[SessionData] = None
    error: Optional[str] = None


class UserResponse(SnakeBaseModel):
    """User profile representation for administrative listings."""

    id: str
    chapter_id: Optional[str] = None
    chapter_slug: Optional[str] = None
    chapter_name: Optional[str] = None
    email: str
    name: str
    role: str
    is_active: bool = True
