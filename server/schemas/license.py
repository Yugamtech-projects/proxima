"""
License Schemas for Proxima.
Provides clean type definitions and plan key-to-title mappings for dropdown selections in OpenAPI docs.
"""

from typing import Dict, Literal, Optional
from schemas.base import SnakeBaseModel

LicensePlan = Literal["ANNUAL", "SEMI_ANNUAL", "COMPLIMENTARY"]
LicenseStatus = Literal["ACTIVE", "EXPIRED", "SUSPENDED"]

LICENSE_PLAN_TITLES: Dict[str, str] = {
    "ANNUAL": "Annual Chapter License (₹1,999 / 1 Year)",
    "SEMI_ANNUAL": "Semi-Annual Plan (₹1,194 / 6 Months)",
    "COMPLIMENTARY": "Complimentary Prototype Pass (₹0 / 1 Year Free)",
}


class LicenseCreateRequest(SnakeBaseModel):
    """Payload for creating or assigning a chapter license."""

    chapter_id: str
    plan: Optional[LicensePlan | str] = "ANNUAL"
    price_inr: Optional[float] = 0.0
    duration_days: Optional[int] = 365
    status: Optional[LicenseStatus] = "ACTIVE"
    reason: Optional[str] = "Team Credit / Working Prototype"


class LicenseUpdateRequest(SnakeBaseModel):
    """Payload for partial updates to a chapter license."""

    status: Optional[LicenseStatus] = None
    plan: Optional[LicensePlan | str] = None
    price_inr: Optional[float] = None
    valid_until: Optional[str] = None
