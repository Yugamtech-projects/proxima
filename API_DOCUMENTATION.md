# Proxima API Documentation

This document provides complete, production-grade technical documentation for the Proxima REST API.

---

## 1. Overview & Conventions

* **Base URL:** `http://localhost:5051/api` (Production: `https://proxima.network/api`)
* **Data Format:** All requests and responses use `Content-Type: application/json`.
* **Coordinate Standard:** All geospatial GeoJSON coordinates follow the strict `[Longitude, Latitude]` (WGS-84 / EPSG:4326) standard.
* **Authentication Scheme:** HTTP Bearer token via the standard header:
  ```http
  Authorization: Bearer <jwt_access_token>
  ```
* **Security Lockout Defense:** A sliding-window rate limiter locks out any IP or login identifier for 15 minutes after 5 consecutive failed login attempts.

---

## 2. Standard Error Response Format

All error responses return a standardized JSON structure with appropriate HTTP status codes:

```json
{
  "error": "Human-readable description of error",
  "detail": "Optional technical explanation or field-level validation errors",
  "status_code": 401
}
```

| HTTP Status | Meaning |
| :--- | :--- |
| `200 OK` | Request succeeded |
| `201 Created` | Resource created successfully |
| `400 Bad Request` | Invalid payload or missing parameters |
| `401 Unauthorized` | Missing or invalid authentication token |
| `403 Forbidden` | Insufficient permissions or tenant cross-contamination attempt |
| `404 Not Found` | Requested resource does not exist |
| `429 Too Many Requests` | Rate limit or security lockout active (5 failed attempts) |
| `500 Internal Error` | Unexpected server error |

---

## 3. Modular API Endpoints

The API is organized into domain-driven modules:
1. **System & Telemetry:** `/api/health`
2. **Authentication:** `/api/auth`
3. **Chapters & Onboarding:** `/api/chapters`
4. **Members & Spatial Radar:** `/api/members`
5. **Licensing & VIP Passes:** `/api/licensing`
6. **User Administration:** `/api/users`
7. **Payment & Razorpay:** `/api/payment`
8. **SuperAdmin Analytics & Dashboard:** `/api/admin`

---

### 3.1 System & Telemetry (`/api/health`)

#### `GET /api/health`
Returns system health, uptime, active database connection status, and telemetry.

* **Authentication:** Public
* **Response (200 OK):**
```json
{
  "status": "HEALTHY",
  "uptime_seconds": 14205,
  "timestamp": "2026-11-21T10:30:00.000Z",
  "chapters_count": 12,
  "database": "PostgreSQL 16 (PostGIS 3.4)",
  "version": "1.0.0"
}
```

---

### 3.2 Authentication (`/api/auth`)

#### `POST /api/auth/login`
Authenticates Master Super Admin or Chapter Admin credentials and issues a stateless JWT Bearer token.

* **Authentication:** Public (Rate-limited: 5 failed attempts = 15-minute lockout)
* **Request Body:**
```json
{
  "login_id": "titans.admin@proxima.network",
  "password": "Titans@Proxima2026!"
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "session": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "role": "CHAPTER_ADMIN",
    "email": "titans.admin@proxima.network",
    "name": "Chennai - Demo Admin",
    "chapter": {
      "id": "chap-titans",
      "slug": "chennai-demo",
      "name": "Chennai - Demo",
      "access_key": "px_7b9f3e1a8d4c205e81d6f03a"
    },
    "expires_at": 1795324800
  }
}
```

#### `GET /api/auth/me`
Retrieves current authenticated admin profile and chapter assignment context.

* **Authentication:** Required (`Bearer <token>`)
* **Response (200 OK):**
```json
{
  "id": "admin-titans",
  "email": "titans.admin@proxima.network",
  "name": "Chennai - Demo Admin",
  "role": "CHAPTER_ADMIN",
  "chapter_id": "chap-titans"
}
```

---

### 3.3 Chapters & Onboarding (`/api/chapters`)

#### `GET /api/chapters`
Returns a list of all active chapters in the network.

* **Authentication:** Public
* **Response (200 OK):**
```json
[
  {
    "id": "chap-titans",
    "slug": "chennai-demo",
    "access_key": "px_7b9f3e1a8d4c205e81d6f03a",
    "name": "Chennai - Demo",
    "city": "Chennai",
    "region": "Tamil Nadu",
    "organization_type": "Executive Demo",
    "center_coordinates": [80.2155, 13.0878],
    "default_zoom": 12.5,
    "status": "ACTIVE"
  }
]
```

#### `GET /api/chapters/{chapter_id_or_token}`
Retrieves details for a single chapter by its ID or unguessable access key (`px_<hex>`).

* **Authentication:** Public
* **Response (200 OK):**
```json
{
  "id": "chap-titans",
  "slug": "chennai-demo",
  "access_key": "px_7b9f3e1a8d4c205e81d6f03a",
  "name": "Chennai - Demo",
  "city": "Chennai",
  "region": "Tamil Nadu",
  "organization_type": "Executive Demo",
  "center_coordinates": [80.2155, 13.0878],
  "default_zoom": 12.5,
  "status": "ACTIVE"
}
```

#### `POST /api/chapters/onboard`
Self-serve chapter onboarding with instant Razorpay payment or VIP Pass token redemption.

* **Authentication:** Public
* **Request Body:**
```json
{
  "chapter_name": "Coimbatore Pioneers",
  "city": "Coimbatore",
  "admin_login_id": "pioneers.admin",
  "admin_password": "PioneersPassword2026!",
  "organization_type": "BNI Chapter",
  "plan_key": "ANNUAL",
  "razorpay_order_id": "order_Lkd921kdja9",
  "razorpay_payment_id": "pay_Lkd923j491",
  "razorpay_signature": "e2f1a8c9b4...",
  "vip_token": null
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "chapter": {
    "id": "chap-m1k9x2",
    "slug": "coimbatore-pioneers",
    "name": "Coimbatore Pioneers",
    "access_key": "px_9f8e7d6c5b4a312019283746",
    "status": "ACTIVE"
  },
  "admin": {
    "email": "pioneers.admin@proxima.network",
    "login_id": "pioneers.admin"
  },
  "license": {
    "status": "ACTIVE",
    "valid_until": "2027-11-21T00:00:00.000Z",
    "plan": "Annual Chapter License (₹1,999 / 1 Year)"
  }
}
```

#### `PUT /api/chapters/{chapter_id}`
Updates chapter configuration (meeting hub coordinates, zoom, organization type).

* **Authentication:** Chapter Admin of `{chapter_id}` or Master Admin (`Bearer <token>`)

---

### 3.4 Members & Spatial Radar (`/api/members`)

#### `GET /api/members/{chapter_id}`
Returns all members of a chapter. For public calls, only active renewed members (`is_visible: true`) are returned. When called by the authenticated Chapter Admin, all members including non-renewed members are returned for administrative roster management.

* **Authentication:** Optional (Enriched data with authentication)
* **Response (200 OK):**
```json
{
  "chapter_id": "chap-titans",
  "members": [
    {
      "id": "mem-01",
      "name": "Rajesh Kannan",
      "company": "Apex IT Solutions",
      "category": "IT Solutions",
      "category_id": "tech",
      "category_icon": "Laptop",
      "short_bio": "Enterprise Cloud Architecture & Cybersecurity",
      "phone": "+91 98400 12345",
      "whatsapp": "+91 98400 12345",
      "email": "rajesh@apextech.in",
      "website": "https://apextech.in",
      "location": {
        "address": "42, 2nd Avenue, Anna Nagar",
        "area": "Anna Nagar",
        "city": "Chennai",
        "pincode": "600040",
        "latitude": 13.08784,
        "longitude": 80.21548,
        "location_status": "VERIFIED"
      },
      "one_to_one_availability": "AVAILABLE",
      "referral_requirements": "Looking for introductions to manufacturing CFOs",
      "tags": ["Cloud", "AWS", "Security"],
      "membership_status": "RENEWED",
      "is_visible": true
    }
  ]
}
```

#### `POST /api/members/{chapter_id}`
Saves and syncs a chapter roster. Strict tenant boundary enforcement prevents Chapter Admins from modifying rosters of chapters other than their own. Master Admin is blocked from mutating member rosters directly.

* **Authentication:** Chapter Admin of `{chapter_id}` (`Bearer <token>`)
* **Response (200 OK):**
```json
{
  "success": true,
  "count": 28
}
```

#### `POST /api/members/{chapter_id}/near-me`
Performs an optimized geospatial PostGIS query using `ST_DWithin` and `ST_DistanceSphere` around a given GPS point or searched place coordinate.

* **Authentication:** Public
* **Request Body:**
```json
{
  "latitude": 13.0850,
  "longitude": 80.2100,
  "radius_km": 5,
  "category_id": null
}
```
* **Response (200 OK):**
```json
{
  "query_point": [80.2100, 13.0850],
  "radius_km": 5,
  "count": 4,
  "members": [
    {
      "id": "mem-01",
      "name": "Rajesh Kannan",
      "distance_km": 0.68,
      "location": {
        "latitude": 13.08784,
        "longitude": 80.21548
      }
    }
  ]
}
```

#### `POST /api/members/{chapter_id}/bulk-import`
Ingests bulk CSV or spreadsheet member data with server-side validation and transactional batch insertion.

* **Authentication:** Chapter Admin of `{chapter_id}` (`Bearer <token>`)

---

### 3.5 Licensing & VIP Passes (`/api/licensing`)

#### `GET /api/licensing/plans`
Lists available licensing plans (Semi-Annual, Annual, Enterprise).

* **Authentication:** Public

#### `GET /api/licensing/{chapter_id}`
Returns active license validity, auto-renewal flag, and historical invoice receipts.

* **Authentication:** Public / Chapter Admin
* **Response (200 OK):**
```json
{
  "chapter_id": "chap-titans",
  "status": "ACTIVE",
  "plan": "Annual Chapter License (₹1,999 / 1 Year)",
  "price_inr": 1999,
  "valid_until": "2027-11-21T10:30:00.000Z",
  "auto_renew": false,
  "invoices": [
    {
      "id": "inv_k9x21a",
      "date": "Nov 21, 2026",
      "amount": 1999,
      "plan": "Annual Chapter License (1 Year)",
      "payment_id": "pay_Nk8a923k1",
      "status": "PAID"
    }
  ]
}
```

#### `POST /api/licensing/grant-free`
Grants a 100% complimentary license extension directly to an existing chapter.

* **Authentication:** Master Admin only (`Bearer <token>`)
* **Request Body:**
```json
{
  "chapter_id": "chap-titans",
  "reason": "Executive VIP Review Grant",
  "duration_days": 365
}
```

#### `GET /api/licensing/vip-passes`
Lists all generated VIP Free Chapter Passes.

* **Authentication:** Master Admin only (`Bearer <token>`)

#### `POST /api/licensing/vip-passes`
Generates a new complimentary VIP Chapter Onboarding token.

* **Authentication:** Master Admin only (`Bearer <token>`)
* **Request Body:**
```json
{
  "label": "BNI Leadership Grant",
  "max_uses": 1,
  "plan_days": 365
}
```

---

### 3.6 User Administration (`/api/users`)

#### `GET /api/users`
Lists all administrative users across chapters with their roles, email addresses, and active statuses.

* **Authentication:** Master Admin only (`Bearer <token>`)
* **Response (200 OK):**
```json
[
  {
    "id": "admin-titans",
    "chapter_id": "chap-titans",
    "email": "titans.admin@proxima.network",
    "name": "Chennai - Demo Admin",
    "role": "CHAPTER_ADMIN",
    "is_active": true,
    "last_login_at": "2026-11-21T08:15:00.000Z"
  }
]
```

#### `POST /api/users`
Creates or invites a new Chapter Admin assigned to a specific chapter.

* **Authentication:** Master Admin only (`Bearer <token>`)
* **Request Body:**
```json
{
  "chapter_id": "chap-titans",
  "email": "new.admin@proxima.network",
  "name": "New Chapter Admin",
  "password": "SecurePassword2026!",
  "role": "CHAPTER_ADMIN"
}
```

#### `PUT /api/users/{user_id}`
Updates user details, active status, or resets password hash.

* **Authentication:** Master Admin or Self (`Bearer <token>`)

#### `DELETE /api/users/{user_id}`
Deactivates or deletes an administrative user.

* **Authentication:** Master Admin only (`Bearer <token>`)

---

### 3.7 Payment & Razorpay (`/api/payment`)

#### `GET /api/payment/config`
Returns active Razorpay public configuration (merchant Key ID and mode status).

* **Authentication:** Public
* **Response (200 OK):**
```json
{
  "key_id": "rzp_live_xK91a8dk1",
  "is_live": true,
  "is_configured": true
}
```

#### `POST /api/payment/config`
Updates dynamic merchant Razorpay credentials.

* **Authentication:** Master Admin only (`Bearer <token>`)
* **Request Body:**
```json
{
  "key_id": "rzp_live_xK91a8dk1",
  "key_secret": "LiveSecretKey9102",
  "webhook_secret": "LiveWebhookSecret2026"
}
```

#### `POST /api/payment/create-order`
Creates a server-authoritative Razorpay Order with an HMAC-signed hash to prevent client-side price tampering.

* **Authentication:** Public
* **Request Body:**
```json
{
  "chapter_id": "chap-titans",
  "plan_key": "ANNUAL"
}
```
* **Response (200 OK):**
```json
{
  "order_id": "order_Nk8a91kdja",
  "amount": 199900,
  "currency": "INR",
  "key_id": "rzp_test_ProximaDemo2026",
  "plan": "Annual Chapter License",
  "duration": "1 Year",
  "server_signature": "8a7b6c5d4e...",
  "is_live_order": false,
  "is_configured": true
}
```

#### `POST /api/payment/verify`
Cryptographically verifies Razorpay payment signatures (`HMAC_SHA256(order_id + "|" + payment_id, secret)`) in constant time, extends chapter license validity, and stores the invoice.

* **Authentication:** Public
* **Request Body:**
```json
{
  "chapter_id": "chap-titans",
  "plan_key": "ANNUAL",
  "razorpay_order_id": "order_Nk8a91kdja",
  "razorpay_payment_id": "pay_Nk8a923k1",
  "razorpay_signature": "f2e1d0c9b8a7..."
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "license": {
    "chapter_id": "chap-titans",
    "status": "ACTIVE",
    "plan": "Annual Chapter License (₹1,999 / 1 Year)",
    "price_inr": 1999,
    "valid_until": "2027-11-21T10:30:00.000Z",
    "last_payment_date": "2026-11-21T10:30:00.000Z",
    "last_payment_id": "pay_Nk8a923k1"
  },
  "invoice": {
    "id": "inv_k9x21a",
    "date": "Nov 21, 2026",
    "amount": 1999,
    "plan": "Annual Chapter License (1 Year)",
    "status": "PAID"
  }
}
```

#### `POST /api/payment/webhook`
Consumes automated Razorpay webhook events (`payment.captured`, `order.paid`) with mandatory HMAC SHA-256 signature validation against the `X-Razorpay-Signature` header.

* **Headers:**
  ```http
  X-Razorpay-Signature: <hex_digest>
  ```
* **Response (200 OK):**
```json
{
  "received": true
}
```

---

### 3.8 SuperAdmin Dashboard & Analytics (`/api/admin`)

#### `GET /api/admin/dashboard`
Aggregates network-wide business analytics and platform telemetry for the SuperAdmin portal.

* **Authentication:** Master Admin only (`Bearer <token>`)
* **Response (200 OK):**
```json
{
  "total_chapters": 42,
  "active_chapters": 38,
  "total_members": 1280,
  "verified_locations_rate": 0.94,
  "mrr_inr": 72500,
  "annual_revenue_inr": 870000,
  "expiring_soon_count": 3
}
```

#### `GET /api/admin/analytics/growth`
Returns monthly chapter onboarding rates, renewal percentages, and geospatial distribution.

* **Authentication:** Master Admin only (`Bearer <token>`)
* **Response (200 OK):**
```json
{
  "monthly_growth": [
    { "month": "2026-09", "new_chapters": 6, "renewals": 12 },
    { "month": "2026-10", "new_chapters": 8, "renewals": 15 },
    { "month": "2026-11", "new_chapters": 11, "renewals": 19 }
  ],
  "renewal_rate_percentage": 91.5
}
```

#### `GET /api/admin/audit-logs`
Streams the append-only administrative audit log (e.g. member mutations, license renewals, VIP grants).

* **Authentication:** Master Admin only (`Bearer <token>`)
* **Query Parameters:** `?limit=50&offset=0&chapter_id=chap-titans`
* **Response (200 OK):**
```json
[
  {
    "action": "MEMBERS_UPDATED",
    "actor": "titans.admin@proxima.network",
    "chapter_id": "chap-titans",
    "member_count": 32,
    "timestamp": "2026-11-21T09:45:00.000Z"
  }
]
```
