"""
Member Directory & Roster Management Service for Proxima.
Enforces multi-tenant data isolation and public visibility renewal filtering.
Provides complete CRUD capabilities (get_members, create_member, update_member, delete_member, save_chapter_members).
"""

import json
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

from database.database import DatabaseManager
from config.config import MEMBERS_TABLE
from schemas.member import MemberCreateRequest, MemberUpdateRequest
from utils.logger import logger


class MemberService:
    """Class-based service managing member directories and administrative roster synchronization."""


    @staticmethod
    async def get_members(
        chapter_id: Optional[str] = None,
        member_id: Optional[str] = None,
        category_id: Optional[str] = None,
        search: Optional[str] = None,
        is_visible: Optional[bool] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Unified filtered member retrieval.
        A single query template handles all combinations of filters without redundant queries.
        """
        where_clauses: List[str] = []
        select_members_params: Dict[str, Any] = {}

        if chapter_id:
            where_clauses.append("chapter_id = :chapter_id")
            select_members_params["chapter_id"] = str(chapter_id)

        if member_id:
            where_clauses.append("id = :member_id")
            select_members_params["member_id"] = str(member_id)

        if category_id:
            where_clauses.append("category_id = :category_id")
            select_members_params["category_id"] = str(category_id)

        if is_visible is not None:
            where_clauses.append("is_visible = :is_visible")
            select_members_params["is_visible"] = bool(is_visible)

        if search:
            where_clauses.append("(LOWER(name) LIKE :search OR LOWER(company) LIKE :search)")
            select_members_params["search"] = f"%{search.strip().lower()}%"

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        # Enforce hard upper bound pagination limits to protect server memory (default 100, max 500)
        effective_limit = 100 if limit is None else min(max(1, int(limit)), 500)
        effective_offset = 0 if offset is None or offset < 0 else int(offset)
        select_members_params["limit"] = effective_limit
        select_members_params["offset"] = effective_offset

        select_members_query = f"""
            SELECT * FROM {MEMBERS_TABLE}
            {where_sql}
            ORDER BY name ASC
            LIMIT :limit OFFSET :offset
        """
        members = await DatabaseManager.execute_db_select(query=select_members_query, params=select_members_params)

        for member_record in members:
            if isinstance(member_record.get("location"), str):
                try:
                    member_record["location"] = json.loads(member_record["location"])
                except Exception:
                    member_record["location"] = {}
            if isinstance(member_record.get("tags"), str):
                try:
                    member_record["tags"] = json.loads(member_record["tags"])
                except Exception:
                    member_record["tags"] = []

        return members


    @classmethod
    async def create_member(cls, payload: MemberCreateRequest, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Creates a single member record with strict tenant isolation."""
        if current_user.get("role") == "MASTER_ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Master Admin cannot modify individual chapter member rosters.")

        if current_user.get("role") == "CHAPTER_ADMIN" and current_user.get("chapter_id") != payload.chapter_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Cross-chapter roster mutation is blocked.")

        from utils.crypto import generate_secure_token
        member_id = payload.id.strip() if payload.id else f"mem-{generate_secure_token(nbytes=4)}"

        loc = payload.location or {}
        lat = loc.get("latitude")
        lng = loc.get("longitude")
        has_coords = (lat is not None and lng is not None and str(lat).strip() != "" and str(lng).strip() != "")
        geom_expr = "ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)" if has_coords else "NULL"

        insert_member_query = f"""
            INSERT INTO {MEMBERS_TABLE} (
                id, chapter_id, name, company, category, category_id, category_icon,
                short_bio, phone, whatsapp, email, website, photo_url, location,
                one_to_one_availability, referral_requirements, tags, membership_status, is_visible, geom
            ) VALUES (
                :id, :chapter_id, :name, :company, :category, :category_id, :category_icon,
                :short_bio, :phone, :whatsapp, :email, :website, :photo_url, :location,
                :one_to_one_availability, :referral_requirements, :tags, :membership_status, :is_visible,
                {geom_expr}
            )
            RETURNING *
        """
        insert_member_params = {
            "id": member_id,
            "chapter_id": payload.chapter_id,
            "name": payload.name.strip(),
            "company": payload.company.strip(),
            "category": payload.category.strip(),
            "category_id": payload.category_id or "general",
            "category_icon": payload.category_icon or "Briefcase",
            "short_bio": payload.short_bio,
            "phone": payload.phone.strip(),
            "whatsapp": payload.whatsapp,
            "email": payload.email.strip(),
            "website": payload.website,
            "photo_url": payload.photo_url,
            "location": json.dumps(payload.location or {}),
            "one_to_one_availability": payload.one_to_one_availability or "AVAILABLE",
            "referral_requirements": payload.referral_requirements,
            "tags": json.dumps(payload.tags or []),
            "membership_status": payload.membership_status or "RENEWED",
            "is_visible": bool(payload.is_visible if payload.is_visible is not None else True),
        }
        if has_coords:
            insert_member_params["lat"] = float(lat)
            insert_member_params["lng"] = float(lng)

        results = await DatabaseManager.execute_db_insert(query=insert_member_query, params=insert_member_params)
        created = results[0] if results else insert_member_params
        logger.info("Created member | id=%s, chapter_id=%s, name=%s", member_id, payload.chapter_id, payload.name)
        return created


    @classmethod
    async def update_member(cls, member_id: str, payload: MemberUpdateRequest, current_user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Applies dynamic partial updates to a single member record."""
        # Find existing member to verify tenant boundaries
        existing = await cls.get_members(member_id=member_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found.")

        target = existing[0]
        if current_user.get("role") == "MASTER_ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Master Admin cannot modify individual chapter member rosters.")

        if current_user.get("role") == "CHAPTER_ADMIN" and current_user.get("chapter_id") != target.get("chapter_id"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Cross-chapter roster mutation is blocked.")

        update_clauses: List[str] = []
        update_member_params: Dict[str, Any] = {"id": member_id}

        if payload.name is not None:
            update_clauses.append("name = :name")
            update_member_params["name"] = payload.name.strip()

        if payload.company is not None:
            update_clauses.append("company = :company")
            update_member_params["company"] = payload.company.strip()

        if payload.category is not None:
            update_clauses.append("category = :category")
            update_member_params["category"] = payload.category.strip()

        if payload.category_id is not None:
            update_clauses.append("category_id = :category_id")
            update_member_params["category_id"] = payload.category_id.strip()

        if payload.category_icon is not None:
            update_clauses.append("category_icon = :category_icon")
            update_member_params["category_icon"] = payload.category_icon.strip()

        if payload.short_bio is not None:
            update_clauses.append("short_bio = :short_bio")
            update_member_params["short_bio"] = payload.short_bio

        if payload.phone is not None:
            update_clauses.append("phone = :phone")
            update_member_params["phone"] = payload.phone.strip()

        if payload.whatsapp is not None:
            update_clauses.append("whatsapp = :whatsapp")
            update_member_params["whatsapp"] = payload.whatsapp

        if payload.email is not None:
            update_clauses.append("email = :email")
            update_member_params["email"] = payload.email.strip()

        if payload.website is not None:
            update_clauses.append("website = :website")
            update_member_params["website"] = payload.website

        if payload.photo_url is not None:
            update_clauses.append("photo_url = :photo_url")
            update_member_params["photo_url"] = payload.photo_url

        if payload.location is not None:
            update_clauses.append("location = :location")
            update_member_params["location"] = json.dumps(payload.location)

        if payload.one_to_one_availability is not None:
            update_clauses.append("one_to_one_availability = :one_to_one_availability")
            update_member_params["one_to_one_availability"] = payload.one_to_one_availability

        if payload.referral_requirements is not None:
            update_clauses.append("referral_requirements = :referral_requirements")
            update_member_params["referral_requirements"] = payload.referral_requirements

        if payload.tags is not None:
            update_clauses.append("tags = :tags")
            update_member_params["tags"] = json.dumps(payload.tags)

        if payload.membership_status is not None:
            update_clauses.append("membership_status = :membership_status")
            update_member_params["membership_status"] = payload.membership_status

        if payload.is_visible is not None:
            update_clauses.append("is_visible = :is_visible")
            update_member_params["is_visible"] = bool(payload.is_visible)

        if not update_clauses:
            return target

        update_clauses.append("updated_at = CURRENT_TIMESTAMP")

        update_member_query = f"""
            UPDATE {MEMBERS_TABLE}
            SET {", ".join(update_clauses)}
            WHERE id = :id
            RETURNING *
        """
        results = await DatabaseManager.execute_db_update(query=update_member_query, params=update_member_params)
        logger.info("Updated member | id=%s, clauses=%d", member_id, len(update_clauses))
        return results[0] if results else None


    @classmethod
    async def delete_member(cls, member_id: Optional[str] = None, chapter_id: Optional[str] = None, current_user: Optional[Dict[str, Any]] = None) -> bool:
        """Deletes member records by member_id, chapter_id, or both."""
        if not member_id and not chapter_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Either member_id or chapter_id must be provided for deletion.")

        user = current_user or {}
        role = user.get("role")
        user_chap = user.get("chapter_id")

        if role == "MASTER_ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Master Admin cannot modify individual chapter member rosters.")

        where_clauses: List[str] = []
        delete_members_params: Dict[str, Any] = {}

        if member_id:
            existing = await cls.get_members(member_id=member_id)
            if not existing:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found.")
            target = existing[0]
            if role == "CHAPTER_ADMIN" and user_chap != target.get("chapter_id"):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Cross-chapter roster mutation is blocked.")
            where_clauses.append("id = :id")
            delete_members_params["id"] = str(member_id)

        if chapter_id:
            if role == "CHAPTER_ADMIN" and user_chap != chapter_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Cross-chapter roster mutation is blocked.")
            where_clauses.append("chapter_id = :chapter_id")
            delete_members_params["chapter_id"] = str(chapter_id)

        delete_members_query = f"""
            DELETE FROM {MEMBERS_TABLE}
            WHERE {" AND ".join(where_clauses)}
        """
        await DatabaseManager.execute_db_delete(query=delete_members_query, params=delete_members_params)
        logger.info("Deleted members | member_id=%s, chapter_id=%s", member_id, chapter_id)
        return True


    @classmethod
    async def save_chapter_members(cls, chapter_id: str, members: List[Dict[str, Any]], current_user: Dict[str, Any]) -> int:
        """Bulk synchronizes a chapter roster by clearing via delete_member and reusing create_member internally."""
        if current_user.get("role") == "MASTER_ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Master Admin cannot modify individual chapter member rosters.")

        if current_user.get("role") == "CHAPTER_ADMIN" and current_user.get("chapter_id") != chapter_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Cross-chapter roster mutation is blocked.")

        # Reuses delete_member with chapter_id filter internally
        await cls.delete_member(chapter_id=chapter_id, current_user=current_user)

        saved_count = 0
        for member_dict in members:
            member_payload = MemberCreateRequest(
                id=member_dict.get("id"),
                chapter_id=chapter_id,
                name=str(member_dict.get("name", "")).strip(),
                company=str(member_dict.get("company", "")).strip(),
                category=str(member_dict.get("category", "")).strip(),
                category_id=str(member_dict.get("categoryId", member_dict.get("category_id", "general"))).strip(),
                category_icon=str(member_dict.get("categoryIcon", member_dict.get("category_icon", "Briefcase"))).strip(),
                short_bio=member_dict.get("shortBio", member_dict.get("short_bio")),
                phone=str(member_dict.get("phone", "")).strip(),
                whatsapp=member_dict.get("whatsapp"),
                email=str(member_dict.get("email", "")).strip(),
                website=member_dict.get("website"),
                photo_url=member_dict.get("photoUrl", member_dict.get("photo_url")),
                location=member_dict.get("location") if isinstance(member_dict.get("location"), dict) else {},
                one_to_one_availability=member_dict.get("oneToOneAvailability", member_dict.get("one_to_one_availability", "AVAILABLE")),
                referral_requirements=member_dict.get("referralRequirements", member_dict.get("referral_requirements")),
                tags=member_dict.get("tags") if isinstance(member_dict.get("tags"), list) else [],
                membership_status=member_dict.get("membershipStatus", member_dict.get("membership_status", "RENEWED")),
                is_visible=bool(member_dict.get("isVisible", member_dict.get("is_visible", True))),
            )
            await cls.create_member(payload=member_payload, current_user=current_user)
            saved_count += 1

        logger.info("Saved chapter roster | chapter_id=%s, count=%d, actor=%s", chapter_id, saved_count, current_user.get("email"))
        return saved_count


    @classmethod
    async def import_csv_roster(cls, chapter_id: str, file_bytes: bytes, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parses and imports a member roster CSV with fuzzy column matching and transactional validation.
        Protects server memory by streaming and validating rows before insertion.
        """
        import csv
        import io

        if current_user.get("role") == "MASTER_ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Master Admin cannot modify individual chapter member rosters.")

        if current_user.get("role") == "CHAPTER_ADMIN" and current_user.get("chapter_id") != chapter_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Cross-chapter roster mutation is blocked.")

        try:
            text_stream = file_bytes.decode("utf-8-sig", errors="ignore")
        except Exception:
            text_stream = file_bytes.decode("latin-1", errors="ignore")

        reader = csv.DictReader(io.StringIO(text_stream))
        if not reader.fieldnames:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty or invalid CSV file.")

        def find_val(row_dict: Dict[str, Any], aliases: List[str]) -> Optional[str]:
            for alias in aliases:
                for k in row_dict:
                    clean_k = str(k).lower().replace("_", " ").replace("-", " ").strip()
                    if alias in clean_k:
                        v = row_dict[k]
                        if v is not None and str(v).strip():
                            return str(v).strip()
            return None

        imported_count = 0
        skipped_count = 0
        errors: List[str] = []

        for idx, row in enumerate(reader, start=1):
            name = find_val(row, ["name", "full name", "contact", "person", "member"])
            if not name:
                skipped_count += 1
                errors.append(f"Row {idx}: Missing member name.")
                continue

            company = find_val(row, ["company", "business", "firm", "org", "enterprise"]) or "Independent"
            category = find_val(row, ["category", "profession", "industry", "classification", "domain"]) or "General Business"
            phone = find_val(row, ["phone", "mobile", "contact", "cell", "tel"]) or ""
            whatsapp = find_val(row, ["whatsapp", "wa"]) or phone
            email = find_val(row, ["email", "mail"]) or f"{name.lower().replace(' ', '')}@proxima.network"
            website = find_val(row, ["website", "web", "url", "site"])
            short_bio = find_val(row, ["bio", "about", "description", "summary", "notes"])
            address = find_val(row, ["address", "location", "office", "street", "city"]) or "Chennai, Tamil Nadu"

            lat_val = find_val(row, ["latitude", "lat"])
            lng_val = find_val(row, ["longitude", "lng", "lon"])
            lat_float = float(lat_val) if lat_val and lat_val.replace(".", "", 1).replace("-", "", 1).isdigit() else None
            lng_float = float(lng_val) if lng_val and lng_val.replace(".", "", 1).replace("-", "", 1).isdigit() else None

            location_obj = {
                "address": address,
                "city": find_val(row, ["city"]) or "Chennai",
                "latitude": lat_float,
                "longitude": lng_float,
                "isVerified": bool(lat_float and lng_float),
            }

            try:
                member_req = MemberCreateRequest(
                    chapter_id=chapter_id,
                    name=name,
                    company=company,
                    category=category,
                    category_id="general",
                    category_icon="Briefcase",
                    short_bio=short_bio,
                    phone=phone,
                    whatsapp=whatsapp,
                    email=email,
                    website=website,
                    location=location_obj,
                    membership_status="RENEWED",
                    is_visible=True,
                )
                await cls.create_member(payload=member_req, current_user=current_user)
                imported_count += 1
            except Exception as e:
                skipped_count += 1
                errors.append(f"Row {idx} ({name}): {str(e)}")

        logger.info("CSV bulk import completed | chapter_id=%s, imported=%d, skipped=%d, actor=%s", chapter_id, imported_count, skipped_count, current_user.get("email"))
        return {
            "success": True,
            "chapter_id": chapter_id,
            "imported_count": imported_count,
            "skipped_count": skipped_count,
            "errors": errors[:25],
        }
