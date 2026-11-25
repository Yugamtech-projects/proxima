# GEMINI.md - Proxima by Yugam

This document serves as the primary instructional context and architectural reference for Gemini CLI and software engineers working within the **Proxima** repository.

---

## 1. Project Overview

**PROXIMA by Yugam** (package name: `member-map`, production domain: `proxima.network`) is a high-performance Geospatial Business Directory and Networking Platform built specifically for business chapters and executive networking forums (e.g., BNI, CNI, Rotary, Lions Club, TiE, Yi, Round Table, and independent business groups).

### Core Value Proposition
- **Geospatial Discovery:** Visualizes chapter members across regions on an interactive WebGL map and 3D globe, enabling proximity search, category filtering, and distance-based clustering.
- **Trip Multiplier:** Calculates en-route 1-to-1 networking opportunities between a viewer's starting location and destination member, maximizing transit efficiency.
- **Privacy & Unguessable Chapter Access:** Chapters are secured via unpredictable 24-character cryptographic hexadecimal tokens (`?c=px_<hex>`), preventing automated crawling or unauthorized directory enumeration.
- **Multi-Tenant Administration:** Strict data isolation between chapters, role-based access control (Master Super Admin vs Chapter Admin), member lifecycle management, and live map visibility toggling based on renewal status.
- **Monetization & Licensing:** Integrated Razorpay checkout with server-authoritative order generation and HMAC SHA-256 signature verification, supplemented by a complimentary VIP Pass system.
- **Sovereign Security & DPDP Compliance:** In-app anti-clickjacking frameguard, brute-force rate limiting with 15-minute lockout defense, input sanitization, and legal terms aligned with India's Digital Personal Data Protection Act, 2023 (DPDP Act) and Information Technology Act, 2000.

---

## 2. Technology Stack & Architecture

### Frontend
- **Framework:** React 19 (`react`, `react-dom`) with TypeScript (`~6.0.2`).
- **Build Tool:** Vite 8 (`@vitejs/plugin-react`).
- **Styling:** Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`), `tailwind-merge`, `clsx`, and custom design tokens in `src/index.css` / `src/App.css`.
- **Geospatial & 3D Mapping:**
  - `maplibre-gl`: High-performance WebGL vector map rendering, interactive clustering, and smooth camera flight animations.
  - `cobe`: Interactive 3D particle globe rendered on the landing page.
- **Iconography:** `lucide-react`.
- **Performance:** Lazy loading of all modal workflows (`AdminPortalModal`, `LegalModal`, `BrandStoryModal`, `NearMeRadarModal`, `CreateChapterModal`) and manual chunk splitting in `vite.config.ts` (`vendor-maplibre`, `vendor-react`, `vendor-lucide`).

### Backend API Server
- **Runtime:** Node.js (ES Modules, `server/server.mjs`, default port `5051`, proxied by Vite at `/api`).
- **Key Modules:** Native Node.js `http`, `crypto`, `fs`, `path`.
- **Authentication:** Bearer token session management, SHA-256 password hashing with timing-safe comparisons (`crypto.timingSafeEqual`), and IP/username sliding window rate limiter (max 5 failed attempts before 15-minute lockout).
- **Payment Gateway:** Razorpay Order Generation (`/api/licensing/create-order`), Payment Verification (`/api/licensing/verify-payment`), and Webhooks (`/api/webhooks/razorpay`).

### Data Persistence
- **Local Flat-File DB:** `data/proxima_db.json` with atomic `.tmp` + rename writes and rolling disaster recovery snapshots (up to 10 snapshots stored in `data/backups/`).
- **Offline / Client Fallback:** Browser `localStorage` and `sessionStorage` fallback caching across all primary services (`proximaApi.ts`, `chapters.ts`, `chapterLicensing.ts`, `chapterMembers.ts`, `viewerIdentity.ts`).
- **Production Relational DB (MySQL 8.0+ / PostgreSQL 15+ PostGIS):** Production schema in `database/schema.sql` featuring spatial indexes on WGS-84 coordinates (`SPATIAL INDEX` over `POINT SRID 4326`), foreign key constraints, cascading deletes, and initial seeds in `database/seeds.sql`.

---

## 3. Current Directory Layout

```text
.
├── data/                           # Local JSON database and automated backups
│   ├── proxima_db.json             # Active JSON database state
│   └── backups/                    # Rolling snapshot backups (last 10 versions)
├── database/                       # Production MySQL 8.0+ architecture
│   ├── export_json_to_mysql.mjs    # Sync script to export JSON data to MySQL
│   ├── README.md                   # Database benchmarks and import guide
│   ├── schema.sql                  # Production DDL with spatial indexing
│   └── seeds.sql                   # Seed data for chapters and superadmin
├── docs/                           # DPDP Act 2023 compliant legal documentation
│   ├── PRIVACY_POLICY.md           # Full privacy policy & data rights
│   └── TERMS_AND_CONDITIONS.md     # Terms of service and usage restrictions
├── public/                         # Static assets and multi-server rewrite rules
│   ├── _redirects                  # Netlify / Cloudflare Pages SPA rewrite rules
│   ├── .htaccess                   # Apache SPA rewrite rules
│   ├── web.config                  # IIS rewrite rules
│   ├── favicon.svg, icons.svg      # Application branding
│   └── fonts/                      # Custom application typefaces
├── scratch/                        # Verification test suites and audit scripts
│   ├── test_brutal_audit.mjs       # Comprehensive crypto, auth, and map unit audit
│   ├── test_prod_backend.mjs       # Integration test script for Node.js API server
│   ├── test_legal_audit.mjs        # DPDP Act legal compliance verification
│   ├── test_map_popup.mjs          # Map marker & popup behavior tests
│   └── test_onboarding.mjs         # Chapter creation & payment verification tests
├── server/
│   └── server.mjs                  # Active Production Node.js API server
├── src/
│   ├── assets/                     # SVGs and image assets
│   ├── components/                 # Domain-organized React components
│   │   ├── Admin/                  # Admin portal, bulk CSV importer, location verifier
│   │   ├── Brand/                  # Brand story modal and credentials
│   │   ├── Common/                 # Error boundary and shared utility components
│   │   ├── Filters/                # Category & distance radius filter controls
│   │   ├── Gateway/                # Invalid token quarantine screen & chapter routing
│   │   ├── Header/                 # Command bar, search bar, geocoder trigger
│   │   ├── Landing/                # 3D globe landing page, city selector
│   │   ├── Legal/                  # In-app privacy policy & terms modal
│   │   ├── Map/                    # MapLibre GL container, markers, popups
│   │   ├── MemberList/             # Side drawer, bottom cards, member cards
│   │   ├── MemberProfile/          # 1-to-1 booking, bio, WhatsApp/Call actions
│   │   ├── Navigation/             # Trip multiplier detour opportunities modal
│   │   ├── NearMe/                 # Proximity radar modal
│   │   ├── Onboarding/             # Self-serve chapter creation & payment modal
│   │   ├── Privacy/                # In-app privacy notices
│   │   └── Viewer/                 # Viewer identity & location session modal
│   ├── data/                       # Initial datasets, chapter stores, licensing plans
│   │   ├── adminAccounts.ts        # Seed admin credential definitions
│   │   ├── chapterLicensing.ts     # Pricing plans (Semi-Annual, Annual) & licenses
│   │   ├── chapterMembers.ts       # Chapter member storage & mock data generator
│   │   ├── chapters.ts             # Chapter registry, access key generation
│   │   └── mockMembers.ts          # Curated business directory dataset
│   ├── services/                   # API adapters and security engines
│   │   ├── proximaApi.ts           # Backend HTTP adapter with offline fallback
│   │   ├── securityEngine.ts       # Frame-guard, input sanitizer, tamper ledger
│   │   └── viewerIdentity.ts       # Viewer session & interaction history tracker
│   ├── types/
│   │   └── member.ts               # Member, Chapter, Location, and License interfaces
│   ├── utils/                      # Domain utilities
│   │   ├── crypto.ts               # SHA-256 fallback hashing implementation
│   │   ├── csvTemplate.ts          # Template generator for bulk member uploads
│   │   ├── distance.ts             # Haversine distance formula & string formatting
│   │   ├── geocoding.ts            # Hub coordinates & nominatim/place search
│   │   ├── geojson.ts              # GeoJSON FeatureCollection converters
│   │   ├── googleMapsParser.ts     # Robust Google Maps URL & coordinate parser
│   │   ├── locationColor.ts        # Location status styling & pins
│   │   ├── navigation.ts           # External navigation URL builder (Maps/Waze)
│   │   └── spreadsheetParser.ts    # Fuzzy column matching for CSV/Excel data
│   ├── App.tsx                     # Root application controller & state coordinator
│   ├── App.css                     # Application-specific animation and layout styles
│   ├── index.css                   # Tailwind CSS v4 theme variables
│   └── main.tsx                    # React DOM root entry point
├── API_DOCUMENTATION.md            # Comprehensive REST API reference & payloads
├── MIGRATION_FASTAPI_POSTGRES.md   # Architectural migration plan to FastAPI + PostGIS
├── README.md                       # Project overview, user journeys & feature-to-API matrix
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── .oxlintrc.json
```

---

## 4. Building and Running

### Prerequisites
- Node.js `v20+` or `v22+`
- `npm`

### Key Commands

| Task | Command | Description |
| :--- | :--- | :--- |
| **Development Frontend** | `npm run dev` | Starts Vite dev server (default `http://localhost:5173`) with HMR |
| **Development Backend** | `npm run server` | Starts Node.js API server (`http://localhost:5051`) |
| **Full Build** | `npm run build` | Executes `tsc -b && vite build` into `./dist` |
| **Linting** | `npm run lint` | Runs `oxlint` against the codebase |
| **Preview Build** | `npm run preview` | Starts local HTTP server previewing `./dist` |

### Running the Full Development Stack
To run both the backend API server and the frontend with HMR:

```bash
# Terminal 1: Backend API server
npm run server

# Terminal 2: Vite frontend
npm run dev
```
*Note: Vite is configured to proxy all `/api/*` calls directly to `http://localhost:5051`.*

### Testing & Auditing
The project includes self-contained Node.js audit scripts in the `scratch/` directory:

```bash
# 1. Run core unit audit (Crypto, Auth, Tenant Isolation, Distance, Google Maps Parser)
node scratch/test_brutal_audit.mjs

# 2. Run backend API integration test (Health, Sessions, Licensing Orders, Signature Verification)
# (Ensure 'npm run server' is active in another process or terminal)
node scratch/test_prod_backend.mjs

# 3. Verify DPDP Act 2023 legal audit rules
node scratch/test_legal_audit.mjs
```

---

## 5. Development Conventions & Patterns

### TypeScript & Compiler Options
- **Strict Settings:** `tsconfig.app.json` has `noUnusedLocals: true`, `noUnusedParameters: true`, and `erasableSyntaxOnly: true`. Unused local variables and dead imports will cause `tsc -b` to fail during `npm run build`. Always remove or prefix unused variables (or handle them cleanly).
- **Module Imports:** Uses ES modules with bundler module resolution (`"moduleResolution": "bundler"`, `"verbatimModuleSyntax": true`).

### Geospatial Coordinate Standard
- **MapLibre GL Coordinate Order:** Standard MapLibre GL GeoJSON coordinates must strictly be `[Longitude, Latitude]` (X, Y).
- **Member Location Objects:** Typed as `{ latitude: number, longitude: number }` in `MemberLocation` (`src/types/member.ts`).
- **Distance Calculation:** Always use `calculateHaversineDistance(lat1, lon1, lat2, lon2)` from `src/utils/distance.ts` which returns distance in kilometers.

### Multi-Tenant Data Isolation
- Chapters must never leak data into other chapters. Real chapters provisioned by users start with an empty member roster.
- Only the Chapter Admin assigned to a chapter (or the server acting on their behalf) may mutate member data for that chapter. Master Admins oversee licensing, system health, and chapter metadata but do not directly overwrite member records.
- When saving member rosters, non-renewed members must have `isVisible: false` and `membershipStatus: 'NOT_RENEWED'`, ensuring they are excluded from public chapter map views while remaining accessible in the admin roster for reactivation.

### URL Access Control
- Chapter routing relies on the `?c=<accessKey>` query parameter.
- Chapter tokens start with `px_` followed by 24 hexadecimal characters (e.g., `px_7b9f3e1a8d4c205e81d6f03a`).
- If an invalid or tampered access key is passed, the app immediately halts navigation and displays the quarantine screen (`src/components/Gateway/InvalidChapterScreen.tsx`).

### Offline-First Service Architecture
- All API interactions in `src/services/proximaApi.ts` check server availability with short timeouts. If the backend is offline or unreachable, the application falls back gracefully to `localStorage` and `sessionStorage`, ensuring zero downtime for client-side demonstrations.

### Security Best Practices
- **Never hardcode secrets or live API keys.** Razorpay credentials and webhook secrets should be passed via environment variables (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) or configured dynamically through the Master Admin portal.
- **Timing-Safe Operations:** All cryptographic verification (passwords, HMAC signatures) uses constant-time comparison (`crypto.timingSafeEqual`).
- **Input Sanitization:** All user text inputs destined for display must be sanitized using `SecurityEngine.getInstance().sanitizeInput(...)` to eliminate XSS vectors.

---

## 6. Python Backend Standards & Engineering Conventions

All Python backend code (FastAPI, SQLAlchemy, Pydantic, services) must adhere strictly to these standards:

### 6.1 Function Design, Naming & Parameter Calling Rules
1. **Clear & Expressive Names:** Function names must be explicit, self-describing verbs in `snake_case` (e.g., `get_chapter_by_access_key`, `verify_razorpay_payment_signature`, `calculate_nearby_radar_members`). Avoid cryptic abbreviations.
2. **Named Argument Call Syntax (`param=value`):**
   - Function calls must pass parameters using explicit `param=value` keyword arguments.
   - Example:
     ```python
     user = await user_service.create_chapter_admin(
         email="coimbatore.admin@proxima.network",
         password="SecurePassword2026!",
         chapter_id="chap-cbe-01",
         name="Coimbatore Admin",
     )
     ```
3. **Single-Line vs Multi-Line Parameter Rule (Function Definitions & Calls):**
   - When a function definition or function call has **4 or fewer parameters (<= 4)**, it **MUST be formatted on a single line**:
     ```python
     async def require_chapter_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
     ```
   - Only when a function definition or call has **more than 4 parameters (> 4)**, each parameter **MUST be formatted on a separate line** with proper indentation and a trailing comma:
     ```python
     # Function Definition (> 4 parameters -> Multi-line):
     def onboard_chapter(
         chapter_name: str,
         city: str,
         region: str,
         admin_login_id: str,
         admin_password: str,
         organization_type: str = "Business Forum",
         plan_key: str = "ANNUAL",
     ) -> ChapterOnboardResponse:
         ...

     # Function Call (> 4 parameters -> Multi-line):
     new_chapter = await chapter_service.onboard_chapter(
         chapter_name="Madurai Metro",
         city="Madurai",
         region="Tamil Nadu",
         admin_login_id="madurai.admin",
         admin_password=hashed_password,
         organization_type="BNI Chapter",
         plan_key="ANNUAL",
     )
     ```
4. **Two-Line Function Separation:**
   - Always maintain **exactly 2 blank lines** of separation between functions and between classes/top-level declarations.
5. **Exceptions on a Single Line:**
   - Exception raises (e.g. `HTTPException`) with normal/reasonable length **MUST be written on a single line**:
     ```python
     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Admin privileges required.")
     ```

### 6.2 Class-Based Service Layer Architecture
- Every business service in `server/service/` **MUST be implemented as a dedicated class** (not loose floating functions):
  - `class AuthService:`
  - `class ChapterService:`
  - `class MemberService:`
  - `class LicensingService:`
  - `class UserService:`
  - `class PaymentService:`
  - `class AdminService:`
- Service methods must accept the async database session or execute via `DatabaseManager`.

### 6.3 Structured Logger Standards (`server/utils/logger.py`)
1. **Format & IST Timezone Specification:**
   - Must log using **Indian Standard Time (IST, `Asia/Kolkata`)**.
   - Standard format configuration:
     ```python
     logging.basicConfig(
         level=logging.INFO, 
         format="%(asctime)s | %(filename)s:%(lineno)s | %(levelname)s | %(message)s", 
         datefmt="%d-%m-%Y %H:%M:%S"
     )
     ```
   - In `server/utils/logger.py`, create a custom `ISTFormatter` that forces `%(asctime)s` into `Asia/Kolkata` time and expose the `logger` variable directly:
     ```python
     import logging
     from datetime import datetime
     from zoneinfo import ZoneInfo

     class ISTFormatter(logging.Formatter):
         def formatTime(self, record, datefmt=None):
             dt = datetime.fromtimestamp(record.created, tz=ZoneInfo("Asia/Kolkata"))
             if datefmt:
                 return dt.strftime(datefmt)
             return dt.strftime("%d-%m-%Y %H:%M:%S")

     def _setup_logger(name: str = "proxima") -> logging.Logger:
         log = logging.getLogger(name)
         if not log.handlers:
             handler = logging.StreamHandler()
             formatter = ISTFormatter(
                 fmt="%(asctime)s | %(filename)s:%(lineno)s | %(levelname)s | %(message)s", 
                 datefmt="%d-%m-%Y %H:%M:%S"
             )
             handler.setFormatter(formatter)
             log.addHandler(handler)
             log.setLevel(logging.INFO)
         return log

     # Direct module-level logger variable export (do not call get_logger in other files)
     logger = _setup_logger()
     ```
   - In other files, import directly as:
     ```python
     from server.utils.logger import logger
     ```

2. **Log Message Length Rules:**
   - **Default:** Must be a **single liner**:
     ```python
     logger.info("Admin login verified | email=%s, role=%s", email, role)
     ```
   - **If Long / Exceeding Width:** Strictly format as **maximum 2 lines**:
     - **Line 1:** Human-readable description of the operation.
     - **Line 2:** Formatted key-value pairs of the variables/context used:
     ```python
     logger.info(
         "Bulk member import completed successfully for chapter: chapter_id=%s,valid_rows=%d, skipped_rows=%d, elapsed_ms=%d",
         chapter_id, valid_rows, skipped_rows, elapsed_ms,
     )
     ```

### 6.4 Database Query & SQL Formatting Standards

All SQL queries executed across the Python backend must strictly adhere to these conventions:

1. **Centralized Qualified Table Constants:**
   - Table constants in `config.config` are pre-qualified with the dynamic active schema (e.g. `CHAPTERS_TABLE = f'"{DATABASE_SCHEMA}".chapters'`):
     ```python
     from config.config import (
         CHAPTERS_TABLE,
         USERS_TABLE,
         MEMBERS_TABLE,
         LICENSES_TABLE,
     )
     ```
   - Never write literal table or schema strings in queries. Always format queries directly using `{CHAPTERS_TABLE}`, `{USERS_TABLE}`, `{MEMBERS_TABLE}`, or `{LICENSES_TABLE}`.

2. **Explicit Multi-Line SQL Query Formatting:**
   - Every SQL query **MUST be formatted as an explicit multi-line f-string (`f"""..."""`)** with proper indentation:
     ```python
     select_chapter_query = f"""
         SELECT * FROM {CHAPTERS_TABLE}
         WHERE id = :id OR access_key = :id OR slug = :id
         LIMIT 1
     """
     select_chapter_params = {"id": clean_id}
     results = await DatabaseManager.execute_db_select(query=select_chapter_query, params=select_chapter_params)
     ```

3. **Semantic Query and Parameter Variable Naming Convention:**
   - Queries and their bound parameter dictionaries **MUST be named as descriptive semantic pairs**:
     - **Query variable:** `<action>_<entity>_query` (e.g., `insert_member_row_query`, `select_members_query`, `delete_chapter_members_query`, `select_user_by_email_query`, `upsert_chapter_license_query`).
     - **Params variable:** `<action>_<entity>_params` (e.g., `insert_member_row_params`, `select_members_params`, `delete_chapter_members_params`, `select_user_by_email_params`, `upsert_chapter_license_params`).
   - Avoid generic or disconnected names like `q`, `p`, `sql`, `data`, or `query` without the entity context.

4. **Dynamic Filtering Without Query Duplication:**
   - When query filters vary conditionally, construct a dynamic `where_clauses` list instead of duplicating the entire SQL query string:
     ```python
     where_clauses = ["chapter_id = :chapter_id"]
     select_members_params = {"chapter_id": str(chapter_id)}

     if not is_admin:
         where_clauses.append("is_visible = true")

     select_members_query = f"""
         SELECT * FROM {MEMBERS_TABLE}
         WHERE {" AND ".join(where_clauses)}
         ORDER BY name ASC
     """
     members = await DatabaseManager.execute_db_select(query=select_members_query, params=select_members_params)
     ```

5. **Standard `DatabaseManager` Methods & Single-Line Calling Rule:**
   - Database operations must use the dedicated semantic helpers on `DatabaseManager` (`database.database`):
     - **`DatabaseManager.execute_db_select(query=query, params=params)`**: Used for all `SELECT` queries.
     - **`DatabaseManager.execute_db_insert(query=query, params=params)`**: Used for all `INSERT` queries.
     - **`DatabaseManager.execute_db_update(query=query, params=params)`**: Used for all standard `UPDATE` queries.
     - **`DatabaseManager.execute_db_upsert(query=query, params=params)`**: Used for all `INSERT ... ON CONFLICT DO UPDATE` (UPSERT) queries.
     - **`DatabaseManager.execute_db_delete(query=query, params=params)`**: Used for all `DELETE` queries.
     - **`DatabaseManager.execute_db_query(query=query, params=params)`**: General-purpose raw execution helper.
   - **Single-Line Calling Mandate:** Because these database helper methods accept only 1 or 2 parameters (`query` and `params`), they have `<= 4 parameters` and **MUST ALWAYS be formatted on a single line**:
     ```python
     # Correct (<= 4 parameters -> Single-line):
     results = await DatabaseManager.execute_db_select(query=select_chapter_query, params=select_chapter_params)
     await DatabaseManager.execute_db_upsert(query=upsert_chapter_license_query, params=upsert_chapter_license_params)

     # Incorrect (Never split <= 4 parameters across lines):
     results = await DatabaseManager.execute_db_select(
         query=select_chapter_query,
         params=select_chapter_params,
     )
     ```

### 6.5 Centralized Plan Literals, Enums & Schema Selection Standard
1. **No Magic Strings for Plans or Statuses:**
   - Never write loose string literals for plan names (e.g. `"Complimentary Prototype Pass (₹0 / 1 Year Free)"`, `"Annual Chapter License (₹1,999 / 1 Year)"`) or plan keys in business logic.
   - Always import and use the centralized Enums and string constants from `config.config`:
     ```python
     from config.config import (
         LicensePlanKey,
         LicensePlanName,
         LicenseStatus,
         PLAN_ANNUAL,
         PLAN_SEMI_ANNUAL,
         PLAN_COMPLIMENTARY,
         RENEWAL_PLANS,
     )
     ```
2. **Pydantic Literal Types for Clean Schema Selection:**
   - In request/response schemas, define plan and status fields using `Literal[...]` types (e.g. `LicensePlanLiteral`, `LicenseKeyLiteral`, `LicenseStatusLiteral`).
   - This automatically enables Swagger/OpenAPI documentation (`/docs`) to present clean dropdown menus for selecting plans and statuses.

---

## 7. Strict Git Mandate - DO NOT TOUCH GIT AT ALL

- **The assistant must NEVER execute ANY git commands** (`git add`, `git restore`, `git reset`, `git commit`, `git push`, etc.).
- **No Staging or Unstaging:** Never stage (`git add`) or unstage (`git restore --staged`) files at any time.
- **Sole User Ownership:** Staging, unstaging, committing, and pushing are exclusively performed by the user in their own terminal or editor.
- **Assistant Scope:** The assistant's role is strictly limited to making code changes in the workspace files. Do NOT touch git under any circumstances.


