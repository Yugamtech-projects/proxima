# Migration Blueprint: FastAPI & PostgreSQL (PostGIS)

This document provides the complete, production-grade architectural blueprint for migrating the Proxima backend to **Python 3.13 FastAPI** and **PostgreSQL (Supabase Pooler with PostGIS)** managed via **Poetry**.

---

## 1. Current Architectural Flaws & Frontend-to-Backend Migration Needs

To make Proxima sustainably secure, performant, and scalable to thousands of chapters and hundreds of thousands of members, the following architectural flaws and client-side bottlenecks must be moved to the backend:

### 1.1 Critical Current Flaws
1. **Volatile In-Memory Sessions & Rate Limiter:**
   - In `server/server.mjs`, active sessions (`activeSessions`) and failed login rate limits (`rateLimitMap`) are stored in JavaScript `Map` objects.
   - *Impact:* Any server restart logs out all administrators and resets security lockouts. Horizontal scaling (running multiple worker processes or containers) is impossible because sessions and rate limits are not shared.
2. **Concurrency Race Conditions on Flat-File JSON:**
   - The active database is `data/proxima_db.json`. Read/write cycles load the entire file into memory and overwrite it.
   - *Impact:* Simultaneous requests (e.g., two chapter admins updating rosters or concurrent onboarding) lead to silent data loss and race conditions.
3. **Data Leakage in Public Member Endpoint (Privacy & DPDP Act Flaw):**
   - In `server/server.mjs`, `GET /api/members/:chapterId` dumps the full roster. The frontend then filters `member.isVisible !== false` in React!
   - *Impact:* Any user opening DevTools Network tab can inspect hidden/non-renewed members, their private phone numbers, emails, and exact office addresses.
4. **Hardcoded Fallbacks:**
   - Default merchant Razorpay secrets and fallback SHA-256 password hashes exist in source files.

### 1.2 Features Currently Handled in Frontend that MUST Move to Backend (Phased Roadmap)
1. **Geospatial Proximity Radar & Distance Calculations:**
   - *Current:* Haversine formula (`calculateHaversineDistance`) and distance filtering (`1km`, `3km`, `5km`, `10km`, `25km`) run inside browser JavaScript loops over all loaded members.
   - *Backend Migration:* Handled in PostgreSQL via PostGIS `ST_DWithin` and `ST_DistanceSphere` with spatial GiST indexing. The frontend only sends `{ latitude, longitude, radius_km }` and receives pre-filtered, sorted results.
2. **Trip Multiplier (En-Route Detour Planning):**
   - *Current:* Detour route corridor calculations (`findNearbyTripOpportunities`) iterate through all members in browser memory.
   - *Backend Migration:* Compute route bounding-boxes via PostGIS spatial corridor queries (`ST_DWithin(ST_MakeLine(origin, destination), location, buffer_meters)`).
3. **1-to-1 Viewer Interactions & Meeting Logs:**
   - *Current:* Stored exclusively in the user's browser `localStorage` (`proxima_interactions_*`).
   - *Backend Migration:* Persisted in the database so meeting counts (`metCount`, `lastMetDate`, `navigationCount`) follow the user across devices and browsers.
4. **External Geocoding & OpenStreetMap Nominatim:**
   - *Current:* Frontend calls Nominatim directly (`https://nominatim.openstreetmap.org/search`).
   - *Backend Migration:* Nominatim blocks browser origins under high traffic due to strict CORS and rate limits. The backend must proxy, rate-limit, and cache geocoding queries.
5. **Google Maps Link Unshortening:**
   - *Current:* Short URLs (`maps.app.goo.gl`) cannot be resolved client-side due to browser CORS restrictions.
   - *Backend Migration:* Backend resolves HTTP `302/301` redirects on short links and parses high-precision coordinates (`!3d/!4d`).
6. **Bulk CSV / Spreadsheet Ingestion & Geocoding:**
   - *Current:* Browser thread parses files and runs sequential client geocoding.
   - *Backend Migration:* File upload endpoint (`POST /api/members/bulk-import`) processing rows asynchronously with transactional database rollbacks.

> **Implementation Phasing Note:**
> * **Phase 1 (Immediate Scope):** Core backend migration inside `server/` (dual-schema Postgres connection, `DatabaseManager` with connection warmup and PgBouncer pooler support, models, schemas, auth, class-based services, API routers, logger, `run_app.sh`, `Makefile`, and `Dockerfile`). `server/server.mjs` is retained.
> * **Phase 2 (Subsequent Scope):** Offloading client radar, trip multiplier corridor queries, and background CSV processing to backend.

---

## 2. Directory & File Structure (Inside `server/`)

The Python backend is colocated inside the existing **`server/`** directory. `server/server.mjs` is **strictly retained** during this migration.

```text
Proxima/
├── run_app.sh                      # Root execution script (nodemon + port 5051 killer + poetry)
├── Makefile                        # Root automation Makefile with .PHONY commands
├── Dockerfile                      # Python 3.13 production containerfile
├── .env                            # Environment variables (Supabase URL, DEV_ENV, Razorpay, JWT)
├── .env.example                    # Template environment variables
├── server/                         # Backend project root
│   ├── server.mjs                  # Legacy Node.js server (RETAINED, NOT DELETED)
│   ├── pyproject.toml              # Poetry configuration targeting Python ^3.13
│   ├── poetry.lock                 # Locked dependency tree
│   ├── app.py                      # FastAPI ASGI application entrypoint & CORS
│   ├── config/                     # Configuration management
│   │   ├── __init__.py
│   │   └── config.py               # Environment loader using load_dotenv (DATABASE_URL, DATABASE_SCHEMA)
│   ├── database/                   # Database engine, schema manager, & DatabaseManager
│   │   ├── __init__.py
│   │   └── database.py             # DatabaseManager class (get_engine, warmup, execute_db_query)
│   ├── models/                     # Database Models & Table DDL
│   │   ├── __init__.py             # Exports ALL_TABLES_SQL (chapters, users, members, licenses)
│   │   ├── user.py                 # Users DDL & query constants
│   │   ├── chapter.py              # Chapters DDL & spatial query constants
│   │   ├── member.py               # Members DDL & PostGIS query constants
│   │   └── license.py              # Licenses DDL & invoice query constants
│   ├── schemas/                    # Pydantic v2 data validation schemas
│   │   ├── __init__.py
│   │   ├── user.py                 # User and auth request/response schemas
│   │   ├── chapter.py              # Chapter CRUD & onboarding schemas
│   │   ├── member.py               # Member roster schemas
│   │   ├── license.py              # License & VIP pass schemas
│   │   ├── payment.py              # Razorpay order, verification & webhook schemas
│   │   └── admin.py                # SuperAdmin analytics schemas
│   ├── auth/                       # Security, JWT & access guards
│   │   ├── __init__.py
│   │   ├── jwt.py                  # JWT encode, decode & claims verification
│   │   ├── password.py             # Bcrypt hashing & constant-time comparison
│   │   └── dependencies.py         # FastAPI dependency injection (get_current_user)
│   ├── api/                        # Domain API route controllers
│   │   ├── __init__.py
│   │   ├── auth.py                 # /api/auth endpoints
│   │   ├── chapters.py             # /api/chapters endpoints
│   │   ├── members.py              # /api/members endpoints
│   │   ├── licensing.py            # /api/licensing endpoints
│   │   ├── users.py                # /api/users endpoints
│   │   ├── payment.py              # /api/payment endpoints (orders, verify, webhooks)
│   │   ├── admin.py                # /api/admin endpoints (dashboard, analytics, logs)
│   │   └── health.py               # /api/health endpoint
│   ├── service/                    # Class-based business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py         # AuthService class
│   │   ├── chapter_service.py      # ChapterService class
│   │   ├── member_service.py       # MemberService class
│   │   ├── licensing_service.py    # LicensingService class
│   │   ├── user_service.py         # UserService class
│   │   ├── payment_service.py      # PaymentService class
│   │   └── admin_service.py        # AdminService class
│   └── utils/                      # Shared utility functions
│       ├── __init__.py
│       ├── logger.py               # IST timezone logging (%d-%m-%Y %H:%M:%S)
│       ├── crypto.py               # Timing-safe HMAC SHA-256 verification
│       ├── distance.py             # Coordinate conversions & fallback Haversine
│       └── rate_limiter.py         # 15-minute sliding window lockout tracker
```

---

## 3. Minimal Production Database Schema (4 Tables)

To avoid schema bloat, the database is configured with **exactly 4 core tables** that map **1:1** with the existing `data/proxima_db.json` dataset and the 4 files in `models/`:

1. **`chapters`** (`models/chapter.py`): Chapter registry and geospatial hub coordinates.
2. **`users`** (`models/user.py`): Master Admin and Chapter Admin credentials with RBAC.
3. **`members`** (`models/member.py`): Business member directory with PostGIS spatial coordinates.
4. **`licenses`** (`models/license.py`): Active subscription state and embedded JSONB invoice history.

### 3.1 PostgreSQL Connection & Dynamic Schema Switching

* **Database Connection URL (Supabase Pooler):**
  ```env
  DATABASE_URL=postgresql://postgres.lbfvanmaxkfdzdlgykdf:[YOUR-DATABASE-PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
  ```
* **Dual-Schema Logic:**
  * **Production Mode (`DEV_ENV=False`):** Uses database schema **`"Proxima"`**.
  * **Development Mode (`DEV_ENV=True`):** Uses database schema **`"Proxima_dev"`**.
  * Handled dynamically in `config/config.py`: `DATABASE_SCHEMA = "Proxima_dev" if DEV_ENV else "Proxima"`.
  * During startup, `DatabaseManager.warmup_database_service()` executes:
    ```sql
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE SCHEMA IF NOT EXISTS "Proxima";
    CREATE SCHEMA IF NOT EXISTS "Proxima_dev";
    ```
    and dynamically builds all 4 tables inside the active schema (`ALL_TABLES_SQL`).

---

### 3.2 DDL Specifications & Indexes (PostgreSQL 15+ & PostGIS)

```sql
-- Enable PostGIS spatial extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- -----------------------------------------------------------------------------
-- 1. CHAPTERS (Corresponds strictly to db.chapters in proxima_db.json)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "{DATABASE_SCHEMA}".chapters (
    id VARCHAR(36) PRIMARY KEY,                             -- e.g. 'chap-titans'
    slug VARCHAR(80) NOT NULL UNIQUE,                       -- e.g. 'chennai-demo'
    name VARCHAR(150) NOT NULL,                             -- e.g. 'Chennai - Demo'
    organization_type VARCHAR(50) NOT NULL DEFAULT 'Business Forum',
    city VARCHAR(100) NOT NULL,                             -- e.g. 'Chennai'
    access_key VARCHAR(27) NOT NULL UNIQUE,                 -- e.g. 'px_7b9f3e1a8d4c205e81d6f03a'
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',           -- e.g. 'ACTIVE'
    center_coordinates GEOMETRY(Point, 4326) NULL,          -- WGS-84 Point [lng, lat]
    default_zoom SMALLINT NOT NULL DEFAULT 12,              -- Default map zoom
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chapters_slug ON "{DATABASE_SCHEMA}".chapters(slug);
CREATE INDEX IF NOT EXISTS idx_chapters_access_key ON "{DATABASE_SCHEMA}".chapters(access_key);
CREATE INDEX IF NOT EXISTS spx_chapters_center ON "{DATABASE_SCHEMA}".chapters USING GIST(center_coordinates);

-- -----------------------------------------------------------------------------
-- 2. USERS (Corresponds strictly to db.masterAdmin & db.chapterAdmins)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "{DATABASE_SCHEMA}".users (
    id VARCHAR(36) PRIMARY KEY,                             -- e.g. 'admin-titans' or 'admin-master'
    chapter_id VARCHAR(36) NULL REFERENCES "{DATABASE_SCHEMA}".chapters(id) ON DELETE CASCADE,
    chapter_slug VARCHAR(80) NULL,                          -- e.g. 'chennai-demo'
    chapter_name VARCHAR(150) NULL,                         -- e.g. 'Chennai - Demo'
    email VARCHAR(150) NOT NULL UNIQUE,                     -- e.g. 'titans.admin@proxima.network'
    name VARCHAR(120) NOT NULL,                             -- e.g. 'Master Super Admin' or 'Admin'
    password_hash VARCHAR(255) NOT NULL,                    -- SHA-256 password hash
    role VARCHAR(30) NOT NULL CHECK (role IN ('MASTER_ADMIN', 'CHAPTER_ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_chapter_id ON "{DATABASE_SCHEMA}".users(chapter_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON "{DATABASE_SCHEMA}".users(email);

-- -----------------------------------------------------------------------------
-- 3. MEMBERS (Corresponds strictly to db.members[chapterId])
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "{DATABASE_SCHEMA}".members (
    id VARCHAR(36) PRIMARY KEY,                             -- e.g. 'mem-01'
    chapter_id VARCHAR(36) NOT NULL REFERENCES "{DATABASE_SCHEMA}".chapters(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    company VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,                         -- e.g. 'IT Solutions'
    category_id VARCHAR(50) NOT NULL,                       -- e.g. 'tech'
    category_icon VARCHAR(50) NOT NULL DEFAULT 'Briefcase', -- Lucide icon key
    short_bio VARCHAR(500) NULL,
    phone VARCHAR(30) NOT NULL,
    whatsapp VARCHAR(30) NULL,
    email VARCHAR(150) NOT NULL,
    website VARCHAR(255) NULL,
    photo_url VARCHAR(512) NULL,
    location JSONB NOT NULL DEFAULT '{}'::jsonb,            -- Nested object: { address, area, city, pincode, latitude, longitude, locationStatus }
    one_to_one_availability VARCHAR(25) NOT NULL DEFAULT 'AVAILABLE',
    referral_requirements TEXT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    membership_status VARCHAR(20) NOT NULL DEFAULT 'RENEWED',
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,              -- False = Hidden from public map
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_members_chapter_visibility ON "{DATABASE_SCHEMA}".members(chapter_id, is_visible);
CREATE INDEX IF NOT EXISTS idx_members_category_id ON "{DATABASE_SCHEMA}".members(category_id);

-- -----------------------------------------------------------------------------
-- 4. LICENSES (Corresponds strictly to db.licenses[chapterId])
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "{DATABASE_SCHEMA}".licenses (
    id VARCHAR(36) PRIMARY KEY,                             -- e.g. 'lic-chap-titans' or UUID
    chapter_id VARCHAR(36) NOT NULL UNIQUE REFERENCES "{DATABASE_SCHEMA}".chapters(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',           -- e.g. 'ACTIVE'
    plan VARCHAR(100) NOT NULL,                             -- e.g. 'Annual Chapter License (₹1,999 / 1 Year)'
    price_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,        -- e.g. 1999
    valid_until TIMESTAMPTZ NOT NULL,                       -- e.g. '2027-10-25T13:21:34.880Z'
    last_payment_date TIMESTAMPTZ NULL,                     -- e.g. '2026-10-25T13:21:34.895Z'
    last_payment_id VARCHAR(100) NULL,                      -- e.g. 'pay_test_sandbox_123'
    last_order_id VARCHAR(100) NULL,                        -- e.g. 'order_mvnuwgsi_80bb43d722eb'
    invoices JSONB NOT NULL DEFAULT '[]'::jsonb,            -- Embedded past invoices array directly from JSON
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_licenses_chapter_id ON "{DATABASE_SCHEMA}".licenses(chapter_id);
CREATE INDEX IF NOT EXISTS idx_licenses_validity ON "{DATABASE_SCHEMA}".licenses(status, valid_until);
```

---

### 3.3 1-to-1 JSON-to-Database Mapping Table

| JSON Key in `proxima_db.json` | PostgreSQL Target Table | Migration Notes |
| :--- | :--- | :--- |
| `db.chapters` | `chapters` | Convert coordinates `[lng, lat]` into `ST_SetSRID(ST_MakePoint(lng, lat), 4326)`. |
| `db.masterAdmin` | `users` | Insert as single record with `role = 'MASTER_ADMIN'`, `chapter_id = NULL`. |
| `db.chapterAdmins` | `users` | Insert with `role = 'CHAPTER_ADMIN'`, mapped to `chapter_id`. |
| `db.members[chapterId]` | `members` | Flatten array; map `member.location.latitude` & `longitude` to PostGIS Point. |
| `db.licenses[chapterId]` | `licenses` | Insert with embedded `invoices` array preserved as `JSONB`. |

---

## 4. Technology Stack & Dependencies (`server/pyproject.toml`)

Managed via **Poetry** with **Python 3.13**:

```toml
[tool.poetry]
name = "proxima-server"
version = "1.0.0"
description = "FastAPI & PostgreSQL backend for Proxima Geospatial Business Directory"
authors = ["Yugam Systems <tech@proxima.network>"]
readme = "README.md"
packages = [{include = "server"}]

[tool.poetry.dependencies]
python = "^3.13"
fastapi = "^0.115.0"
uvicorn = {extras = ["standard"], version = "^0.32.0"}
pydantic = "^2.10.0"
pydantic-settings = "^2.6.0"
python-dotenv = "^1.0.1"
sqlalchemy = "^2.0.36"
asyncpg = "^0.30.0"
geoalchemy2 = "^0.17.0"
shapely = "^2.0.6"
pyjwt = {extras = ["crypto"], version = "^2.10.0"}
passlib = {extras = ["bcrypt"], version = "^1.7.4"}
razorpay = "^1.4.2"
httpx = "^0.28.0"
slowapi = "^0.1.9"

[tool.poetry.group.dev.dependencies]
pytest = "^8.3.0"
pytest-asyncio = "^0.24.0"
ruff = "^0.8.0"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

---

## 5. Layer Design & Responsibilities

### 5.1 Entrypoint (`server/app.py`)
- Initializes `FastAPI(title="Proxima API", version="1.0.0")`.
- Registers CORS middleware (`CORSMiddleware`) allowing frontend requests.
- Hooks application lifespan startup event to pre-warm the database and run DDL:
  ```python
  from contextlib import asynccontextmanager
  from fastapi import FastAPI
  from server.database.database import DatabaseManager

  @asynccontextmanager
  async def lifespan(app: FastAPI):
      await DatabaseManager.warmup_database_service()
      yield

  app = FastAPI(title="Proxima API", version="1.0.0", lifespan=lifespan)
  ```
- Mounts all modular domain routers under `/api`:
  ```python
  app.include_router(health.router, prefix="/api", tags=["Health"])
  app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
  app.include_router(chapters.router, prefix="/api/chapters", tags=["Chapters"])
  app.include_router(members.router, prefix="/api/members", tags=["Members"])
  app.include_router(licensing.router, prefix="/api/licensing", tags=["Licensing"])
  app.include_router(users.router, prefix="/api/users", tags=["Users"])
  app.include_router(payment.router, prefix="/api/payment", tags=["Payment"])
  app.include_router(admin.router, prefix="/api/admin", tags=["Admin Analytics"])
  ```

---

### 5.2 Configuration (`server/config/config.py`)
Uses `python-dotenv` to load `.env` variables and exposes typed settings:

```python
import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres.lbfvanmaxkfdzdlgykdf:[YOUR-DATABASE-PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres",
)
DEV_ENV: bool = os.getenv("DEV_ENV", "False").lower() in ("true", "1", "t")
DATABASE_SCHEMA: str = "Proxima_dev" if DEV_ENV else "Proxima"

PORT: int = int(os.getenv("PORT", "5051"))
HOST: str = os.getenv("HOST", "0.0.0.0")
JWT_SECRET: str = os.getenv("JWT_SECRET", "ProximaSuperSecret2026CryptoKey!")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "rzp_test_ProximaDemo2026")
RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "ProximaSecretDevKey2026")
RAZORPAY_WEBHOOK_SECRET: str = os.getenv("RAZORPAY_WEBHOOK_SECRET", "ProximaWebhookSecret2026")
```

---

### 5.3 Database Layer: `DatabaseManager` (`server/database/database.py`)
Optimized specifically for **Supabase's PgBouncer transaction pooler (port 6543)** and PostGIS:
* Disables prepared statement caching (`prepared_statement_cache_size=0`) to prevent PgBouncer statement errors.
* Sets SSL verification mode (`CERT_NONE`) for secure cloud transport.
* Automatically retries on DNS blips (`socket.gaierror`) with exponential backoff.
* Pre-warms the engine and creates the active schema (`Proxima` or `Proxima_dev`) and tables via `ALL_TABLES_SQL`.
* Executes raw, parameterized queries returning clean dictionaries for direct Pydantic validation.

```python
import ssl
import time
import asyncio
import socket
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.engine.url import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from server.models import ALL_TABLES_SQL
from server.config.config import DATABASE_SCHEMA, DATABASE_URL
from server.utils.logger import get_logger

logger = get_logger("proxima.database")


class DatabaseManager:
    """
    Async PostgreSQL Database Manager for Proxima.
    Configured for Supabase Transaction Pooler (Port 6543) and PostGIS.
    """

    _engine: AsyncEngine = None

    @staticmethod
    def _format_duration(elapsed_seconds: float) -> str:
        """Return a human-friendly startup duration string."""
        if elapsed_seconds >= 1.0:
            return f"{elapsed_seconds:.2f} s"
        return f"{elapsed_seconds * 1000:.2f} ms"

    @classmethod
    def get_engine(cls) -> AsyncEngine:
        """Initializes and returns the PostgreSQL Async Engine."""
        if not cls._engine:
            connection_string = DATABASE_URL
            if not connection_string:
                raise ValueError("Database connection string not found in environment!")

            try:
                url = make_url(connection_string).set(drivername="postgresql+asyncpg")

                ssl_ctx = ssl.create_default_context()
                ssl_ctx.check_hostname = False
                ssl_ctx.verify_mode = ssl.CERT_NONE

                cls._engine = create_async_engine(
                    url,
                    pool_size=10,
                    max_overflow=20,
                    pool_timeout=30,
                    pool_recycle=1800,
                    echo=False,
                    connect_args={
                        "ssl": ssl_ctx,
                        "prepared_statement_cache_size": 0,
                        "statement_cache_size": 0,
                    },
                )
            except Exception as e:
                logger.error("Database engine initialization failed: %s", e)
                raise
        return cls._engine

    @staticmethod
    async def warmup_database_service():
        """Ensure schema and tables exist and pre-warm a connection to reduce first-query latency."""
        engine = DatabaseManager.get_engine()
        max_attempts = 3
        base_retry_delay_seconds = 2

        for attempt in range(1, max_attempts + 1):
            start = time.perf_counter()
            try:
                async with engine.begin() as conn:
                    # Enable PostGIS extension
                    await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))

                    # Create dynamic schema (Proxima or Proxima_dev)
                    await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{DATABASE_SCHEMA}";'))

                    # Provision all 4 core tables
                    for table_sql in ALL_TABLES_SQL:
                        await conn.execute(text(table_sql))

                # Pre-warm connection
                async with engine.connect() as conn:
                    await conn.execute(text("SELECT 1"))

                elapsed = time.perf_counter() - start
                engine_url = engine.url
                logger.info(
                    "Database Engine Initialized for host=%s port=%s in %s",
                    engine_url.host, engine_url.port, DatabaseManager._format_duration(elapsed),
                )
                return
            except Exception as e:
                error_message = str(e)
                is_dns_error = (
                    isinstance(e, socket.gaierror)
                    or "Temporary failure in name resolution" in error_message
                )
                logger.error("Database warmup attempt %s/%s failed: %s", attempt, max_attempts, error_message)

                if is_dns_error and attempt < max_attempts:
                    retry_delay = base_retry_delay_seconds * attempt
                    logger.warning("Retrying DB warmup in %s seconds due to DNS resolution issue", retry_delay)
                    await asyncio.sleep(retry_delay)
                    continue
                raise

    @staticmethod
    async def execute_db_query(query: str, params: Optional[Dict[str, Any]] = None):
        """
        Executes a parameterized raw SQL query (SELECT, INSERT, UPDATE, DELETE, UPSERT).
        Returns a list of dicts for queries returning rows, otherwise returns True.
        """
        engine = DatabaseManager.get_engine()
        try:
            async with engine.begin() as conn:
                result = await conn.execute(text(query), params or {})
                if result.returns_rows:
                    return [dict(row._mapping) for row in result.fetchall()]
                return True
        except Exception as e:
            logger.error("Query execution failed: %s", e)
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    async def execute_db_select(
        table: str,
        columns: Optional[List[str]] = None,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Dynamic parameterized SELECT query builder."""
        cols = ", ".join(columns) if columns else "*"
        query = f'SELECT {cols} FROM "{DATABASE_SCHEMA}".{table}'
        params = {}

        if filters:
            conditions = [f"{k} = :f_{k}" for k in filters.keys()]
            query += f" WHERE {' AND '.join(conditions)}"
            params = {f"f_{k}": v for k, v in filters.items()}

        if order_by:
            query += f" ORDER BY {order_by}"
        if limit:
            query += f" LIMIT {limit}"

        return await DatabaseManager.execute_db_query(query=query, params=params)

    @staticmethod
    async def execute_db_insert(table: str, data: Dict[str, Any], returning: bool = True):
        """Dynamic parameterized INSERT query builder."""
        cols = ", ".join(data.keys())
        placeholders = ", ".join([f":{k}" for k in data.keys()])
        query = f'INSERT INTO "{DATABASE_SCHEMA}".{table} ({cols}) VALUES ({placeholders})'
        if returning:
            query += " RETURNING *"
        return await DatabaseManager.execute_db_query(query=query, params=data)

    @staticmethod
    async def execute_db_update(table: str, data: Dict[str, Any], filters: Dict[str, Any], returning: bool = True):
        """Dynamic parameterized UPDATE query builder."""
        set_clauses = [f"{k} = :u_{k}" for k in data.keys()]
        where_clauses = [f"{k} = :w_{k}" for k in filters.keys()]
        query = f'UPDATE "{DATABASE_SCHEMA}".{table} SET {", ".join(set_clauses)} WHERE {" AND ".join(where_clauses)}'
        if returning:
            query += " RETURNING *"

        params = {f"u_{k}": v for k, v in data.items()}
        params.update({f"w_{k}": v for k, v in filters.items()})
        return await DatabaseManager.execute_db_query(query=query, params=params)

    @staticmethod
    async def execute_db_upsert(table: str, data: Dict[str, Any], conflict_column: str, returning: bool = True):
        """Dynamic parameterized INSERT ... ON CONFLICT (UPSERT) query builder."""
        cols = ", ".join(data.keys())
        placeholders = ", ".join([f":{k}" for k in data.keys()])
        update_clauses = [f"{k} = EXCLUDED.{k}" for k in data.keys() if k != conflict_column]

        query = f"""
            INSERT INTO "{DATABASE_SCHEMA}".{table} ({cols})
            VALUES ({placeholders})
            ON CONFLICT ({conflict_column})
            DO UPDATE SET {", ".join(update_clauses)}
        """
        if returning:
            query += " RETURNING *"
        return await DatabaseManager.execute_db_query(query=query, params=data)

    @staticmethod
    async def execute_db_delete(table: str, filters: Dict[str, Any]):
        """Dynamic parameterized DELETE query builder."""
        where_clauses = [f"{k} = :w_{k}" for k in filters.keys()]
        query = f'DELETE FROM "{DATABASE_SCHEMA}".{table} WHERE {" AND ".join(where_clauses)}'
        params = {f"w_{k}": v for k, v in filters.items()}
        return await DatabaseManager.execute_db_query(query=query, params=params)
```

---

### 5.4 Database DDL & `ALL_TABLES_SQL` (`server/models/__init__.py`)
Exports `ALL_TABLES_SQL` formatted with the active `{DATABASE_SCHEMA}`:

```python
from server.config.config import DATABASE_SCHEMA

CHAPTERS_TABLE_SQL = f"""
CREATE TABLE IF NOT EXISTS "{DATABASE_SCHEMA}".chapters (
    id VARCHAR(36) PRIMARY KEY,
    slug VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    organization_type VARCHAR(50) NOT NULL DEFAULT 'Business Forum',
    city VARCHAR(100) NOT NULL,
    access_key VARCHAR(27) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    center_coordinates GEOMETRY(Point, 4326) NULL,
    default_zoom SMALLINT NOT NULL DEFAULT 12,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chapters_slug ON "{DATABASE_SCHEMA}".chapters(slug);
CREATE INDEX IF NOT EXISTS idx_chapters_access_key ON "{DATABASE_SCHEMA}".chapters(access_key);
CREATE INDEX IF NOT EXISTS spx_chapters_center ON "{DATABASE_SCHEMA}".chapters USING GIST(center_coordinates);
"""

USERS_TABLE_SQL = f"""
CREATE TABLE IF NOT EXISTS "{DATABASE_SCHEMA}".users (
    id VARCHAR(36) PRIMARY KEY,
    chapter_id VARCHAR(36) NULL REFERENCES "{DATABASE_SCHEMA}".chapters(id) ON DELETE CASCADE,
    chapter_slug VARCHAR(80) NULL,
    chapter_name VARCHAR(150) NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('MASTER_ADMIN', 'CHAPTER_ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_chapter_id ON "{DATABASE_SCHEMA}".users(chapter_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON "{DATABASE_SCHEMA}".users(email);
"""

MEMBERS_TABLE_SQL = f"""
CREATE TABLE IF NOT EXISTS "{DATABASE_SCHEMA}".members (
    id VARCHAR(36) PRIMARY KEY,
    chapter_id VARCHAR(36) NOT NULL REFERENCES "{DATABASE_SCHEMA}".chapters(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    company VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    category_id VARCHAR(50) NOT NULL,
    category_icon VARCHAR(50) NOT NULL DEFAULT 'Briefcase',
    short_bio VARCHAR(500) NULL,
    phone VARCHAR(30) NOT NULL,
    whatsapp VARCHAR(30) NULL,
    email VARCHAR(150) NOT NULL,
    website VARCHAR(255) NULL,
    photo_url VARCHAR(512) NULL,
    location JSONB NOT NULL DEFAULT '{{}}'::jsonb,
    one_to_one_availability VARCHAR(25) NOT NULL DEFAULT 'AVAILABLE',
    referral_requirements TEXT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    membership_status VARCHAR(20) NOT NULL DEFAULT 'RENEWED',
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_members_chapter_visibility ON "{DATABASE_SCHEMA}".members(chapter_id, is_visible);
CREATE INDEX IF NOT EXISTS idx_members_category_id ON "{DATABASE_SCHEMA}".members(category_id);
"""

LICENSES_TABLE_SQL = f"""
CREATE TABLE IF NOT EXISTS "{DATABASE_SCHEMA}".licenses (
    id VARCHAR(36) PRIMARY KEY,
    chapter_id VARCHAR(36) NOT NULL UNIQUE REFERENCES "{DATABASE_SCHEMA}".chapters(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    plan VARCHAR(100) NOT NULL,
    price_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    valid_until TIMESTAMPTZ NOT NULL,
    last_payment_date TIMESTAMPTZ NULL,
    last_payment_id VARCHAR(100) NULL,
    last_order_id VARCHAR(100) NULL,
    invoices JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_licenses_chapter_id ON "{DATABASE_SCHEMA}".licenses(chapter_id);
CREATE INDEX IF NOT EXISTS idx_licenses_validity ON "{DATABASE_SCHEMA}".licenses(status, valid_until);
"""

ALL_TABLES_SQL = [
    CHAPTERS_TABLE_SQL,
    USERS_TABLE_SQL,
    MEMBERS_TABLE_SQL,
    LICENSES_TABLE_SQL,
]
```

---

### 5.5 Schemas (`server/schemas/`)
Pydantic V2 data validation contracts:
- `user.py`: `LoginRequest`, `TokenResponse`, `UserCreate`, `UserResponse`.
- `chapter.py`: `ChapterCreate`, `ChapterUpdate`, `ChapterResponse`.
- `member.py`: `MemberCreate`, `MemberUpdate`, `MemberResponse`, `ProximityQuery`.
- `license.py`: `LicenseResponse`, `VipPassCreate`, `VipPassResponse`.
- `payment.py`: `OrderCreate`, `PaymentVerifyRequest`, `PaymentConfig`, `WebhookEvent`.
- `admin.py`: `DashboardAnalyticsResponse`, `GrowthMetricsResponse`, `AuditLogResponse`.

### 5.6 Authentication Layer (`server/auth/`)
- **`password.py`:** Bcrypt password hashing (`passlib.context.CryptContext`) and constant-time comparisons.
- **`jwt.py`:** Encodes and decodes stateless JWT tokens (`PyJWT`) containing `sub`, `role`, and `chapter_id`.
- **`dependencies.py`:** FastAPI `OAuth2PasswordBearer` dependency providing `get_current_user` and role-checking guards (`require_master_admin`, `require_chapter_admin`).

### 5.7 Class-Based Services (`server/service/`)
Business operations encapsulated in dedicated classes:
- `AuthService`: Login rate limiting (15-min lockout after 5 failures), password verification, and JWT generation.
- `ChapterService`: Unguessable 24-char hex key generation (`px_<hex>`), chapter provisioning, and updates.
- `MemberService`: PostGIS spatial queries (`ST_DWithin`), renewal filtering, and roster synchronization.
- `LicensingService`: License validity checks, duration extensions, and VIP pass issuance.
- `UserService`: User provisioning, role assignments, and password updates.
- `PaymentService`: Razorpay orders, HMAC SHA-256 verification (`hmac.compare_digest`), and webhook processing.
- `AdminService`: SuperAdmin platform KPIs, revenue telemetry, and audit log streaming.

### 5.8 API Routers (`server/api/`)
Route controllers grouped into domain routers:
- `/api/auth`: Login, profile context (`/me`).
- `/api/chapters`: Chapter CRUD, onboarding.
- `/api/members`: Roster CRUD, PostGIS spatial radar.
- `/api/licensing`: Plans, chapter licenses, VIP passes.
- `/api/users`: Admin user management.
- `/api/payment`: Razorpay order creation, payment verification, and webhooks (`/api/payment/webhook`).
- `/api/admin`: SuperAdmin dashboard, growth metrics, audit logs.
- `/api/health`: Uptime, DB connection status, memory usage.

### 5.9 Structured Logger (`server/utils/logger.py`)
- Configured in **Indian Standard Time (IST, `Asia/Kolkata`)**:
  ```python
  logging.basicConfig(
      level=logging.INFO,
      format="%(asctime)s | %(filename)s:%(lineno)s | %(levelname)s | %(message)s",
      datefmt="%d-%m-%Y %H:%M:%S"
  )
  ```
- **Single-liner default; maximum 2 lines** when logging structured details.

---

## 6. Automation & Tooling: `run_app.sh`, `Makefile`, and `Dockerfile`

### 6.1 Root `run_app.sh`
- Checks if port `5051` is occupied; kills conflicting process cleanly.
- Uses `nodemon` to watch Python files and automatically restart.
- Runs inside the Poetry virtual environment.

```bash
#!/usr/bin/env bash
set -e

PORT=${PORT:-5051}
echo "=================================================="
echo "🚀 PROXIMA BACKEND RUNNER"
echo "=================================================="

# Check and kill process on port 5051 if running
PID=$(lsof -ti:${PORT} 2>/dev/null || true)
if [ -n "$PID" ]; then
  echo "⚠️ Port ${PORT} is occupied by PID ${PID}. Terminating..."
  kill -9 $PID 2>/dev/null || true
  sleep 1
  echo "✅ Port ${PORT} freed."
fi

cd server

if command -v nodemon &> /dev/null; then
  echo "📡 Starting FastAPI with nodemon auto-reloader on port ${PORT}..."
  exec nodemon --watch . -e py --exec "poetry run uvicorn app:app --host 0.0.0.0 --port ${PORT}"
else
  echo "⚠️ nodemon not found. Falling back to native uvicorn --reload..."
  exec poetry run uvicorn app:app --host 0.0.0.0 --port ${PORT} --reload
fi
```

### 6.2 Root `Makefile`
Implements `.PHONY` with an automatic self-documenting help target:

```makefile
.PHONY: help install setup run lock clean lint

help:
	@echo "PROXIMA FastAPI Backend Automation"
	@echo "==================================="
	@echo "Available commands:"
	@echo "  make install   - Install Poetry package manager"
	@echo "  make setup     - Configure Poetry for Python 3.13 & install dependencies"
	@echo "  make run       - Run backend server using run_app.sh (with nodemon)"
	@echo "  make lock      - Generate / refresh poetry.lock"
	@echo "  make clean     - Remove Python __pycache__ and cache directories"
	@echo "  make lint      - Run Ruff linter across Python codebase"

install:
	@echo "📦 Installing Poetry..."
	curl -sSL https://install.python-poetry.org | python3 -

setup:
	@echo "🔧 Configuring Poetry environment for Python 3.13..."
	cd server && poetry env use python3.13
	@echo "📥 Installing backend dependencies..."
	cd server && poetry install

run:
	@chmod +x run_app.sh
	./run_app.sh

lock:
	@echo "🔒 Updating poetry.lock in server/..."
	cd server && poetry lock

clean:
	@echo "🧹 Cleaning Python cache files..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type f -name "*.pyo" -delete 2>/dev/null || true
	rm -rf .ruff_cache .pytest_cache server/.ruff_cache server/.pytest_cache 2>/dev/null || true
	@echo "✅ Cache cleaned."

lint:
	@echo "🔍 Running Ruff linter..."
	cd server && poetry run ruff check .
```

### 6.3 Root `Dockerfile`
A containerfile targeting Python 3.13:

```dockerfile
FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="/root/.local/bin:$PATH"

COPY server/pyproject.toml server/poetry.lock* /app/

RUN poetry config virtualenvs.create false \
    && poetry install --no-root --no-interaction --no-ansi

COPY server/ /app/

EXPOSE 5051

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5051"]
```

---

## 7. Step-by-Step Implementation Checklist (Awaiting User Approval)

1. [x] Create `.env` and `.env.example` in root with Supabase URL, `DEV_ENV=False`, and Razorpay secrets.
2. [x] Create `server/pyproject.toml` with Python `^3.13` dependencies.
3. [x] Create `server/config/config.py` using `load_dotenv` (`DATABASE_URL`, `DATABASE_SCHEMA`).
4. [x] Create `server/utils/logger.py` with IST timezone formatting.
5. [x] Create `server/models/__init__.py` exporting `ALL_TABLES_SQL` for the 4 core tables.
6. [x] Create `server/database/database.py` with `DatabaseManager` (PgBouncer pooler config, connection warmup, DNS retry, `execute_db_query`, `execute_db_upsert`).
7. [x] Create `server/schemas/` (`user.py`, `chapter.py`, `member.py`, `license.py`, `payment.py`, `admin.py`).
8. [x] Create `server/auth/` (`jwt.py`, `password.py`, `dependencies.py`).
9. [x] Create `server/service/` with class-based services (`AuthService`, `ChapterService`, `MemberService`, `LicensingService`, `UserService`, `PaymentService`, `AdminService`).
10. [x] Create `server/api/` route controllers (`auth`, `chapters`, `members`, `licensing`, `users`, `payment`, `admin`, `health`).
11. [x] Create `server/app.py` with lifespan warmup and mounting all routers under `/api`.
12. [x] Create root `run_app.sh` with nodemon watcher and port 5051 conflict termination.
13. [x] Create root `Makefile` with all `.PHONY` targets (`install`, `setup`, `run`, `lock`, `clean`, `lint`).
14. [x] Create root `Dockerfile` for Python 3.13.
