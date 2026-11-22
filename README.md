# PROXIMA by Yugam

> **High-Performance Geospatial Business Directory and Networking Platform**  
> Tailored for executive networking forums and business chapters (e.g., BNI, CNI, Rotary, Lions Club, TiE, Yi, Round Table, and independent business groups).

* **Production Domain:** [proxima.network](https://proxima.network)
* **API Documentation:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
* **Upcoming FastAPI + PostgreSQL Migration Plan:** [MIGRATION_FASTAPI_POSTGRES.md](./MIGRATION_FASTAPI_POSTGRES.md)

---

## 1. Project Overview & How Proxima Works

Proxima visualizes business chapter members on an interactive geospatial canvas, turning static member directories into dynamic, distance-aware networking hubs.

### 1.1 The Three Core User Journeys

#### A. Public Chapter Viewer (Member or Guest)
1. **Accessing a Chapter:** Accesses the directory via an unguessable 24-character cryptographic token in the URL (`https://proxima.network/?c=px_7b9f3e1a8d4c205e81d6f03a`). Invalid or tampered tokens immediately divert the user to a quarantined lock screen.
2. **Interactive Map Exploration:** Views active, renewed chapter members rendered on a high-performance WebGL vector map (`maplibre-gl`). Members cluster smoothly when zoomed out.
3. **Category Filtering & Search:** Filters members by industry (IT, Legal, Healthcare, Real Estate, Finance, etc.) or searches by company name, contact person, or keyword tags.
4. **Member Profile & Direct Actions:** Clicks any pin or drawer item to view bio, verified office location, 1-to-1 availability, referral requirements, and initiates direct calls or WhatsApp messages.
5. **Near Me Proximity Radar:** Drops a GPS pin or searches an area to discover all members within 1 km, 3 km, 5 km, 10 km, or 25 km radius.
6. **Trip Multiplier:** Inputs a destination member or address to calculate en-route detour networking opportunities, optimizing travel time.

#### B. Chapter Administrator
1. **Secure Login:** Logs into the Admin Portal (`titans.admin@proxima.network`) protected by a server-side brute-force defense (15-minute lockout after 5 failed attempts).
2. **Roster Management:** Adds, edits, or deletes member records. Toggles renewal status (`RENEWED` vs `NOT_RENEWED`); non-renewed members are immediately hidden from public view while retained in admin records.
3. **Bulk Member Importer:** Pastes spreadsheet rows or uploads CSV files with fuzzy column matching and automatic Google Maps link coordinate extraction.
4. **Location Verifier:** Visually verifies and pins exact office coordinates on a satellite/street canvas.
5. **License Renewal:** Generates Razorpay checkout orders (Semi-Annual or Annual plans) with instant cryptographic payment verification.

#### C. Master Super Admin
1. **Platform Oversight:** Monitors system health, active sessions, chapter counts, and server telemetry.
2. **VIP Complimentary Passes:** Issues 1-year free onboarding passes (`free_pass_<hex>`) for leadership teams or working prototypes.
3. **Complimentary License Grants:** Extends 100% free licenses to existing chapters.
4. **Dynamic Payment Credentials:** Configures merchant Razorpay Key IDs and secrets without redeploying code.

---

## 2. Feature-to-API Mapping Matrix

This matrix explains **which frontend feature calls which backend API endpoint**:

| Frontend Feature / UI Workflow | Frontend File | Backend API Called | HTTP Method | What It Does |
| :--- | :--- | :--- | :--- | :--- |
| **App Startup & Telemetry** | `src/App.tsx`<br>`src/services/proximaApi.ts` | `/api/health` | `GET` | Checks if backend is online; reports uptime, memory usage, and chapter counts. Falls back to offline storage if unreachable. |
| **Admin Portal Login** | `src/components/Admin/AdminPortalModal.tsx` | `/api/auth/login` | `POST` | Authenticates admin credentials using SHA-256 with timing-safe comparison; issues a 24-hr Bearer session token. Enforces 15-min lockout on 5 failures. |
| **Public Map & Roster Load** | `src/App.tsx`<br>`src/data/chapterMembers.ts` | `/api/members/:chapterId` | `GET` | Fetches chapter members from database. Populates map pins, bottom cards, and the side drawer. |
| **Roster Save / Edit / Delete** | `src/components/Admin/AdminPortalModal.tsx` | `/api/members/:chapterId` | `POST` | Saves updated member roster. Enforces strict tenant isolation: Chapter Admins cannot modify rosters of other chapters. |
| **Bulk CSV / Excel Importer** | `src/components/Admin/BulkMemberImporterModal.tsx` | `/api/members/:chapterId` | `POST` | After browser fuzzy-matching and geocoding, batches validated members and persists to database. |
| **Self-Serve Chapter Onboarding** | `src/components/Onboarding/CreateChapterModal.tsx` | `/api/chapters/onboard` | `POST` | Creates a new chapter with an unguessable 24-char hex key (`px_<hex>`), provisions admin account, and activates license via payment or VIP token. |
| **License Renewal Modal (Fetch Config)**| `src/components/Admin/AdminPortalModal.tsx` | `/api/licensing/config` | `GET` | Retrieves public Razorpay Key ID and verifies whether live or sandbox mode is active. |
| **Master Admin Payment Config** | `src/components/Admin/AdminPortalModal.tsx` | `/api/licensing/config` | `POST` | Master Admin dynamically updates merchant Razorpay credentials in database. |
| **License Checkout (Order Gen)** | `src/components/Admin/AdminPortalModal.tsx` | `/api/licensing/create-order`| `POST` | Generates a server-authoritative Razorpay Order ID with HMAC-signed price binding to prevent tampering. |
| **License Payment Verification** | `src/components/Admin/AdminPortalModal.tsx` | `/api/licensing/verify-payment`| `POST` | Cryptographically verifies Razorpay payment signature in constant time, extends chapter license, and logs invoice. |
| **VIP Passes Tab (Master Admin)**| `src/components/Admin/AdminPortalModal.tsx` | `/api/vip-passes` | `GET` | Fetches list of active and redeemed VIP passes for Master Admin review. |
| **Generate VIP Pass Link** | `src/components/Admin/AdminPortalModal.tsx` | `/api/vip-passes` | `POST` | Generates a 1-year free complimentary pass link (`free_pass_<hex>`) with configurable max uses. |
| **Grant Free License to Chapter**| `src/components/Admin/AdminPortalModal.tsx` | `/api/chapters/grant-free-license` | `POST` | Master Admin extends 100% complimentary license directly to an existing chapter ID. |
| **Automated Payment Webhook** | Backend Server Event | `/api/webhooks/razorpay` | `POST` | Ingests server-to-server Razorpay webhooks with mandatory `X-Razorpay-Signature` validation. |

---

## 3. Current Backend APIs & Admin Capabilities

### 3.1 Does the Current Architecture Have Admin APIs?
**Yes, but they are currently dispersed across existing endpoints rather than a dedicated `/api/admin/*` router.**

In the current Node.js architecture (`server/server.mjs`):
* **Master Admin APIs Present Today:**
  * `GET /api/vip-passes` (Lists all VIP passes)
  * `POST /api/vip-passes` (Creates single/multi-use VIP passes)
  * `POST /api/chapters/grant-free-license` (Extends 100% free license)
  * `POST /api/licensing/config` (Updates merchant Razorpay keys)
* **What is Handled in Frontend for Admin Today:**
  * Network-wide analytics (active chapter count, member counts, revenue) are aggregated in React state by reading from `/api/health`, `/api/vip-passes`, and local datasets.
* **Target Scalable Solution (FastAPI Migration):**
  * In the upcoming FastAPI architecture, dedicated administrative modules (`/api/admin/dashboard`, `/api/admin/analytics/growth`, `/api/admin/audit-logs`, and `/api/users/*`) will provide server-side aggregation, PostGIS analytics, and user management.

---

### 3.2 The 13 Endpoints in Current Backend (`server/server.mjs`)

| # | Method | Endpoint | Authorization | Description |
| :- | :--- | :--- | :--- | :--- |
| **1** | `GET` | `/api/health` | Public | System uptime, active sessions, chapter count, DB version, memory usage |
| **2** | `POST` | `/api/auth/login` | Public (Rate-Limited) | SHA-256 login verification with 15-minute sliding window lockout |
| **3** | `GET` | `/api/licensing/config` | Public | Returns active Razorpay public Key ID and mode status |
| **4** | `POST` | `/api/licensing/config` | Master Admin | Updates merchant Razorpay credentials dynamically in database |
| **5** | `POST` | `/api/licensing/create-order` | Public | Creates server-signed Razorpay orders with price binding |
| **6** | `POST` | `/api/licensing/verify-payment` | Public | Verifies payment HMAC signature, extends license, and logs invoice |
| **7** | `POST` | `/api/chapters/onboard` | Public | Self-serve chapter onboarding (via payment or VIP pass token) |
| **8** | `GET` | `/api/vip-passes` | Master Admin | Lists all active and used VIP Free Chapter Passes |
| **9** | `POST` | `/api/vip-passes` | Master Admin | Generates a new VIP complimentary pass with usage limits and duration |
| **10** | `POST` | `/api/chapters/grant-free-license` | Master Admin | Grants a 100% complimentary license extension to an existing chapter |
| **11** | `POST` | `/api/webhooks/razorpay` | Razorpay Webhook | Validates `X-Razorpay-Signature` and captures automated payment events |
| **12** | `GET` | `/api/members/:chapterId` | Public | Retrieves all members belonging to a chapter |
| **13** | `POST` | `/api/members/:chapterId` | Chapter Admin | Saves/syncs chapter member roster (strictly quarantined to chapter ID) |

*(For complete request/response JSON schemas, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).)*

---

## 4. Current Architectural Flaws & Frontend-to-Backend Migration Needs

To make Proxima sustainably secure, performant, and scalable to thousands of chapters and hundreds of thousands of members, the following architectural flaws and client-side bottlenecks must be moved to the backend:

### 4.1 Critical Current Flaws
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

### 4.2 Features Currently Handled in Frontend that MUST Move to Backend
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

---

## 5. Current Data Persistence & Security Architecture

### Data Persistence
1. **Active Local Database:** `data/proxima_db.json`
   * **Atomic Writes:** All writes go to `.tmp` first, then atomically swapped with `fs.renameSync` to prevent corruption during server crashes.
   * **Rolling Disaster Snapshots:** Point-in-time backups saved automatically to `data/backups/proxima_backup_<timestamp>.json` (keeps the last 10 snapshots).
2. **Client-Side Offline Fallback:** Browser `localStorage` and `sessionStorage` fallback ensures seamless demonstrations even if the backend is temporarily offline.
3. **Production Relational DDL (MySQL 8.0+ / PostgreSQL 15+ PostGIS):** Relational schema with spatial indexes on WGS-84 coordinates (`SPATIAL INDEX` / `GiST` over `POINT SRID 4326`).

### Security Features
* **Rate-Limiting Defense:** 5 failed logins per `IP:loginId` triggers a 15-minute lockout returning HTTP `429`.
* **Timing-Safe Operations:** Password hash verification and HMAC signature checking use constant-time comparisons (`crypto.timingSafeEqual`).
* **Tenant Isolation:** Chapter Admins are cryptographically quarantined to their chapter; cross-chapter member mutation is rejected with `403 Forbidden`.
* **DPDP Act 2023 Compliance:** Unguessable 24-char hex access keys, no public search engine indexing, in-app privacy policy, and terms aligned with Indian data protection laws.

---

## 6. Repository Directory Layout

```text
.
├── backend/                        # Target FastAPI & PostgreSQL Backend (Poetry)
│   ├── pyproject.toml              # Poetry configuration and locked dependencies
│   ├── app.py                      # FastAPI ASGI application entrypoint
│   ├── auth/                       # Security, JWT, password hashing, dependencies
│   ├── api/                        # Route controllers (auth, chapters, members, licensing, users, payment, admin, health)
│   ├── service/                    # Class-based domain business logic
│   ├── models/                     # SQLAlchemy 2.0 ORM models (GeoAlchemy2)
│   ├── schemas/                    # Pydantic v2 schemas
│   ├── database/                   # database.py with engine, session, and generic CRUD
│   └── utils/                      # logger.py, crypto.py, distance.py, rate_limiter.py
├── data/                           # Local flat-file JSON database & disaster backups
│   ├── proxima_db.json             # Active JSON database state
│   └── backups/                    # Rolling snapshot backups (last 10 versions)
├── database/                       # Production MySQL 8.0+ relational definitions
│   ├── export_json_to_mysql.mjs    # Sync script to export JSON data to MySQL
│   ├── README.md                   # Database benchmarks and import guide
│   ├── schema.sql                  # Production DDL with spatial indexing
│   └── seeds.sql                   # Seed data for chapters and superadmin
├── docs/                           # DPDP Act 2023 legal documentation
│   ├── PRIVACY_POLICY.md           # Full legal privacy policy & data rights
│   └── TERMS_AND_CONDITIONS.md     # Terms of service and usage restrictions
├── public/                         # Static assets & SPA rewrite rules (_redirects, .htaccess)
├── scratch/                        # Self-contained audit and verification test suites
│   ├── test_brutal_audit.mjs       # Crypto, auth, tenant isolation, and map parser unit audit
│   ├── test_prod_backend.mjs       # Backend API integration test suite
│   └── test_legal_audit.mjs        # DPDP Act legal compliance verification
├── server/
│   └── server.mjs                  # Production Node.js API server (Active Backend)
├── src/                            # Production React 19 Frontend
│   ├── assets/                     # SVGs and branding assets
│   ├── components/                 # Domain-organized UI components (Map, Header, Admin, etc.)
│   ├── data/                       # Client datasets, licensing plans, and chapter registries
│   ├── services/                   # HTTP API adapters, security engine, viewer session tracker
│   ├── types/                      # TypeScript definitions (member.ts)
│   └── utils/                      # Distance calculations, Google Maps parser, geocoding
├── API_DOCUMENTATION.md            # Comprehensive REST API reference & payloads
├── MIGRATION_FASTAPI_POSTGRES.md   # Architectural migration plan to FastAPI + PostGIS
├── package.json                    # Node dependencies & project scripts
├── tsconfig.json                   # TypeScript configuration
└── vite.config.ts                  # Vite build configuration & API proxy setup
```

---

## 7. Building and Running the Current Stack

### Prerequisites
* Node.js `v20+` or `v22+`
* `npm`

### Running the Full Development Stack
To run both the backend API server and the Vite frontend with Hot Module Replacement:

```bash
# Terminal 1: Start Backend API server (runs on port 5051)
npm run server

# Terminal 2: Start Vite Frontend (runs on port 5173, proxies /api -> http://localhost:5051)
npm run dev
```

### Key Commands

| Task | Command | Description |
| :--- | :--- | :--- |
| **Start Frontend** | `npm run dev` | Starts Vite dev server (`http://localhost:5173`) |
| **Start Backend** | `npm run server` | Starts Node.js API server (`http://localhost:5051`) |
| **Build Frontend** | `npm run build` | Compiles TypeScript and builds production bundles into `./dist` |
| **Lint Codebase** | `npm run lint` | Runs `oxlint` against the project |
| **Preview Build** | `npm run preview` | Previews the compiled production build locally |

### Automated Testing & Auditing
Run the verification test suites in the `scratch/` directory:

```bash
# 1. Run core unit audit (Crypto, Auth, Tenant Isolation, Distance, Google Maps Parser)
node scratch/test_brutal_audit.mjs

# 2. Run backend API integration test (Ensure 'npm run server' is running in another terminal)
node scratch/test_prod_backend.mjs

# 3. Verify DPDP Act 2023 legal compliance rules
node scratch/test_legal_audit.mjs
```

---

## 8. Upcoming Backend Migration Reference

For the target **Python FastAPI + PostgreSQL (PostGIS)** architecture, clean 4-table minimal database schema, and step-by-step migration guide, refer to:
👉 **[MIGRATION_FASTAPI_POSTGRES.md](./MIGRATION_FASTAPI_POSTGRES.md)**

Once the migration is complete, this `README.md` will be updated with the Poetry and Uvicorn runtime commands.

---

## 9. License

PROXIMA by Yugam. All Rights Reserved. Distributed under terms defined in [TERMS_AND_CONDITIONS.md](./docs/TERMS_AND_CONDITIONS.md).
