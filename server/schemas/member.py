"""
Member Schemas for Proxima.
Matches Member Location objects and roster structures consumed by MapLibre and AdminPortalModal.
"""

from typing import Any, Dict, List, Optional
from schemas.base import SnakeBaseModel


class MemberLocationResponse(SnakeBaseModel):
    """Verified Location structure stored inside member.location."""

    address: str = ""
    area: str = ""
    city: str = ""
    pincode: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    location_status: str = "PENDING"


class MemberResponse(SnakeBaseModel):
    """Complete Member representation."""

    id: str
    name: str
    company: str
    category: str
    category_id: str
    category_icon: str = "Briefcase"
    short_bio: Optional[str] = None
    phone: str
    whatsapp: Optional[str] = None
    email: str
    website: Optional[str] = None
    photo_url: Optional[str] = None
    location: Dict[str, Any] = {}
    one_to_one_availability: str = "AVAILABLE"
    referral_requirements: Optional[str] = None
    tags: List[str] = []
    membership_status: str = "RENEWED"
    is_visible: bool = True


class MemberRosterSaveRequest(SnakeBaseModel):
    """Payload for POST /api/members/:chapterId."""

    members: List[Dict[str, Any]]
    version: Optional[int] = 1


class MemberRosterResponse(SnakeBaseModel):
    """Response returned for GET /api/members/:chapterId."""

    chapter_id: str
    members: List[Dict[str, Any]]
