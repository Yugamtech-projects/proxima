# Proxima Architecture & Production Readiness Gap Analysis

This document provides a technical breakdown of Proxima's monetization architecture, production readiness gaps, frontend-to-backend transition matrix, and an implementation checklist tracking completed work versus pending items.

---

## 1. Payment Model: Platform SaaS vs. Multi-Client Merchant

### 1.1 Is Payment Per-Client (Per-Chapter) or Platform-Wide?
* **Current Model: Single Platform SaaS Merchant.**
* Proxima operates as a **B2B SaaS Directory Platform**.
* The **Payee (Collector)** is always the **Platform Owner (Yugam / Master Super Admin)**.
* The **Payers (Subscribers)** are the **Chapter Creators / Chapter Administrators** purchasing or renewing their chapter directory licenses:
  * **Annual Chapter License:** ₹1,999 / 1 Year
  * **Semi-Annual License:** ₹1,194 / 6 Months
  * **VIP Pass / Complimentary:** ₹0 / 100% Team Credit
* **Conclusion:** Proxima does **NOT** need separate Razorpay merchant configurations per chapter. All license revenues flow into the platform owner's single Razorpay account.

### 1.2 When Would Multi-Merchant (Per-Chapter Gateway) Be Needed?
If Proxima expands its product scope in the future to allow chapters to collect **membership dues, meeting fees, or event ticket sales** directly from their own chapter members, each chapter would need its own sub-merchant account via **Razorpay Route** or direct API keys. For chapter licensing, a single platform gateway configuration is correct.

---

## 2. Production Readiness Audit: Issues & Gaps

The following issues outline areas of technical debt and production readiness:

| Issue | Current Architecture | Failure Scenario in Production | Production-Ready Target |
| :--- | :--- | :--- | :--- |
| **Brute-Force Rate Limiter** | RAM dictionary (`_failed_attempts` in `AuthService`) | 1. Memory leak from rotating botnet IPs.<br>2. Attackers bypass limit across workers. | **Redis** (with atomic TTL) or PostgreSQL `login_attempts` table. |
| **Webhook Processing** | Discards event payload after signature verification (`{"received": True}`) | If a customer's browser closes before redirect, payment is taken but license is never extended. | Process `payment.captured` event to asynchronously extend license in DB. |
| **Password Hashing** | Single-round unsalted SHA-256 (`hashlib.sha256`) | Vulnerable to GPU rainbow table cracking (>10 billion hashes/sec). | **Argon2id** (via `pwdlib[argon2]`) or **bcrypt**. |
| **CORS Configuration** | Wildcard `allow_origins=["*"]` | Any malicious website can initiate authenticated requests using user credentials. | Whitelist trusted origins: `https://proxima.network`. |
| **Database SSL Verification** | `ssl.CERT_NONE` and `check_hostname = False` | Vulnerable to Man-in-the-Middle (MITM) snooping on Supabase pooler traffic. | Validate Supabase root CA bundle with `ssl.CERT_REQUIRED`. |
| **Exception Leakage** | `str(exc)` returned on unhandled 500 errors | Exposes database table names, SQL syntax, and internal paths to attackers. | Return sanitized JSON (`{"detail": "Internal server error"}`). |

---

## 3. Frontend-to-Backend Transition Matrix

| Feature / Flow | Current Frontend Implementation | Backend Authority Target (Canonical REST Endpoint) |
| :--- | :--- | :--- |
| **Chapter Directory State** | Loaded from `localStorage` (`proxima_all_chapters_v3`) | `GET /api/chapters` (or by token via `GET /api/chapters/{chapter_id}`). |
| **Member Roster State** | Loaded from `localStorage` (`proxima_chapter_members_*`) | `GET /api/members/{chapter_id}`. |
| **Member Visibility Toggling** | Modified in client memory via `toggleMemberRenewalStatus()` | Authoritatively mutated via `PATCH /api/members/{member_id}` with `{"is_visible": bool, "membership_status": status}`. |
| **Member Add / Bulk Sync** | Client-generated ID in `AdminPortalModal.tsx` | `POST /api/members` (single member) or `POST /api/members/{chapter_id}` (atomic roster replace). |
| **Member Deletion** | Filtered in client array in `AdminPortalModal.tsx` | `DELETE /api/members/{member_id}`. |
| **Master Admin Chapter Provisioning** | Writes directly to client `localStorage` in `AdminPortalModal.tsx` L1155 | `POST /api/chapters` to provision chapter, admin user, and license atomically in DB. |
| **Chapter Admin Credentials** | Stored in `localStorage` (`proxima_chapter_admins_v7`) | Authenticated via `POST /api/auth/login` and managed via `GET & PATCH /api/users/{user_id}`. |
| **License Records & Invoices** | Read/written to `localStorage` (`proxima_chapter_license_*`) | `GET /api/licensing/{chapter_id}` and created/extended via `POST /api/licensing`. |
| **VIP Voucher Passes** | Read/written to `localStorage` (`proxima_vip_passes`) | `GET /api/vip-passes` and created via `POST /api/vip-passes`. |
| **Payment Orders (Create)** | Generated client-side | `POST /api/payment` with `{"chapter_id": str, "plan_key": str}`. |
| **Payment Verification (Confirm)** | Verified client-side | `PATCH /api/payment/{order_id}` with signature proof. |
| **Gateway Merchant Credentials** | Stored in `localStorage` (`proxima_custom_razorpay_key`) | `GET /api/payment/config` and updated via `POST /api/payment/config`. |

---

## 4. Implementation Checklist

### 4.1 Architecture, VIP Passes & Licensing (Completed)
- [x] **Dedicated VIP Passes PostgreSQL Table:** Created `server/models/vip_pass.py` (`"Proxima".vip_passes`) with token, label, max_uses, used_count, plan_days, and status.
- [x] **VIP Pass Service:** Created `server/service/vip_pass_service.py` (`VipPassService`) with full CRUD operations.
- [x] **Internal Function Reuse for Redemption:** `VipPassService.redeem_vip_pass` reuses `get_vip_passes` and `update_vip_pass` without duplicated SQL.
- [x] **Dedicated VIP Passes API Router:** Created `server/api/vip_pass.py` mounted at `/api/vip-passes` (`GET`, `POST`, `PATCH`, `DELETE`).
- [x] **Cleansed License Service & Router:** Stripped all VIP pass and voucher code out of `license_service.py` and `license.py`.
- [x] **Pure License CRUD:** Standardized `GET /api/licensing`, `POST /api/licensing`, `PATCH /api/licensing/{chapter_id}`, `DELETE /api/licensing/{chapter_id}`.
- [x] **Centralized Plan Enums & Titles:** Defined `LicensePlan`, `LicenseStatus`, and `LICENSE_PLAN_TITLES` in `server/schemas/license.py`.
- [x] **Parameter Standardization:** Standardized all route and service parameter names to `chapter_id`.

### 4.2 Payment REST CRUD & Unified Configuration (Completed)
- [x] **Pure REST CRUD for Payments:** Modeled orders and verification as standard REST resources in `server/service/payment_service.py` and `server/api/payment.py` (`POST /api/payment`, `PATCH /api/payment/{order_id}`, `GET /api/payment`, `DELETE /api/payment/{order_id}`).
- [x] **Eliminated `_orders_store`:** Removed unnecessary in-memory orders store; `get_payments` reads directly from license invoice history.
- [x] **Table-Free Payment Architecture:** Kept payment lightweight and stateless without creating an unnecessary payments DB table.
- [x] **Asynchronous Config Operations:** Made `get_effective_config()` and `update_payment_config()` fully async.
- [x] **Unified `RAZORPAY_KEY_ID`:** Whitelisted `RAZORPAY_` in `vite.config.ts` and updated `chapterLicensing.ts` so frontend and backend share the identical `.env` variable name.

### 4.3 Code Cleanliness, Naming & Case Normalization (Completed)
- [x] **Consistent Singular File Naming:** Standardized all domain files across `models/`, `schemas/`, `service/`, and `api/` (`chapter`, `member`, `user`, `license`, `vip_pass`).
- [x] **Removed Redirection Files & Aliases:** Deleted `licensing_service.py` and removed backward-compatibility aliases.
- [x] **Pure Backend `snake_case`:** Converted all backend response dictionaries to pure `snake_case` (`key_id`, `is_live`, `order_id`, `valid_until`, `uptime_seconds`, etc.).
- [x] **Universal Case Converter in Frontend:** Implemented unified `convertCase(data, 'camel' | 'snake')` in `src/services/proximaApi.ts`.
- [x] **Environment-Driven `API_BASE_URL`:** Configured `API_BASE_URL` in `src/services/proximaApi.ts` reading from `import.meta.env.API_BASE_URL` with localhost fallback.
- [x] **Service Section Banners:** Grouped `proximaApi.ts` into 7 clean, labeled service sections.
- [x] **Zero TypeScript Errors:** Verified with `npx tsc -b --noEmit` (0 errors).
- [x] **Zero Python Linter Errors:** Verified with `make lint` (0 errors).

### 4.4 Frontend State Migration to Backend DB Authority (Completed)
- [x] **Initial Map Chapter Loader:** Wired `App.tsx` and `proximaApi.ts` to fetch and synchronize active chapters by token from `GET /api/chapters/{chapter_id}`.
- [x] **Initial Member Roster Loader:** Wired `App.tsx` and `AdminPortalModal.tsx` to fetch live member rosters from `GET /api/members/{chapter_id}` on mount and chapter switch.
- [x] **Live License Loader:** Wired `AdminPortalModal.tsx` to fetch live license state from `GET /api/licensing/{chapter_id}` when viewing chapter licenses.
- [x] **Live Member Visibility Toggling:** Wired `AdminPortalModal.tsx` to dispatch `updateMemberOnServer` (`PATCH /api/members/{member_id}`) with authoritative `is_visible` and `membership_status` updates.
- [x] **Master Admin Chapter Provisioning:** Wired the "Provision New Chapter" button in `AdminPortalModal.tsx` to dispatch `POST /api/chapters` directly into PostgreSQL via `onboardChapterWithServer`.
- [x] **Live Merchant Credential Config:** Wired `AdminPortalModal.tsx` to fetch and update gateway credentials via `GET & POST /api/payment/config`.
- [x] **Live Spatial Radar & Trip Multiplier Wiring:** Wired `NearMeRadarModal.tsx` and `TripMultiplierModal.tsx` to execute backend PostGIS queries via `proximaApi.ts`.
- [x] **Server-Side CSV Streaming Importer:** Wired `BulkMemberImporterModal.tsx` to stream files directly to `POST /api/members/{chapter_id}/import`.
- [x] **Strict Server Auth Rejection Enforcement:** Fixed `AdminPortalModal.tsx` to immediately block access on HTTP 401/429 without falling back to client-side localStorage.

### 4.5 Production Hardening & Security (Completed)
- [x] **Password Hashing Upgrade:** Upgraded to adaptive Bcrypt (cost factor 12) with salted key stretching and transparent SHA-256 fallback in `server/auth/password.py`.
- [x] **Asynchronous Webhook Fulfillment:** Implemented idempotent license activation and invoice generation for `payment.captured` and `order.paid` events in `server/service/payment_service.py`.
- [x] **Rate Limiter Hardening:** Replaced in-memory dictionary `_failed_attempts` with PostgreSQL `auth_attempt_logs` table (15-minute sliding window) and integrated SlowAPI for network-level IP throttling.
- [x] **Database SSL Verification:** Configured Supabase root CA bundle (`supabase-ca.pem`) and enforced `ssl.CERT_REQUIRED` in `server/database/database.py`.
- [x] **CORS Domain Whitelist:** Locked `allow_origins` to authorized development and production origins (`proxima.network`) via `CORS_ORIGINS`.
- [x] **Sanitized 500 Error Handler:** Masked internal SQL/stack traces with unique reference ID tracking (`err_<hex>`) in `server/app.py`.
- [x] **PostGIS Spatial R-Tree Indexing:** Created native `geom GEOMETRY(Point, 4326)` column with GIST index in `server/models/member.py`.
- [x] **Hard Upper Bounds on Member Pagination:** Enforced pagination limits (default 100, max ceiling 500) in `server/service/member_service.py`.
- [x] **CSV Upload Size & MIME Protection:** Enforced 10MB file limit and MIME/extension filtering on `POST /api/members/{chapter_id}/import`.
- [x] **JWT Token Versioning & Instant Revocation:** Added `token_version INT DEFAULT 1` to `users` table and verified `payload["ver"] == user["token_version"]` in `auth/dependencies.py` with `UserService.revoke_user_tokens()` endpoint.
- [x] **Database Connection Pool Hardening:** Configured `pool_size=10`, `max_overflow=20`, `pool_pre_ping=True`, and `pool_recycle=300` in `database.py`.
- [x] **Admin Password Synchronization:** Wired `AdminPortalModal.tsx` to update passwords and profiles in PostgreSQL via `PATCH /api/users/{user_id}`.
- [x] **Google Maps Shortlink Expander:** Implemented `POST /api/geocoding/expand-maps-url` with server-side redirect following in `geocoding_service.py` to bypass browser CORS blocks.
- [x] **Isolated Mock Member Demo Fallback:** Ensured real user chapters never display hardcoded Chennai demo members on empty state.

---

## 5. Frontend Features Handled in the Frontend That Must Move to the Backend

Currently, several operations are processed in the user's browser that should be server-authoritative in PostgreSQL:

### 5.1 Member Referral & ROI Interaction Tracking
* **Current State:** `src/services/viewerIdentity.ts` writes WhatsApp clicks, phone calls, and 1-to-1 requests to the visitor's browser `localStorage` (`proxima_interaction_history_*`).
* **Why this is a problem:** If a visitor uses their phone to click "WhatsApp" on 10 members, the data stays on their device. Chapter Admins have zero visibility into whether Proxima is generating business for their members. If the user clears browser data, the metrics vanish.
* **The Backend Solution:**
  * Create table `"Proxima".member_interactions` (`id`, `chapter_id`, `member_id`, `interaction_type`, `created_at`).
  * Endpoint: `POST /api/analytics/interaction`.
  * Chapter Admin ROI Stat: Displays: *"In the last 30 days, your chapter map generated 184 WhatsApp intros and 42 one-to-one bookings."*

### 5.2 Third-Party Address Geocoding
* **Current State:** `src/utils/geocoding.ts` queries OpenStreetMap Nominatim directly from the client browser.
* **Why this is a problem:** Nominatim has strict rate limits (maximum 1 request/second per IP) and blocks web browsers that do not supply a specific server `User-Agent`. When multiple users search locations simultaneously, OpenStreetMap returns HTTP 429 Too Many Requests or blocks the client's IP.
* **The Backend Solution:**
  * Endpoint: `POST /api/geocoding/resolve` with body `{"query": "Anna Nagar, Chennai"}`.
  * Create table `"Proxima".geocoding_cache` (`query_hash`, `latitude`, `longitude`, `display_name`).
  * If a query has been searched before, PostgreSQL returns it in 1ms with zero third-party API calls.

### 5.3 Google Maps Short URL Expander (Completed)
* **Current State:** `src/utils/googleMapsParser.ts` attempted to resolve shortened Google Maps links (`https://maps.app.goo.gl/...`) on the client.
* **Why this was a problem:** Browsers block following cross-origin redirects from Google Maps due to CORS restrictions. The client regex often failed to extract GPS coordinates from shortened URLs.
* **The Backend Solution (Completed):**
  * The backend follows HTTP 301/302 redirects server-side via `httpx.get(url, follow_redirects=True)` without CORS limitations, parses coordinates (`@lat,lng`, `!3dlat!4dlng`, `?q=lat,lng`), and returns exact lat/lng floats via `POST /api/geocoding/expand-maps-url`.

### 5.4 Security Incident Tamper Ledger
* **Current State:** `src/services/securityEngine.ts` stores security incidents (frameguard blocks, XSS sanitization events, invalid token probes) in a client JavaScript array in memory (`tamperLedger = []`).
* **Why this is a problem:** As soon as an attacker closes their tab or runs `localStorage.clear()`, all evidence of their attack disappears.
* **The Backend Solution:**
  * Endpoint: `POST /api/security/tamper-log`.
  * Persist incidents to `"Proxima".security_tamper_logs` for analysis in the Super Admin Security Analytics tab.

---

## 6. Other Production Architecture Issues Present

*(Excluding Razorpay credentials)*

### 6.1 Hardcoded Demo Fallback Members in Client JavaScript Bundles (Completed)
* **The Issue:** `src/data/mockMembers.ts` contains hardcoded mock member records bundled directly into the compiled JavaScript files.
* **The Impact:** When a real chapter loads, if the database returns an empty roster, the app fell back to displaying hardcoded mock members from Chennai.
* **The Fix (Completed):** Isolated demo fallbacks strictly to explicit demo chapters (`chap-titans`, `organizationType === 'Executive Demo'`). Real user chapters now display clean empty states or their true database roster.

### 6.2 Multi-Worker Drift for Dynamic Gateway Credentials
* **The Issue:** In `server/service/payment_service.py`, custom merchant credentials configured via `POST /api/payment/config` are stored in a Python class variable (`cls._custom_key_id`, `cls._custom_key_secret`).
* **The Impact:** If Uvicorn runs with multiple worker processes (`uvicorn --workers 4`), memory is not shared between processes. Worker #1 gets the new key, while Workers #2, #3, and #4 continue using the old key, causing random `400 Signature verification failed` errors.
* **Production Fix:** Create a 1-row table `"Proxima".payment_configs` in PostgreSQL so all Uvicorn worker processes read from the same source.

### 6.3 Missing Structured Audit Logging on Member Roster Mutations
* **The Issue:** When a Chapter Admin edits a member's phone number or deletes a member, the backend updates the row in `members`, but does not record who made the change or what the previous value was.
* **The Impact:** Under India's **DPDP Act (Digital Personal Data Protection Act, 2023)**, business directories handling personal phone numbers and emails must maintain an audit trail of data modifications.
* **Production Fix:** Create an `audit_member_mutations` table that logs: `(timestamp, actor_email, member_id, field_changed, old_value, new_value)`.

### 6.4 Member Avatar Hotlinking Vulnerability
* **The Issue:** Members paste raw external URLs into `photo_url` (from LinkedIn, personal blogs, or Google Drive).
* **The Impact:**
  1. If the external site removes the image, the member's profile shows a broken image icon.
  2. Many sites (like LinkedIn) block hotlinking via HTTP referer checks.
  3. A member pasting a 15MB uncompressed image causes the map to stutter when rendering.
* **Production Fix (100% Free):** Use local disk + Python `Pillow` WebP solution (`POST /api/members/{member_id}/avatar`) to compress images down to 256x256 WebP files (~18KB) and serve them locally from `data/uploads/avatars/` with zero external service fees.
