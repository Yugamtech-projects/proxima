"""Pydantic schemas package for Proxima."""
from .base import SnakeBaseModel
from .user import (
    LoginRequest,
    ChapterSessionInfo,
    SessionData,
    ServerAuthResponse,
    UserResponse,
)
from .chapter import (
    ChapterResponse,
    ChapterOnboardRequest,
    ChapterOnboardResponse,
)
from .member import (
    MemberLocationResponse,
    MemberResponse,
    MemberRosterSaveRequest,
    MemberRosterResponse,
)
from .license import (
    InvoiceResponse,
    LicenseResponse,
    VipPassResponse,
    VipPassCreateRequest,
    GrantFreeLicenseRequest,
)
from .payment import (
    PaymentConfigResponse,
    PaymentConfigUpdateRequest,
    CreateOrderRequest,
    CreateOrderResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
)
from .admin import HealthResponse

__all__ = [
    "SnakeBaseModel",
    "LoginRequest",
    "ChapterSessionInfo",
    "SessionData",
    "ServerAuthResponse",
    "UserResponse",
    "ChapterResponse",
    "ChapterOnboardRequest",
    "ChapterOnboardResponse",
    "MemberLocationResponse",
    "MemberResponse",
    "MemberRosterSaveRequest",
    "MemberRosterResponse",
    "InvoiceResponse",
    "LicenseResponse",
    "VipPassResponse",
    "VipPassCreateRequest",
    "GrantFreeLicenseRequest",
    "PaymentConfigResponse",
    "PaymentConfigUpdateRequest",
    "CreateOrderRequest",
    "CreateOrderResponse",
    "VerifyPaymentRequest",
    "VerifyPaymentResponse",
    "HealthResponse",
]
