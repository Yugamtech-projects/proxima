"""
Spatial & Geospatial Schema Models for Proxima.
Provides request and response payload contracts for PostGIS radar,
trip multiplier routing, and Google Maps URL expansions.
"""

from typing import Any, Dict, List, Optional
from schemas.base import SnakeBaseModel
from schemas.member import Availability


class ExpandUrlRequest(SnakeBaseModel):
    """Payload for expanding and parsing a shortened Google Maps URL."""

    url: str


class ExpandUrlResponse(SnakeBaseModel):
    """Response containing coordinates extracted from resolved Google Maps URL."""

    success: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    extracted_name: Optional[str] = None
    resolved_url: Optional[str] = None
    error: Optional[str] = None


class RadarMemberItem(SnakeBaseModel):
    """Member entity returned in proximity radar search with calculated distance."""

    id: str
    chapter_id: str
    name: str
    company: str
    category: str
    category_id: str = "general"
    category_icon: str = "Briefcase"
    phone: str
    email: str
    photo_url: Optional[str] = None
    location: Dict[str, Any]
    distance_km: float
    one_to_one_availability: Optional[Availability] = "AVAILABLE"
    is_visible: bool = True


class RadarResponse(SnakeBaseModel):
    """Response payload for GET /api/spatial/radar."""

    center_latitude: float
    center_longitude: float
    radius_km: float
    total_found: int
    members: List[RadarMemberItem]


class TripMultiplierMemberItem(SnakeBaseModel):
    """En-route networking detour opportunity member entity."""

    id: str
    chapter_id: str
    name: str
    company: str
    category: str
    category_id: str = "general"
    category_icon: str = "Briefcase"
    phone: str
    email: str
    photo_url: Optional[str] = None
    location: Dict[str, Any]
    detour_km: float
    distance_from_origin_km: float
    distance_to_dest_km: float
    is_visible: bool = True


class TripMultiplierResponse(SnakeBaseModel):
    """Response payload for GET /api/spatial/trip-multiplier."""

    origin_latitude: float
    origin_longitude: float
    destination_latitude: float
    destination_longitude: float
    direct_distance_km: float
    max_detour_km: float
    total_opportunities: int
    members: List[TripMultiplierMemberItem]
