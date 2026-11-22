"""
Distance & Geospatial Math Utilities for Proxima.
Provides Haversine distance calculations and human-friendly distance formatting.
"""

import math


def calculate_haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """
    Calculates the great-circle distance between two points in kilometers
    using the Haversine formula.
    """
    to_rad = math.radians
    earth_radius_km = 6371.0

    d_lat = to_rad(lat2 - lat1)
    d_lon = to_rad(lon2 - lon1)

    a = (
        math.sin(d_lat / 2.0) ** 2
        + math.cos(to_rad(lat1)) * math.cos(to_rad(lat2)) * math.sin(d_lon / 2.0) ** 2
    )

    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return earth_radius_km * c


def format_distance(distance_km: float) -> str:
    """Formats distance into meters if under 1 km, otherwise kilometers."""
    if distance_km < 1.0:
        meters = round(distance_km * 1000)
        return f"{meters} m"
    return f"{distance_km:.1f} km"
