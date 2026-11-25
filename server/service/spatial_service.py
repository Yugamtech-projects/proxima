"""
Spatial & Geospatial Service Layer for Proxima.
Provides unified business logic for:
1. Server-side Google Maps URL expansion (bypassing browser CORS).
2. Proximity radar queries using PostGIS ST_DWithin and GIST spatial index.
3. Trip multiplier en-route detour optimizations using PostGIS ST_Distance.
"""

import json
import math
import re
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import unquote
import httpx

from config.config import MEMBERS_TABLE
from database.database import DatabaseManager
from utils.logger import logger


class SpatialService:
    """Class-based service for all geospatial algorithms and map coordinate resolution."""

    @staticmethod
    def resolve_city_coordinates(city: str) -> Tuple[float, float]:
        """Resolves default geographic center [longitude, latitude] for major business hub cities."""
        city_lookup = {
            "chennai": (80.2155, 13.0878),
            "bengaluru": (77.5946, 12.9716),
            "bangalore": (77.5946, 12.9716),
            "mumbai": (72.8777, 19.0760),
            "hyderabad": (78.4867, 17.3850),
            "coimbatore": (76.9754, 11.0067),
            "pune": (73.8567, 18.5204),
            "delhi": (77.2090, 28.6139),
            "new delhi": (77.2090, 28.6139),
            "noida": (77.3649, 28.6256),
            "gurugram": (77.0878, 28.4950),
            "gurgaon": (77.0878, 28.4950),
            "kochi": (76.2673, 9.9312),
            "kolkata": (88.3639, 22.5726),
            "ahmedabad": (72.5714, 23.0225),
            "surat": (72.8311, 21.1702),
            "jaipur": (75.7873, 26.9124),
            "chandigarh": (76.7794, 30.7333),
            "lucknow": (80.9462, 26.8467),
            "madurai": (78.1198, 9.9252),
            "trichy": (78.7047, 10.7905),
            "salem": (78.1460, 11.6643),
            "tirupur": (77.3411, 11.1085),
            "dubai": (55.2708, 25.2048),
            "singapore": (103.8198, 1.3521),
            "london": (-0.1278, 51.5074),
        }
        clean = city.strip().lower()
        return city_lookup.get(clean, (80.2155, 13.0878))

    @staticmethod
    def _extract_coordinates_from_url(url: str) -> Optional[Tuple[float, float]]:
        """Extracts latitude and longitude from various Google Maps URL formats."""
        # 1. Protobuf format: !3d<lat>!4d<lng>
        proto_match = re.search(r"!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)", url)
        if proto_match:
            try:
                lat = float(proto_match.group(1))
                lng = float(proto_match.group(2))
                if -90 <= lat <= 90 and -180 <= lng <= 180:
                    return lat, lng
            except ValueError:
                pass

        # 2. Embed format: !2d<lng>!3d<lat>
        embed_match = re.search(r"!2d(-?\d{1,3}\.\d+)!3d(-?\d{1,3}\.\d+)", url)
        if embed_match:
            try:
                lng = float(embed_match.group(1))
                lat = float(embed_match.group(2))
                if -90 <= lat <= 90 and -180 <= lng <= 180:
                    return lat, lng
            except ValueError:
                pass

        # 3. Standard @lat,lng format: @13.0878,80.2155
        at_match = re.search(r"@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)", url)
        if at_match:
            try:
                lat = float(at_match.group(1))
                lng = float(at_match.group(2))
                if -90 <= lat <= 90 and -180 <= lng <= 180:
                    return lat, lng
            except ValueError:
                pass

        # 4. Query parameter format: ?q=13.0878,80.2155 or ll=...
        query_match = re.search(r"[?&](?:q|ll|query|destination|center)=(-?\d{1,3}\.\d+)[,\s]+(-?\d{1,3}\.\d+)", url)
        if query_match:
            try:
                lat = float(query_match.group(1))
                lng = float(query_match.group(2))
                if -90 <= lat <= 90 and -180 <= lng <= 180:
                    return lat, lng
            except ValueError:
                pass

        return None


    @staticmethod
    def _extract_name_from_url(url: str) -> Optional[str]:
        """Extracts place name from URL path if present."""
        place_match = re.search(r"/maps/place/([^/@?]+)", url)
        if place_match:
            raw_name = place_match.group(1)
            clean_name = unquote(raw_name).replace("+", " ").strip()
            return clean_name
        return None


    @classmethod
    async def expand_google_maps_url(cls, url: str) -> Dict[str, Any]:
        """
        Follows HTTP 301/302 redirects server-side without CORS limitations
        and extracts GPS coordinates from the final resolved Google Maps URL.
        """
        clean_url = url.strip()
        if not clean_url:
            return {"success": False, "error": "URL cannot be empty."}

        coords = cls._extract_coordinates_from_url(url=clean_url)
        extracted_name = cls._extract_name_from_url(url=clean_url)

        if coords:
            return {
                "success": True,
                "latitude": coords[0],
                "longitude": coords[1],
                "extracted_name": extracted_name,
                "resolved_url": clean_url,
            }

        try:
            headers = {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                "Accept-Language": "en-US,en;q=0.9",
            }
            async with httpx.AsyncClient(follow_redirects=True, timeout=8.0) as client:
                response = await client.get(clean_url, headers=headers)
                resolved_url = str(response.url)

                coords = cls._extract_coordinates_from_url(url=resolved_url)
                if not extracted_name:
                    extracted_name = cls._extract_name_from_url(url=resolved_url)

                if not coords and response.text:
                    meta_match = re.search(r"center=(-?\d{1,3}\.\d+)%2C(-?\d{1,3}\.\d+)", response.text)
                    if meta_match:
                        try:
                            lat = float(meta_match.group(1))
                            lng = float(meta_match.group(2))
                            if -90 <= lat <= 90 and -180 <= lng <= 180:
                                coords = (lat, lng)
                        except ValueError:
                            pass

                if coords:
                    logger.info("Successfully resolved Google Maps URL | lat=%.5f, lng=%.5f", coords[0], coords[1])
                    return {
                        "success": True,
                        "latitude": coords[0],
                        "longitude": coords[1],
                        "extracted_name": extracted_name,
                        "resolved_url": resolved_url,
                    }

                return {
                    "success": False,
                    "resolved_url": resolved_url,
                    "error": "Could not extract coordinates from resolved Google Maps URL.",
                }
        except Exception as e:
            logger.warning("Failed expanding Google Maps shortlink | error=%s", str(e))
            return {
                "success": False,
                "error": f"Failed to follow Google Maps redirect: {str(e)}",
            }


    @classmethod
    async def get_nearby_radar_members(
        cls,
        latitude: float,
        longitude: float,
        radius_km: float = 5.0,
        chapter_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Executes a proximity radar search using PostGIS ST_DWithin and GIST R-Tree spatial indexing.
        Distances are computed in meters over WGS-84 geography and converted to kilometers.
        """
        radius_meters = radius_km * 1000.0
        where_clauses = [
            "is_visible = true",
            "geom IS NOT NULL",
            "ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography, :radius_meters)",
        ]
        select_radar_params: Dict[str, Any] = {
            "latitude": latitude,
            "longitude": longitude,
            "radius_meters": radius_meters,
            "limit": limit,
            "offset": offset,
        }

        if chapter_id:
            where_clauses.append("chapter_id = :chapter_id")
            select_radar_params["chapter_id"] = str(chapter_id).strip()

        select_radar_query = f"""
            SELECT id, chapter_id, name, company, category, category_id, category_icon,
                   phone, email, photo_url, location, is_visible, one_to_one_availability,
                   (ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography) / 1000.0) AS distance_km
            FROM {MEMBERS_TABLE}
            WHERE {" AND ".join(where_clauses)}
            ORDER BY distance_km ASC
            LIMIT :limit OFFSET :offset
        """
        results = await DatabaseManager.execute_db_select(query=select_radar_query, params=select_radar_params)

        formatted_members: List[Dict[str, Any]] = []
        for record in results:
            location_data = record.get("location")
            if isinstance(location_data, str):
                try:
                    location_data = json.loads(location_data)
                except Exception:
                    location_data = {}

            formatted_members.append({
                "id": str(record.get("id")),
                "chapter_id": str(record.get("chapter_id")),
                "name": str(record.get("name")),
                "company": str(record.get("company")),
                "category": str(record.get("category")),
                "category_id": str(record.get("category_id") or "general"),
                "category_icon": str(record.get("category_icon") or "Briefcase"),
                "phone": str(record.get("phone")),
                "email": str(record.get("email")),
                "photo_url": record.get("photo_url"),
                "location": location_data or {},
                "distance_km": round(float(record.get("distance_km") or 0.0), 2),
                "one_to_one_availability": record.get("one_to_one_availability") or "AVAILABLE",
                "is_visible": bool(record.get("is_visible", True)),
            })

        return {
            "center_latitude": latitude,
            "center_longitude": longitude,
            "radius_km": radius_km,
            "total_found": len(formatted_members),
            "members": formatted_members,
        }


    @classmethod
    async def get_trip_multiplier_members(
        cls,
        origin_latitude: float,
        origin_longitude: float,
        destination_latitude: float,
        destination_longitude: float,
        max_detour_km: float = 5.0,
        chapter_id: Optional[str] = None,
        limit: int = 25,
    ) -> Dict[str, Any]:
        """
        Calculates en-route detour opportunities along a trip path directly in PostGIS SQL.
        Formula: detour_km = (dist(origin, member) + dist(member, dest)) - dist(origin, dest).
        """
        latitude_1 = math.radians(origin_latitude)
        longitude_1 = math.radians(origin_longitude)
        latitude_2 = math.radians(destination_latitude)
        longitude_2 = math.radians(destination_longitude)
        delta_latitude = latitude_2 - latitude_1
        delta_longitude = longitude_2 - longitude_1
        haversine_a = (
            math.sin(delta_latitude / 2) ** 2
            + math.cos(latitude_1) * math.cos(latitude_2) * math.sin(delta_longitude / 2) ** 2
        )
        haversine_c = 2 * math.atan2(math.sqrt(haversine_a), math.sqrt(1 - haversine_a))
        direct_distance_km = round(6371.0 * haversine_c, 2)

        where_clauses = [
            "is_visible = true",
            "geom IS NOT NULL",
        ]
        select_detour_params: Dict[str, Any] = {
            "origin_latitude": origin_latitude,
            "origin_longitude": origin_longitude,
            "destination_latitude": destination_latitude,
            "destination_longitude": destination_longitude,
            "direct_km": direct_distance_km,
            "max_detour_km": max_detour_km,
            "limit": limit,
        }

        if chapter_id:
            where_clauses.append("chapter_id = :chapter_id")
            select_detour_params["chapter_id"] = str(chapter_id).strip()

        select_detour_query = f"""
            WITH spatial_members AS (
                SELECT id, chapter_id, name, company, category, category_id, category_icon,
                       phone, email, photo_url, location, is_visible,
                       (ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(:origin_longitude, :origin_latitude), 4326)::geography) / 1000.0) AS dist_origin_km,
                       (ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(:destination_longitude, :destination_latitude), 4326)::geography) / 1000.0) AS dist_dest_km
                FROM {MEMBERS_TABLE}
                WHERE {" AND ".join(where_clauses)}
            ),
            scored_detours AS (
                SELECT *,
                       ROUND(((dist_origin_km + dist_dest_km) - :direct_km)::numeric, 2) AS detour_km
                FROM spatial_members
            )
            SELECT * FROM scored_detours
            WHERE detour_km <= :max_detour_km
              AND detour_km >= 0
            ORDER BY detour_km ASC
            LIMIT :limit
        """
        results = await DatabaseManager.execute_db_select(query=select_detour_query, params=select_detour_params)

        formatted_detours: List[Dict[str, Any]] = []
        for record in results:
            location_data = record.get("location")
            if isinstance(location_data, str):
                try:
                    location_data = json.loads(location_data)
                except Exception:
                    location_data = {}

            formatted_detours.append({
                "id": str(record.get("id")),
                "chapter_id": str(record.get("chapter_id")),
                "name": str(record.get("name")),
                "company": str(record.get("company")),
                "category": str(record.get("category")),
                "category_id": str(record.get("category_id") or "general"),
                "category_icon": str(record.get("category_icon") or "Briefcase"),
                "phone": str(record.get("phone")),
                "email": str(record.get("email")),
                "photo_url": record.get("photo_url"),
                "location": location_data or {},
                "detour_km": round(float(record.get("detour_km") or 0.0), 2),
                "distance_from_origin_km": round(float(record.get("dist_origin_km") or 0.0), 2),
                "distance_to_dest_km": round(float(record.get("dist_dest_km") or 0.0), 2),
                "is_visible": bool(record.get("is_visible", True)),
            })

        return {
            "origin_latitude": origin_latitude,
            "origin_longitude": origin_longitude,
            "destination_latitude": destination_latitude,
            "destination_longitude": destination_longitude,
            "direct_distance_km": direct_distance_km,
            "max_detour_km": max_detour_km,
            "total_opportunities": len(formatted_detours),
            "members": formatted_detours,
        }
