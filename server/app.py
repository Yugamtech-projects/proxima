"""
PROXIMA - Production FastAPI Application Entry Point.
Provides:
1. Lifespan event for connection warmup and dynamic schema/table creation (DatabaseManager).
2. Hardened security headers (anti-clickjacking X-Frame-Options: DENY, X-Content-Type-Options: nosniff).
3. Wide-open CORS for seamless Vite HMR frontend integration.
4. Domain-driven REST routing with explicit OpenAPI documentation tags.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from config.config import CORS_ORIGINS
from database.database import DatabaseManager
from utils.crypto import generate_secure_token
from utils.rate_limiter import rate_limiter
from utils.logger import logger
from api import (
    health_router,
    auth_router,
    chapter_router,
    member_router,
    license_router,
    vip_pass_router,
    payment_router,
    user_router,
    admin_router,
    spatial_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager: pre-warms database connection and initializes schemas on startup."""
    logger.info("Initializing Proxima FastAPI backend server...")
    try:
        await DatabaseManager.warmup_database_service()
    except Exception as e:
        logger.error("Database connection warmup encountered an issue: %s", str(e))
    yield
    logger.info("Proxima FastAPI backend server shutting down.")


app = FastAPI(
    title="Proxima API",
    description="Geospatial Business Directory & Executive Networking Platform API",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = rate_limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# 1. Global Sanitized Exception Handler (Prevents internal SQL trace & table leakage)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Centralized unhandled exception handler that prevents internal SQL/stack trace leakage."""
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    ref_id = f"err_{generate_secure_token(nbytes=6)}"
    logger.error(
        "Unhandled server error intercepted | ref_id=%s, path=%s, method=%s, exc=%s",
        ref_id, request.url.path, request.method, str(exc), exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Internal server error. Reference ID: {ref_id}"},
    )


# 2. CORS Configuration (Allows authorized development and production origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|.*\.proxima\.network|.*\.netlify\.app|.*\.onrender\.com)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# 3. Hardened Security Headers Middleware (Matching server.mjs enterprise headers)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# 3. Mount Domain API Routers under /api with explicit OpenAPI tags
app.include_router(health_router, prefix="", tags=["Health"])  # Direct /health and /healthz support
app.include_router(auth_router, prefix="/api", tags=["Authentication"])
app.include_router(chapter_router, prefix="/api", tags=["Chapter"])
app.include_router(member_router, prefix="/api", tags=["Member"])
app.include_router(license_router, prefix="/api", tags=["License"])
app.include_router(vip_pass_router, prefix="/api", tags=["VIP Pass"])
app.include_router(payment_router, prefix="/api", tags=["Payment"])
app.include_router(user_router, prefix="/api", tags=["User"])
app.include_router(admin_router, prefix="/api", tags=["Admin Analytics"])
app.include_router(spatial_router, prefix="/api", tags=["Spatial & Geospatial"])
