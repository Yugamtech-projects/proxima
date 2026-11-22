"""
Chapters API Controller for Proxima.
Exposes chapter directory, single chapter lookup, self-serve onboarding,
and complimentary license extension grants.
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import require_master_admin
from schemas.chapter import ChapterOnboardRequest
from schemas.license import GrantFreeLicenseRequest
from service.chapter_service import ChapterService
from service.licensing_service import LicensingService

router = APIRouter(prefix="/chapters")


@router.get("")
async def list_chapters() -> List[Dict[str, Any]]:
    """Retrieves all active chapters in the network."""
    return await ChapterService.get_all_chapters()


@router.get("/{chapter_id_or_token}")
async def get_chapter(chapter_id_or_token: str) -> Dict[str, Any]:
    """Retrieves a single chapter by its ID, slug, or 24-character cryptographic access key."""
    chapter = await ChapterService.get_chapter_by_id_or_token(identifier=chapter_id_or_token)
    if not chapter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found.")
    return chapter


@router.post("/onboard")
async def onboard_chapter(payload: ChapterOnboardRequest) -> Dict[str, Any]:
    """Self-serve chapter onboarding via payment or VIP Free Chapter Pass."""
    return await ChapterService.onboard_chapter(payload=payload)


@router.post("/grant-free-license")
async def grant_free_license(payload: GrantFreeLicenseRequest, current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Directly grants a 100% complimentary license extension (Master Admin only)."""
    return await LicensingService.grant_free_license(chapter_id=payload.chapter_id, reason=payload.reason, duration_days=payload.duration_days)
