"""
Licenses CRUD API Controller for Proxima.
Provides complete standard REST CRUD endpoints (GET, POST, PATCH, DELETE) for chapter licenses.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.dependencies import require_master_admin
from schemas.license import LicenseCreateRequest, LicenseUpdateRequest
from service.license_service import LicenseService

router = APIRouter(prefix="/licensing")


@router.get("")
async def list_licenses(
    chapter_id: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
) -> List[Dict[str, Any]]:
    """Unified filtered chapter license retrieval from PostgreSQL."""
    return await LicenseService.get_licenses(chapter_id=chapter_id, license_status=status)


@router.get("/{chapter_id}")
async def get_license(chapter_id: str) -> Dict[str, Any]:
    """Retrieves active license details for a single chapter from PostgreSQL."""
    licenses = await LicenseService.get_licenses(chapter_id=chapter_id)
    if not licenses:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="License not found.")
    return licenses[0]


@router.post("")
async def create_license(payload: LicenseCreateRequest, current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Directly creates or assigns a chapter license in PostgreSQL (Master Admin only)."""
    return await LicenseService.create_license(payload=payload)


@router.patch("/{chapter_id}")
async def update_license(chapter_id: str, payload: LicenseUpdateRequest, current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Applies dynamic partial updates to a chapter license in PostgreSQL (Master Admin only)."""
    updated = await LicenseService.update_license(chapter_id=chapter_id, payload=payload)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="License not found.")
    return updated


@router.delete("/{chapter_id}")
async def delete_license(chapter_id: str, current_user: Dict[str, Any] = Depends(require_master_admin)) -> Dict[str, Any]:
    """Revokes/deletes a chapter license from PostgreSQL (Master Admin only)."""
    success = await LicenseService.delete_license(chapter_id=chapter_id)
    return {"success": success}
