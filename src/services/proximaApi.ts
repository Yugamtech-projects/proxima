/**
 * PROXIMA by Yugam - Production API Service Adapter
 * 
 * Provides transparent communication with the production backend API (/api)
 * while maintaining graceful offline fallbacks.
 */

import type { ChapterLicense, Member } from '../types/member'
import type { RenewalPlanKey } from '../data/chapterLicensing'

const API_BASE = typeof window !== 'undefined' ? '' : 'http://localhost:5051'

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem('proxima_admin_session')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.token) {
        return { Authorization: `Bearer ${parsed.token}` }
      }
    }
  } catch {}
  return {}
}

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
}

export interface ServerVerifyResponse {
  success: boolean
  license?: ChapterLicense
  error?: string
}

/**
 * Checks if the production backend server is reachable.
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(2500),
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Authenticates credentials against the backend API server.
 */
export async function loginWithServer(loginId: string, passwordPlain: string): Promise<ServerAuthResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId, password: passwordPlain }),
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('[Proxima API] Server login unreachable. Falling back to client authentication.', err)
  }
  return null
}

/**
 * Requests a cryptographically signed Razorpay Order from the server.
 */
export async function createServerRazorpayOrder(
  chapterId: string,
  planKey: RenewalPlanKey
): Promise<ServerOrderResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/licensing/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterId, planKey }),
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('[Proxima API] Server order creation unreachable.', err)
  }
  return null
}

/**
 * Verifies Razorpay payment signature on the server with HMAC SHA-256.
 */
export async function verifyServerRazorpayPayment(params: {
  chapterId: string
  planKey: RenewalPlanKey
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature?: string
}): Promise<ServerVerifyResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/licensing/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(6000),
    })
    if (res.ok) {
      return await res.json()
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
    const res = await fetch(`${API_BASE}/api/licensing/config`, {
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) return await res.json()
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
    const res = await fetch(`${API_BASE}/api/licensing/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch (err) {
    console.warn('[Proxima API] Failed saving Razorpay config', err)
    return false
  }
}

/**
 * Syncs member roster to server database.
 */
export async function syncMembersToServer(chapterId: string, members: Member[]): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/members/${chapterId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ members, version: Date.now() }),
      signal: AbortSignal.timeout(4000),
    })
    return res.ok
  } catch {
    return false
  }
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

/**
 * Fetches all VIP Free Chapter Creation passes from the server.
 */
export async function fetchVipPasses(): Promise<VipPass[]> {
  try {
    const res = await fetch(`${API_BASE}/api/vip-passes`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...getAuthHeaders(),
      },
      signal: AbortSignal.timeout(3500),
    })
    if (res.ok) {
      const data = await res.json()
      return data.passes || []
    }
  } catch (err) {
    console.warn('[Proxima API] Failed reading VIP passes:', err)
  }
  return []
}

/**
 * Creates a new Free Chapter Creation Pass / Invite Link.
 */
export async function createVipPassLink(
  label: string = 'Team Credit / Working Prototype',
  maxUses: number = 2,
  planDays: number = 365
): Promise<{ success: boolean; pass?: VipPass } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/vip-passes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ label, maxUses, planDays }),
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('[Proxima API] Failed creating VIP pass:', err)
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
    const res = await fetch(`${API_BASE}/api/chapters/grant-free-license`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ chapterId, reason, durationDays }),
      signal: AbortSignal.timeout(4000),
    })
    return res.ok
  } catch (err) {
    console.warn('[Proxima API] Failed granting complimentary license:', err)
  }
  return false
}

/**
 * Onboards a new chapter self-serve (with either payment or VIP free token).
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
    const res = await fetch(`${API_BASE}/api/chapters/onboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    })
    return await res.json()
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error during onboarding.',
    }
  }
}

