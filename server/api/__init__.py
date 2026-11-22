"""API controllers package for Proxima."""
from .health import router as health_router
from .auth import router as auth_router
from .chapters import router as chapters_router
from .members import router as members_router
from .licensing import router as licensing_router
from .payment import router as payment_router
from .users import router as users_router
from .admin import router as admin_router

__all__ = [
    "health_router",
    "auth_router",
    "chapters_router",
    "members_router",
    "licensing_router",
    "payment_router",
    "users_router",
    "admin_router",
]
