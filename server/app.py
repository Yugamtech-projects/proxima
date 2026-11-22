"""
PROXIMA - Production FastAPI Application Entry Point.
Provides:
1. Lifespan event for connection warmup and dynamic schema/table creation (DatabaseManager).
2. Hardened security headers (anti-clickjacking X-Frame-Options: DENY, X-Content-Type-Options: nosniff).
3. Wide-open CORS for seamless Vite HMR frontend integration.
4. Domain-driven REST routing with explicit OpenAPI documentation tags.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database.database import DatabaseManager
from utils.logger import logger
from api import (
    health_router,
    auth_router,
    chapters_router,
    members_router,
    licensing_router,
    payment_router,
    users_router,
    admin_router,
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

# 1. CORS Configuration (Allows seamless Vite HMR and production domain requests)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# 2. Hardened Security Headers Middleware (Matching server.mjs enterprise headers)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# 3. Mount Domain API Routers under /api with explicit OpenAPI tags
app.include_router(health_router, prefix="/api", tags=["Health"])
app.include_router(health_router, prefix="", tags=["Health"])  # Direct /healthz support
app.include_router(auth_router, prefix="/api", tags=["Authentication"])
app.include_router(chapters_router, prefix="/api", tags=["Chapters"])
app.include_router(members_router, prefix="/api", tags=["Members"])
app.include_router(licensing_router, prefix="/api", tags=["Licensing"])
app.include_router(payment_router, prefix="/api", tags=["Payment"])
app.include_router(users_router, prefix="/api", tags=["Users"])
app.include_router(admin_router, prefix="/api", tags=["Admin Analytics"])


# 4. Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled server exception on %s: %s", request.url.path, str(exc))
    return JSONResponse(status_code=500, content={"error": str(exc) or "Internal Server Error"})
