"""
Member Schemas for Proxima.
Accepts both camelCase and snake_case while maintaining pure snake_case backend fields.
Provides clean type definitions for dropdown selections in OpenAPI docs.
"""

from typing import Any, Dict, List, Literal, Optional
from schemas.base import SnakeBaseModel

MembershipStatus = Literal["RENEWED", "NOT_RENEWED"]
Availability = Literal["AVAILABLE", "BUSY", "RESTRICTED"]
LocationStatus = Literal["VERIFIED", "PENDING", "UNVERIFIED"]


class MemberCreateRequest(SnakeBaseModel):
    """Payload to create a new individual member with clean dropdown selectors."""

    id: Optional[str] = None
    chapter_id: str
    name: str
    company: str
    category: str
    category_id: Optional[str] = "general"
    category_icon: Optional[str] = "Briefcase"
    short_bio: Optional[str] = None
    phone: str
    whatsapp: Optional[str] = None
    email: str
    website: Optional[str] = None
    photo_url: Optional[str] = None
    location: Optional[Dict[str, Any]] = None
    one_to_one_availability: Optional[Availability] = "AVAILABLE"
    referral_requirements: Optional[str] = None
    tags: Optional[List[str]] = None
    membership_status: Optional[MembershipStatus] = "RENEWED"
    is_visible: Optional[bool] = True


class MemberUpdateRequest(SnakeBaseModel):
    """Payload for partial updates to an individual member with clean dropdown selectors."""

    name: Optional[str] = None
    company: Optional[str] = None
    category: Optional[str] = None
    category_id: Optional[str] = None
    category_icon: Optional[str] = None
    short_bio: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    photo_url: Optional[str] = None
    location: Optional[Dict[str, Any]] = None
    one_to_one_availability: Optional[Availability] = None
    referral_requirements: Optional[str] = None
    tags: Optional[List[str]] = None
    membership_status: Optional[MembershipStatus] = None
    is_visible: Optional[bool] = None


class MemberRosterSaveRequest(SnakeBaseModel):
    """Payload for bulk roster save/sync."""

    members: List[Dict[str, Any]]
    version: Optional[int] = 1
