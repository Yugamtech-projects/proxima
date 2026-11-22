"""
Member Directory & Roster Management Service for Proxima.
Enforces multi-tenant data isolation and public visibility renewal filtering.
"""

import json
from typing import Any, Dict, List
from fastapi import HTTPException, status

from database.database import DatabaseManager
from config.config import MEMBERS_TABLE
from utils.logger import logger


class MemberService:
    """Class-based service managing member directories and administrative roster synchronization."""


    @staticmethod
    async def get_chapter_members(chapter_id: str, is_admin: bool = False) -> List[Dict[str, Any]]:
        """
        Retrieves all members for a chapter.
        For public calls, strictly filters out non-renewed members (is_visible = true).
        For authorized Chapter Admins, returns the complete roster for management.
        """
        where_clauses = ["chapter_id = :chapter_id"]
        select_members_params: Dict[str, Any] = {"chapter_id": str(chapter_id)}

        if not is_admin:
            where_clauses.append("is_visible = true")

        select_members_query = f"""
            SELECT * FROM {MEMBERS_TABLE}
            WHERE {" AND ".join(where_clauses)}
            ORDER BY name ASC
        """
        members = await DatabaseManager.execute_db_select(query=select_members_query, params=select_members_params)

        # Normalize location and tags JSONB to native Python dicts/lists if needed
        for m in members:
            if isinstance(m.get("location"), str):
                try:
                    m["location"] = json.loads(m["location"])
                except Exception:
                    m["location"] = {}
            if isinstance(m.get("tags"), str):
                try:
                    m["tags"] = json.loads(m["tags"])
                except Exception:
                    m["tags"] = []

        return members


    @classmethod
    async def save_chapter_members(cls, chapter_id: str, members: List[Dict[str, Any]], current_user: Dict[str, Any]) -> int:
        """
        Saves and syncs a chapter roster.
        Enforces strict multi-tenant boundary checks:
        1. Master Admin is blocked from mutating member rosters.
        2. Chapter Admins are quarantined to their assigned chapter_id.
        """
        if current_user.get("role") == "MASTER_ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Master Admin cannot modify individual chapter member rosters.")

        if current_user.get("role") == "CHAPTER_ADMIN" and current_user.get("chapter_id") != chapter_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Cross-chapter roster mutation is blocked.")

        # 1. Remove existing members for this chapter
        delete_chapter_members_query = f"""
            DELETE FROM {MEMBERS_TABLE}
            WHERE chapter_id = :chapter_id
        """
        delete_chapter_members_params = {"chapter_id": str(chapter_id)}
        await DatabaseManager.execute_db_delete(query=delete_chapter_members_query, params=delete_chapter_members_params)

        # 2. Insert new member records
        insert_member_row_query = f"""
            INSERT INTO {MEMBERS_TABLE} (
                id, chapter_id, name, company, category, category_id, category_icon,
                short_bio, phone, whatsapp, email, website, photo_url, location,
                one_to_one_availability, referral_requirements, tags, membership_status, is_visible
            ) VALUES (
                :id, :chapter_id, :name, :company, :category, :category_id, :category_icon,
                :short_bio, :phone, :whatsapp, :email, :website, :photo_url, :location,
                :one_to_one_availability, :referral_requirements, :tags, :membership_status, :is_visible
            )
        """

        saved_count = 0
        for m in members:
            location_val = m.get("location", {})
            tags_val = m.get("tags", [])

            insert_member_row_params = {
                "id": str(m.get("id", f"mem-{saved_count + 1}")),
                "chapter_id": chapter_id,
                "name": str(m.get("name", "")).strip(),
                "company": str(m.get("company", "")).strip(),
                "category": str(m.get("category", "")).strip(),
                "category_id": str(m.get("categoryId", m.get("category_id", "general"))).strip(),
                "category_icon": str(m.get("categoryIcon", m.get("category_icon", "Briefcase"))).strip(),
                "short_bio": m.get("shortBio", m.get("short_bio")),
                "phone": str(m.get("phone", "")).strip(),
                "whatsapp": m.get("whatsapp"),
                "email": str(m.get("email", "")).strip(),
                "website": m.get("website"),
                "photo_url": m.get("photoUrl", m.get("photo_url")),
                "location": json.dumps(location_val) if isinstance(location_val, dict) else "{}",
                "one_to_one_availability": m.get("oneToOneAvailability", m.get("one_to_one_availability", "AVAILABLE")),
                "referral_requirements": m.get("referralRequirements", m.get("referral_requirements")),
                "tags": json.dumps(tags_val) if isinstance(tags_val, list) else "[]",
                "membership_status": m.get("membershipStatus", m.get("membership_status", "RENEWED")),
                "is_visible": bool(m.get("isVisible", m.get("is_visible", True))),
            }

            await DatabaseManager.execute_db_insert(query=insert_member_row_query, params=insert_member_row_params)
            saved_count += 1

        logger.info("Saved chapter roster | chapter_id=%s, count=%d, actor=%s", chapter_id, saved_count, current_user.get("email"))
        return saved_count
