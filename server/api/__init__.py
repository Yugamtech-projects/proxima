"""API controllers package for Proxima."""
from .health import router as health_router
from .auth import router as auth_router
from .chapter import router as chapter_router
from .member import router as member_router
from .license import router as license_router
from .vip_pass import router as vip_pass_router
from .payment import router as payment_router
from .user import router as user_router
from .admin import router as admin_router
from .spatial import router as spatial_router

__all__ = [
    "health_router",
    "auth_router",
    "chapter_router",
    "member_router",
    "license_router",
    "vip_pass_router",
    "payment_router",
    "user_router",
    "admin_router",
    "spatial_router",
]
