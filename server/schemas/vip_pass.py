"""
VIP Pass Schemas for Proxima.
Maintains pure snake_case backend fields.
"""

from typing import Literal, Optional
from schemas.base import SnakeBaseModel

VipPassStatus = Literal["ACTIVE", "CLAIMED", "EXPIRED", "REVOKED"]


class VipPassCreateRequest(SnakeBaseModel):
    """Payload for creating a VIP pass voucher."""

    label: Optional[str] = "Team Credit / Working Prototype"
    max_uses: Optional[int] = 2
    plan_days: Optional[int] = 365


class VipPassUpdateRequest(SnakeBaseModel):
    """Payload for partial updates to a VIP pass voucher."""

    label: Optional[str] = None
    max_uses: Optional[int] = None
    used_count: Optional[int] = None
    plan_days: Optional[int] = None
    status: Optional[VipPassStatus] = None
