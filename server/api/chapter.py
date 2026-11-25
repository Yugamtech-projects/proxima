"""
Chapters CRUD API Controller for Proxima.
Provides complete standard REST CRUD endpoints (GET, POST, PATCH, DELETE) for chapter registry,
self-serve onboarding, and administrative metadata updates.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.dependencies import require_master_admin
from schemas.chapter import ChapterOnboardRequest, ChapterUpdateRequest
from service.chapter_service import ChapterService

router = APIRouter(prefix="/chapters")


@router.get("")
async def list_chapters(
    chapter_id: Optional[str] = Query(default=None),
    city: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: Optional[int] = Query(default=None),
    offset: Optional[int] = Query(default=None),
) -> List[Dict[str, Any]]:
    """Unified filtered chapter retrieval supporting all combinations of filters."""
    return await ChapterService.get_chapters(
        chapter_id=chapter_id,
        city=city,
        chapter_status=status,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get("/{chapter_id}")
async def get_chapter(chapter_id: str) -> Dict[str, Any]:
    """Retrieves a single chapter by its ID, slug, or 24-character cryptographic access key."""
    chapters = await ChapterService.get_chapters(chapter_id=chapter_id)
    if not chapters:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found.")
    return chapters[0]


@router.post("")
async def create_chapter(payload: ChapterOnboardRequest) -> Dict[str, Any]:
    """Creates a new chapter (via payment or VIP Free Chapter Pass)."""
    return await ChapterService.create_chapter(payload=payload)


@router.patch("/{chapter_id}")
async def update_chapter(chapter_id: str, payload: ChapterUpdateRequest, current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Applies dynamic partial updates to chapter metadata (Master Admin only)."""
    updated = await ChapterService.update_chapter(chapter_id=chapter_id, payload=payload)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found.")
    return updated


@router.delete("/{chapter_id}")
async def delete_chapter(chapter_id: str, current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Deletes a chapter and cascades associated records (Master Admin only)."""
    success = await ChapterService.delete_chapter(chapter_id=chapter_id)
    return {"success": success}
