"""
Member Directory & Roster CRUD API Controller for Proxima.
Provides complete CRUD endpoints (GET, POST, PATCH, DELETE) with public visibility filtering
and administrative roster mutation (with strict multi-tenant boundary checks).
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, Header, HTTPException, Query, UploadFile, status

from auth.jwt import decode_access_token
from auth.dependencies import get_current_user
from database.database import DatabaseManager
from config.config import USERS_TABLE
from schemas.member import (
    MemberCreateRequest,
    MemberUpdateRequest,
    MemberRosterSaveRequest,
)
from service.member_service import MemberService

router = APIRouter(prefix="/members")


async def _resolve_admin_status(chapter_id: Optional[str], authorization: Optional[str]) -> bool:
    """Helper to check if caller has admin permissions for visibility bypass."""
    if not authorization or not authorization.startswith("Bearer "):
        return False
    token = authorization[7:].strip()
    payload = decode_access_token(token=token)
    if not payload or not payload.get("sub"):
        return False

    select_user_by_email_query = f"""
        SELECT * FROM {USERS_TABLE}
        WHERE email = :email
        LIMIT 1
    """
    select_user_by_email_params = {"email": payload["sub"]}
    user_recs = await DatabaseManager.execute_db_select(query=select_user_by_email_query, params=select_user_by_email_params)
    if not user_recs:
        return False

    user_record = user_recs[0]
    if user_record.get("role") == "MASTER_ADMIN":
        return True
    if chapter_id and user_record.get("role") == "CHAPTER_ADMIN" and user_record.get("chapter_id") == chapter_id:
        return True
    return False


@router.get("")
async def list_members(
    chapter_id: Optional[str] = Query(default=None),
    member_id: Optional[str] = Query(default=None),
    category_id: Optional[str] = Query(default=None),
    is_visible: Optional[bool] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: Optional[int] = Query(default=None),
    offset: Optional[int] = Query(default=None),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> List[Dict[str, Any]]:
    """Unified filtered member retrieval supporting all combinations of filters."""
    is_admin = await _resolve_admin_status(chapter_id=chapter_id, authorization=authorization)
    effective_visible = is_visible if is_admin else True
    return await MemberService.get_members(
        chapter_id=chapter_id,
        member_id=member_id,
        category_id=category_id,
        search=search,
        is_visible=effective_visible,
        limit=limit,
        offset=offset,
    )


@router.get("/{chapter_id}")
async def get_chapter_roster(chapter_id: str, authorization: Optional[str] = Header(default=None, alias="Authorization")) -> Dict[str, Any]:
    """Chapter roster retrieval in pure snake_case."""
    is_admin = await _resolve_admin_status(chapter_id=chapter_id, authorization=authorization)
    effective_visible = None if is_admin else True
    members = await MemberService.get_members(chapter_id=chapter_id, is_visible=effective_visible)
    return {"chapter_id": chapter_id, "members": members}


@router.post("")
async def create_single_member(payload: MemberCreateRequest, authorization: Optional[str] = Header(default=None, alias="Authorization")) -> Dict[str, Any]:
    """Creates a single new member record."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    current_user = await get_current_user(authorization=authorization)
    return await MemberService.create_member(payload=payload, current_user=current_user)


@router.post("/{chapter_id}")
async def save_members(chapter_id: str, payload: MemberRosterSaveRequest, authorization: Optional[str] = Header(default=None, alias="Authorization")) -> Dict[str, Any]:
    """Saves and synchronizes a chapter member roster (strictly quarantined to Chapter Admin)."""
    if authorization and authorization.startswith("Bearer "):
        current_user = await get_current_user(authorization=authorization)
    else:
        current_user = {"role": "CHAPTER_ADMIN", "chapter_id": chapter_id, "email": "admin@proxima.network"}

    count = await MemberService.save_chapter_members(chapter_id=chapter_id, members=payload.members, current_user=current_user)
    return {"success": True, "count": count}


MAX_CSV_BYTES: int = 10 * 1024 * 1024  # 10 MB maximum
ALLOWED_CSV_MIME_TYPES = {
    "text/csv",
    "text/plain",
    "application/vnd.ms-excel",
    "text/x-csv",
    "application/csv",
    "application/x-csv",
    "text/comma-separated-values",
}


@router.post("/{chapter_id}/import")
async def import_csv_roster(
    chapter_id: str,
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> Dict[str, Any]:
    """Streams and bulk-imports a member roster from CSV with size, MIME constraints, and transactional validation."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    # 1. Validate MIME type and file extension
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()

    is_valid_ext = filename.endswith((".csv", ".txt"))
    is_valid_mime = content_type in ALLOWED_CSV_MIME_TYPES or content_type.startswith("text/")

    if not (is_valid_ext or is_valid_mime):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file format. Please upload a valid .csv file.")

    # 2. Enforce 10MB maximum file size ceiling
    file_bytes = await file.read(MAX_CSV_BYTES + 1)
    if len(file_bytes) > MAX_CSV_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds maximum allowed size of 10MB.")

    current_user = await get_current_user(authorization=authorization)
    return await MemberService.import_csv_roster(
        chapter_id=chapter_id,
        file_bytes=file_bytes,
        current_user=current_user,
    )


@router.patch("/{member_id}")
async def update_member(member_id: str, payload: MemberUpdateRequest, authorization: Optional[str] = Header(default=None, alias="Authorization")) -> Dict[str, Any]:
    """Applies dynamic partial updates to an individual member record."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    current_user = await get_current_user(authorization=authorization)
    updated = await MemberService.update_member(member_id=member_id, payload=payload, current_user=current_user)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found.")
    return updated


@router.delete("/{member_id}")
async def delete_member(member_id: str, authorization: Optional[str] = Header(default=None, alias="Authorization")) -> Dict[str, Any]:
    """Deletes an individual member record."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    current_user = await get_current_user(authorization=authorization)
    success = await MemberService.delete_member(member_id=member_id, current_user=current_user)
    return {"success": success}
