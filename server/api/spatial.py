"""
Spatial & Geospatial API Controller for Proxima.
Provides unified endpoints for PostGIS proximity radar, trip multiplier en-route networking,
and server-side Google Maps URL expansion.
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, Query, status

from schemas.spatial import ExpandUrlRequest, RadarResponse, TripMultiplierResponse
from service.spatial_service import SpatialService

router = APIRouter(prefix="/spatial")


@router.post("/expand-maps-url")
async def expand_google_maps_url(payload: ExpandUrlRequest) -> Dict[str, Any]:
    """Expands shortened Google Maps URLs server-side and extracts geographic coordinates."""
    if not payload.url or not payload.url.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URL is required.")

    result = await SpatialService.expand_google_maps_url(url=payload.url)
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=result.get("error", "Failed to resolve coordinates."),
        )

    return result


@router.get("/radar", response_model=RadarResponse)
async def get_nearby_radar_members(
    latitude: float = Query(..., description="GPS Latitude of the viewer or center point"),
    longitude: float = Query(..., description="GPS Longitude of the viewer or center point"),
    radius_km: float = Query(default=5.0, ge=0.5, le=100.0, description="Search radius in kilometers"),
    chapter_id: Optional[str] = Query(default=None, description="Optional chapter scope filter"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> Dict[str, Any]:
    """Calculates nearby chapter members within a radius using server-side PostGIS spatial SQL."""
    return await SpatialService.get_nearby_radar_members(
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        chapter_id=chapter_id,
        limit=limit,
        offset=offset,
    )


@router.get("/trip-multiplier", response_model=TripMultiplierResponse)
async def get_trip_multiplier_members(
    origin_latitude: float = Query(..., alias="origin_lat", description="Trip origin latitude"),
    origin_longitude: float = Query(..., alias="origin_lng", description="Trip origin longitude"),
    destination_latitude: float = Query(..., alias="dest_lat", description="Trip destination latitude"),
    destination_longitude: float = Query(..., alias="dest_lng", description="Trip destination longitude"),
    max_detour_km: float = Query(default=5.0, ge=0.5, le=50.0, description="Maximum acceptable detour in kilometers"),
    chapter_id: Optional[str] = Query(default=None, description="Optional chapter scope filter"),
    limit: int = Query(default=25, ge=1, le=100),
) -> Dict[str, Any]:
    """Calculates 1-to-1 en-route networking detour opportunities along a travel path in PostGIS SQL."""
    return await SpatialService.get_trip_multiplier_members(
        origin_latitude=origin_latitude,
        origin_longitude=origin_longitude,
        destination_latitude=destination_latitude,
        destination_longitude=destination_longitude,
        max_detour_km=max_detour_km,
        chapter_id=chapter_id,
        limit=limit,
    )
