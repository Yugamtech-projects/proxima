/**
 * PROXIMA by Yugam - Production API Service Adapter
 * 
 * Provides transparent communication with the production backend API (/api)
 * while maintaining graceful offline fallbacks and automated case conversion.
 */

import type { ChapterLicense, Member } from '../types/member'
import type { RenewalPlanKey } from '../data/chapterLicensing'

// ============================================================================
// CORE CONFIGURATION & AUTHENTICATION HEADERS
// ============================================================================

export const API_BASE_URL =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    (import.meta.env.API_BASE_URL || import.meta.env.VITE_API_BASE_URL)) ||
  (typeof window !== 'undefined' ? '' : 'http://localhost:5051')

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem('proxima_admin_session') || localStorage.getItem('proxima_admin_session')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.token) {
        return { Authorization: `Bearer ${parsed.token}` }
      }
    }
  } catch {}
  return {}
}

/**
 * Automatically purges revoked/expired session tokens and notifies UI components.
 */
export function handleUnauthorizedResponse() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('proxima_admin_session')
    localStorage.removeItem('proxima_admin_session')
    sessionStorage.removeItem('proxima_active_token')
    window.dispatchEvent(new CustomEvent('proxima:auth-expired'))
  }
}

/**
 * Validates if the current session token is active and valid on the backend.
 */
export async function verifyCurrentSessionOnServer(): Promise<boolean> {
  const headers = getAuthHeaders()
  if (!headers.Authorization) return false
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...headers,
      },
      signal: AbortSignal.timeout(3000),
    })
    if (res.status === 401) {
      handleUnauthorizedResponse()
      return false
    }
    return res.ok
  } catch {
    return false
  }
}

// ============================================================================
// UNIVERSAL CASE CONVERSION UTILITY (Single unified function)
// ============================================================================

/**
 * Recursively transforms object keys between snake_case and camelCase in a single function.
 */
export function convertCase<T = any>(data: any, target: 'camel' | 'snake' = 'camel'): T {
  if (data === null || data === undefined || typeof data !== 'object') {
    return data
  }
  if (Array.isArray(data)) {
    return data.map((item) => convertCase(item, target)) as unknown as T
  }
  const result: Record<string, any> = {}
  for (const key of Object.keys(data)) {
    const transformedKey =
      target === 'camel'
        ? key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase())
        : key.replace(/([A-Z])/g, '_$1').toLowerCase()
    result[transformedKey] = convertCase(data[key], target)
  }
  return result as T
}

// ============================================================================
// TYPE DEFINITIONS & CONTRACTS
// ============================================================================

export interface ServerAuthResponse {
  success: boolean
  session?: {
    token: string
    role: 'MASTER_ADMIN' | 'CHAPTER_ADMIN'
    email: string
    name: string
    chapter: any
    expiresAt: number
  }
  error?: string
}

export interface ServerOrderResponse {
  orderId: string
  amount: number
  currency: string
  keyId: string
  plan: string
  duration: string
  serverSignature?: string
  isLiveOrder?: boolean
  isConfigured?: boolean
}

export interface ServerVerifyResponse {
  success: boolean
  license?: ChapterLicense
  error?: string
}

export interface VipPass {
  id: string
  token: string
  label: string
  maxUses: number
  usedCount: number
  planDays: number
  createdAt: string
}

// ============================================================================
// SECTION 1: HEALTH & OBSERVABILITY APIs
// ============================================================================

/**
 * Checks if the production backend server is reachable.
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(2500),
    })
    return res.ok
  } catch {
    return false
  }
}

// ============================================================================
// SECTION 2: AUTHENTICATION & RBAC SESSION APIs
// ============================================================================

/**
 * Authenticates credentials against the backend API server.
 */
export async function loginWithServer(loginId: string, passwordPlain: string): Promise<ServerAuthResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(convertCase({ loginId, password: passwordPlain }, 'snake')),
      signal: AbortSignal.timeout(10000),
    })
    let data: any = {}
    try {
      data = await res.json()
    } catch {
      data = { detail: `Backend returned HTTP ${res.status}. Please check server logs.` }
    }

    if (res.ok) {
      return convertCase<ServerAuthResponse>(data, 'camel')
    }
    return {
      success: false,
      error: data.detail || 'Invalid credentials. Access denied.',
    }
  } catch (err) {
    console.warn('[Proxima API] Server login unreachable. Falling back to client authentication.', err)
  }
  return null
}

/**
 * Updates an administrative user's email or password in PostgreSQL.
 */
export async function updateAdminUserOnServer(
  userId: string,
  payload: { email?: string; password?: string; name?: string }
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(convertCase(payload, 'snake')),
      signal: AbortSignal.timeout(6000),
    })
    if (res.status === 401) {
      handleUnauthorizedResponse()
      return false
    }
    return res.ok
  } catch (err) {
    console.warn('[Proxima API] Failed updating user on server:', err)
  }
  return false
}

// ============================================================================
// SECTION 3: CHAPTER REGISTRY & ONBOARDING APIs
// ============================================================================

/**
 * Onboards a new chapter self-serve (via payment or VIP free token).
 */
export async function onboardChapterWithServer(payload: {
  chapterName: string
  city: string
  adminLoginId: string
  adminPassword: string
  organizationType?: string
  planKey?: RenewalPlanKey
  razorpayOrderId?: string
  razorpayPaymentId?: string
  razorpaySignature?: string
  vipToken?: string
}): Promise<{
  success: boolean
  chapter?: any
  admin?: any
  license?: ChapterLicense
  isComplimentary?: boolean
  error?: string
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/chapters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(convertCase(payload, 'snake')),
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json()
    return convertCase(data, 'camel')
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error during onboarding.',
    }
  }
}

/**
 * Fetches all registered chapters from backend PostgreSQL.
 */
export async function fetchChaptersFromServer(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/chapters`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) {
      const data = await res.json()
      return convertCase(data, 'camel')
    }
  } catch (err) {
    console.warn('[Proxima API] Failed reading chapters from server:', err)
  }
  return []
}

/**
 * Fetches a chapter by ID, slug, or access token.
 */
export async function fetchChapterByTokenFromServer(token: string): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/chapters/${token}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) {
      const data = await res.json()
      return convertCase(data, 'camel')
    }
  } catch (err) {
    console.warn('[Proxima API] Failed fetching chapter by token:', err)
  }
  return null
}

// ============================================================================
// SECTION 4: MEMBER ROSTER SYNCHRONIZATION APIs
// ============================================================================

/**
 * Fetches member roster for a specific chapter from backend PostgreSQL.
 */
export async function fetchMembersFromServer(chapterId: string): Promise<Member[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/members/${chapterId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...getAuthHeaders(),
      },
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) {
      const data = await res.json()
      const list = data.members || (Array.isArray(data) ? data : [])
      return convertCase<Member[]>(list, 'camel')
    }
  } catch (err) {
    console.warn('[Proxima API] Failed reading members from server:', err)
  }
  return []
}

/**
 * Updates an individual member record or toggles renewal visibility on backend.
 */
export async function updateMemberOnServer(memberId: string, payload: Partial<Member>): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/members/${memberId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(convertCase(payload, 'snake')),
      signal: AbortSignal.timeout(4000),
    })
    if (res.status === 401) {
      handleUnauthorizedResponse()
      return false
    }
    return res.ok
  } catch (err) {
    console.warn('[Proxima API] Failed updating member on server:', err)
  }
  return false
}

/**
 * Executes a server-side proximity radar search using PostgreSQL Haversine spatial math.
 */
export async function fetchNearbyRadarMembers(params: {
  latitude: number
  longitude: number
  radiusKm?: number
  chapterId?: string
}): Promise<{
  centerLatitude: number
  centerLongitude: number
  radiusKm: number
  totalFound: number
  members: (Member & { distanceKm: number })[]
} | null> {
  try {
    const qs = new URLSearchParams({
      latitude: params.latitude.toString(),
      longitude: params.longitude.toString(),
      radius_km: (params.radiusKm || 5.0).toString(),
    })
    if (params.chapterId) {
      qs.set('chapter_id', params.chapterId)
    }
    const res = await fetch(`${API_BASE_URL}/api/spatial/radar?${qs.toString()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) {
      const data = await res.json()
      return convertCase(data, 'camel')
    }
  } catch (err) {
    console.warn('[Proxima API] Failed radar query on server:', err)
  }
  return null
}

/**
 * Calculates 1-to-1 en-route networking detour opportunities along a travel path in SQL.
 */
export async function fetchTripMultiplierOpportunities(params: {
  originLat: number
  originLng: number
  destLat: number
  destLng: number
  maxDetourKm?: number
  chapterId?: string
}): Promise<{
  originLatitude: number
  originLongitude: number
  destinationLatitude: number
  destinationLongitude: number
  directDistanceKm: number
  maxDetourKm: number
  totalOpportunities: number
  members: (Member & { detourKm: number; distanceFromOriginKm: number; distanceToDestKm: number })[]
} | null> {
  try {
    const qs = new URLSearchParams({
      origin_lat: params.originLat.toString(),
      origin_lng: params.originLng.toString(),
      dest_lat: params.destLat.toString(),
      dest_lng: params.destLng.toString(),
      max_detour_km: (params.maxDetourKm || 5.0).toString(),
    })
    if (params.chapterId) {
      qs.set('chapter_id', params.chapterId)
    }
    const res = await fetch(`${API_BASE_URL}/api/spatial/trip-multiplier?${qs.toString()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      const data = await res.json()
      return convertCase(data, 'camel')
    }
  } catch (err) {
    console.warn('[Proxima API] Failed trip multiplier query on server:', err)
  }
  return null
}

/**
 * Expands shortened Google Maps URLs server-side and extracts geographic coordinates without CORS issues.
 */
export async function expandGoogleMapsUrlOnServer(url: string): Promise<{
  success: boolean
  latitude?: number
  longitude?: number
  extractedName?: string
  resolvedUrl?: string
  error?: string
} | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/spatial/expand-maps-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(convertCase({ url }, 'snake')),
      signal: AbortSignal.timeout(9000),
    })
    if (res.ok) {
      const data = await res.json()
      return convertCase(data, 'camel')
    }
  } catch (err) {
    console.warn('[Proxima API] Failed expanding Google Maps URL on server:', err)
  }
  return null
}

/**
 * Syncs member roster to server database.
 */
export async function syncMembersToServer(chapterId: string, members: Member[]): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/members/${chapterId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ members, version: Date.now() }),
      signal: AbortSignal.timeout(4000),
    })
    if (res.status === 401) {
      handleUnauthorizedResponse()
      return false
    }
    return res.ok
  } catch {
    return false
  }
}

/**
 * Streams and bulk-imports a member roster CSV file on backend PostgreSQL.
 */
export async function importMemberRosterCsvOnServer(
  chapterId: string,
  file: File
): Promise<{ success: boolean; importedCount: number; skippedCount: number; errors?: string[] } | null> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${API_BASE_URL}/api/members/${chapterId}/import`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
      },
      body: formData,
      signal: AbortSignal.timeout(25000),
    })
    if (res.status === 401) {
      handleUnauthorizedResponse()
      return null
    }
    if (res.ok) {
      const data = await res.json()
      return convertCase(data, 'camel')
    }
  } catch (err) {
    console.warn('[Proxima API] Failed streaming CSV roster to server:', err)
  }
  return null
}

// ============================================================================
// SECTION 5: LICENSING & COMPLIMENTARY GRANTS APIs
// ============================================================================

/**
 * Fetches active license details for a chapter from backend PostgreSQL.
 */
export async function fetchLicenseFromServer(chapterId: string): Promise<ChapterLicense | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/licensing/${chapterId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...getAuthHeaders(),
      },
      signal: AbortSignal.timeout(4000),
    })
    if (res.status === 401) {
      handleUnauthorizedResponse()
      return null
    }
    if (res.ok) {
      const d = await res.json()
      const lic = convertCase<any>(d, 'camel')
      return {
        chapterId: lic.chapterId || chapterId,
        status: lic.status === 'EXPIRED' ? 'EXPIRED' : lic.status === 'TRIAL' ? 'TRIAL' : 'ACTIVE',
        plan: lic.plan,
        priceInr: Number(lic.priceInr ?? 0),
        validUntil: lic.validUntil,
        autoRenew: Boolean(lic.autoRenew ?? false),
        lastPaymentDate: lic.lastPaymentDate,
        lastPaymentId: lic.lastPaymentId,
        invoices: lic.invoices || [],
      }
    }
  } catch (err) {
    console.warn('[Proxima API] Failed reading license from server:', err)
  }
  return null
}

/**
 * Directly grants a complimentary 100% Free / Prototype License to a chapter.
 */
export async function grantFreeLicenseOnServer(
  chapterId: string,
  reason: string = 'Team Credit / Working Prototype',
  durationDays: number = 365
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/licensing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(convertCase({
        chapterId,
        reason,
        durationDays,
        priceInr: 0,
      }, 'snake')),
      signal: AbortSignal.timeout(4000),
    })
    if (res.status === 401) {
      handleUnauthorizedResponse()
      return false
    }
    return res.ok
  } catch (err) {
    console.warn('[Proxima API] Failed granting complimentary license:', err)
  }
  return false
}

// ============================================================================
// SECTION 6: VIP PASS VOUCHER APIs
// ============================================================================

/**
 * Fetches all VIP Free Chapter Creation passes from the server with offline fallback.
 */
export async function fetchVipPasses(): Promise<VipPass[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/vip-passes`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...getAuthHeaders(),
      },
      signal: AbortSignal.timeout(3500),
    })
    if (res.status === 401) {
      handleUnauthorizedResponse()
      return []
    }
    if (res.ok) {
      const data = await res.json()
      const rawList = Array.isArray(data) ? data : data.passes || []
      return convertCase<VipPass[]>(rawList, 'camel')
    }
  } catch (err) {
    console.warn('[Proxima API] Failed reading VIP passes:', err)
  }
  try {
    const raw = localStorage.getItem('proxima_vip_passes')
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

/**
 * Creates a new Free Chapter Creation Pass / Invite Link via backend.
 */
export async function createVipPassLink(
  label: string = 'Team Credit / Working Prototype',
  maxUses: number = 2,
  planDays: number = 365
): Promise<{ success: boolean; pass?: VipPass } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/vip-passes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(convertCase({
        label,
        maxUses,
        planDays,
      }, 'snake')),
      signal: AbortSignal.timeout(4000),
    })
    if (res.status === 401) {
      handleUnauthorizedResponse()
      return null
    }
    if (res.ok) {
      const p = await res.json()
      return { success: true, pass: convertCase<VipPass>(p, 'camel') }
    }
  } catch (err) {
    console.warn('[Proxima API] Failed creating VIP pass on server:', err)
  }
  const token = `free_pass_${Math.random().toString(16).slice(2, 8)}${Math.random().toString(16).slice(2, 8)}`
  const pass: VipPass = {
    id: `pass_${Date.now()}`,
    token,
    label,
    maxUses,
    usedCount: 0,
    planDays,
    createdAt: new Date().toISOString(),
  }
  try {
    const existing = await fetchVipPasses()
    localStorage.setItem('proxima_vip_passes', JSON.stringify([pass, ...existing]))
  } catch {}
  return { success: true, pass }
}

// ============================================================================
// SECTION 7: PAYMENT & GATEWAY CONFIGURATION APIs
// ============================================================================

/**
 * Requests a cryptographically signed Razorpay Order from the server via POST /api/payment.
 */
export async function createServerRazorpayOrder(
  chapterId: string,
  planKey: RenewalPlanKey
): Promise<ServerOrderResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(convertCase({ chapterId, planKey }, 'snake')),
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      const d = await res.json()
      return convertCase<ServerOrderResponse>(d, 'camel')
    }
  } catch (err) {
    console.warn('[Proxima API] Server order creation unreachable.', err)
  }
  return null
}

/**
 * Verifies Razorpay payment signature on the server via PATCH /api/payment/{order_id}.
 */
export async function verifyServerRazorpayPayment(params: {
  chapterId: string
  planKey: RenewalPlanKey
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature?: string
}): Promise<ServerVerifyResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/payment/${params.razorpayOrderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(convertCase({
        chapterId: params.chapterId,
        planKey: params.planKey,
        razorpayPaymentId: params.razorpayPaymentId,
        razorpaySignature: params.razorpaySignature,
      }, 'snake')),
      signal: AbortSignal.timeout(6000),
    })
    if (res.ok) {
      const d = await res.json()
      const camelData = convertCase<any>(d, 'camel')
      const lic = camelData.license
      return {
        success: camelData.success,
        license: lic
          ? {
              chapterId: lic.chapterId,
              status: lic.status === 'EXPIRED' ? 'EXPIRED' : lic.status === 'TRIAL' ? 'TRIAL' : 'ACTIVE',
              plan: lic.plan,
              priceInr: Number(lic.priceInr ?? 0),
              validUntil: lic.validUntil,
              autoRenew: Boolean(lic.autoRenew ?? false),
              lastPaymentDate: lic.lastPaymentDate,
              lastPaymentId: lic.lastPaymentId,
              invoices: lic.invoices || [],
            }
          : undefined,
        error: camelData.error,
      }
    }
  } catch (err) {
    console.warn('[Proxima API] Server payment verification unreachable.', err)
  }
  return null
}

/**
 * Fetches current Razorpay Gateway status from server.
 */
export async function getRazorpayServerConfig(): Promise<{
  keyId: string
  isLive: boolean
  isConfigured: boolean
} | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/payment/config`, {
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) {
      const d = await res.json()
      return convertCase(d, 'camel')
    }
  } catch (err) {
    console.warn('[Proxima API] Failed getting Razorpay config', err)
  }
  return null
}

/**
 * Persists Razorpay Gateway Key and Secret to server database.
 */
export async function saveRazorpayServerConfig(config: {
  keyId?: string
  keySecret?: string
  webhookSecret?: string
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/payment/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(convertCase(config, 'snake')),
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch (err) {
    console.warn('[Proxima API] Failed saving Razorpay config', err)
    return false
  }
}
