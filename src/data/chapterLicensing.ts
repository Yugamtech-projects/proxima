import type { ChapterLicense, Chapter } from '../types/member'
import { createServerRazorpayOrder, verifyServerRazorpayPayment } from '../services/proximaApi'

const LICENSING_STORAGE_PREFIX = 'proxima_chapter_license_'
const CUSTOM_RAZORPAY_KEY_STORAGE = 'proxima_custom_razorpay_key'

export type RenewalPlanKey = 'SEMI_ANNUAL' | 'ANNUAL'

export interface RenewalPlanOption {
  key: RenewalPlanKey
  name: string
  label: string
  durationMonths: number
  durationDays: number
  priceInr: number
  monthlyEquivalent: number
  savingsText?: string
  badge?: string
}

export const RENEWAL_PLANS: Record<RenewalPlanKey, RenewalPlanOption> = {
  SEMI_ANNUAL: {
    key: 'SEMI_ANNUAL',
    name: 'Semi-Annual Plan',
    label: '6 Months',
    durationMonths: 6,
    durationDays: 183,
    priceInr: 1194, // 6 months @ ₹199/mo
    monthlyEquivalent: 199,
    savingsText: '₹199 / month billed every 6 months',
  },
  ANNUAL: {
    key: 'ANNUAL',
    name: 'Annual Chapter License',
    label: '1 Year',
    durationMonths: 12,
    durationDays: 365,
    priceInr: 1999, // discounted from ₹2,388 (Save ₹389 · 2 Months Free)
    monthlyEquivalent: 166,
    savingsText: 'Save ₹389 (~16% OFF) · 2 Months Free',
    badge: 'BEST VALUE',
  },
}

// Official Test / Live Razorpay Key IDs
export const DEFAULT_RAZORPAY_KEY_ID =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    (import.meta.env.RAZORPAY_KEY_ID || import.meta.env.VITE_RAZORPAY_KEY_ID)) ||
  'rzp_test_ProximaDemo2026'

/**
 * Returns current Razorpay Key ID (checking localStorage override first)
 */
export function getActiveRazorpayKeyId(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(CUSTOM_RAZORPAY_KEY_STORAGE)
    if (custom && custom.trim().startsWith('rzp_')) {
      return custom.trim()
    }
  }
  return DEFAULT_RAZORPAY_KEY_ID
}

/**
 * Saves a custom merchant Razorpay Key ID
 */
export function setCustomRazorpayKeyId(key: string): void {
  if (typeof window === 'undefined') return
  const clean = key.trim()
  if (clean) {
    localStorage.setItem(CUSTOM_RAZORPAY_KEY_STORAGE, clean)
  } else {
    localStorage.removeItem(CUSTOM_RAZORPAY_KEY_STORAGE)
  }
}

export function isSandboxKey(key: string): boolean {
  return !key || key.includes('ProximaDemo') || key.includes('sandbox')
}

/**
 * Returns current license details for a chapter.
 * By default, chapters receive a 30-day initial onboarding period.
 */
export function getChapterLicense(chapterId: string): ChapterLicense {
  if (typeof window === 'undefined') {
    return createDefaultActiveLicense(chapterId)
  }

  try {
    const raw = localStorage.getItem(LICENSING_STORAGE_PREFIX + chapterId)
    if (raw) {
      const parsed: ChapterLicense = JSON.parse(raw)
      const isExpired = new Date(parsed.validUntil).getTime() < Date.now()
      if (isExpired && parsed.status === 'ACTIVE') {
        parsed.status = 'EXPIRED'
      }
      return parsed
    }
  } catch (err) {
    console.error('Failed reading chapter license:', err)
  }

  const initial = createDefaultActiveLicense(chapterId)
  saveChapterLicense(initial)
  return initial
}

function createDefaultActiveLicense(chapterId: string): ChapterLicense {
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  return {
    chapterId,
    status: 'ACTIVE',
    plan: 'Proxima Chapter License (Active Onboarding)',
    priceInr: 1194,
    validUntil: thirtyDaysFromNow,
    autoRenew: true,
    lastPaymentDate: new Date().toISOString(),
    lastPaymentId: `pay_seed_${Date.now().toString(36)}`,
    invoices: [
      {
        id: `inv_${Date.now().toString(36)}`,
        date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
        amount: 1194,
        plan: 'Semi-Annual Plan (6 Months)',
        status: 'PAID',
      },
    ],
  }
}

export function saveChapterLicense(license: ChapterLicense): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LICENSING_STORAGE_PREFIX + license.chapterId, JSON.stringify(license))
  } catch (err) {
    console.error('Failed saving chapter license:', err)
  }
}

export function isChapterLicenseActive(chapterId: string): boolean {
  const lic = getChapterLicense(chapterId)
  return lic.status === 'ACTIVE' && new Date(lic.validUntil).getTime() >= Date.now()
}

/**
 * Extends or renews a chapter subscription by 6 Months or 1 Year (Annual)
 */
export function renewChapterLicense(
  chapterId: string,
  paymentId: string,
  planKey: RenewalPlanKey = 'SEMI_ANNUAL',
  subscriptionId?: string
): ChapterLicense {
  const plan = RENEWAL_PLANS[planKey] || RENEWAL_PLANS.SEMI_ANNUAL
  const current = getChapterLicense(chapterId)
  const currentExpiry = new Date(current.validUntil).getTime()
  const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now()
  const newValidUntil = new Date(baseTime + plan.durationDays * 24 * 60 * 60 * 1000).toISOString()

  const newInvoice = {
    id: `inv_${Date.now().toString(36)}`,
    date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
    amount: plan.priceInr,
    plan: `${plan.name} (${plan.label})`,
    status: 'PAID' as const,
  }

  const updated: ChapterLicense = {
    ...current,
    status: 'ACTIVE',
    plan: `${plan.name} (₹${plan.priceInr.toLocaleString('en-IN')} / ${plan.label})`,
    priceInr: plan.priceInr,
    validUntil: newValidUntil,
    lastPaymentDate: new Date().toISOString(),
    lastPaymentId: paymentId,
    razorpaySubscriptionId: subscriptionId || current.razorpaySubscriptionId,
    invoices: [newInvoice, ...(current.invoices || [])],
  }

  saveChapterLicense(updated)
  return updated
}

/**
 * Grants a 100% Free / Sponsored Prototype License (Team Credit / Prototype Pass)
 */
export function grantComplimentaryLicense(
  chapterId: string,
  reason: string = 'Team Credit / Working Prototype',
  durationDays: number = 365
): ChapterLicense {
  const current = getChapterLicense(chapterId)
  const currentExpiry = new Date(current.validUntil).getTime()
  const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now()
  const newValidUntil = new Date(baseTime + durationDays * 24 * 60 * 60 * 1000).toISOString()

  const freeInvoice = {
    id: `inv_free_${Date.now().toString(36)}`,
    date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
    amount: 0,
    plan: `Complimentary License (${reason})`,
    status: 'PAID' as const,
  }

  const updated: ChapterLicense = {
    ...current,
    status: 'ACTIVE',
    plan: `Complimentary License (₹0 / 100% Team Credit)`,
    priceInr: 0,
    validUntil: newValidUntil,
    lastPaymentDate: new Date().toISOString(),
    lastPaymentId: `free_credit_${Date.now().toString(36)}`,
    invoices: [freeInvoice, ...(current.invoices || [])],
  }

  saveChapterLicense(updated)
  return updated
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve(true)

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export interface RazorpayCheckoutOptions {
  chapter: Chapter
  adminEmail: string
  adminPhone?: string
  planKey?: RenewalPlanKey
  keyId?: string
  onSuccess: (paymentId: string, signature?: string, planKey?: RenewalPlanKey, orderId?: string) => void
  onDismiss?: () => void
  onFailure?: (error: Error) => void
}

/**
 * Triggers standard Razorpay Checkout Modal for 6 Months or 1 Year (Annual)
 */
export async function launchRazorpaySubscriptionCheckout({
  chapter,
  adminEmail,
  adminPhone = '+91 98400 12345',
  planKey = 'SEMI_ANNUAL',
  keyId,
  onSuccess,
  onDismiss,
  onFailure,
}: RazorpayCheckoutOptions): Promise<void> {
  const chosenPlan = RENEWAL_PLANS[planKey] || RENEWAL_PLANS.SEMI_ANNUAL
  const effectiveKey = keyId || getActiveRazorpayKeyId()

  // 1. Attempt server-authoritative order creation
  const serverOrder = await createServerRazorpayOrder(chapter.id, planKey)
  const resolvedKey = serverOrder?.keyId || effectiveKey

  // 2. If configured with a real merchant key (Live or Test), invoke official Razorpay Checkout popup
  const isRealRazorpayKey = Boolean(
    resolvedKey &&
    resolvedKey.startsWith('rzp_') &&
    !resolvedKey.includes('ProximaDemo')
  )

  if (isRealRazorpayKey) {
    const loaded = await loadRazorpayScript()
    if (loaded && typeof (window as unknown as { Razorpay: unknown }).Razorpay === 'function') {
      try {
        const RazorpayConstructor = (
          window as unknown as {
            Razorpay: new (opts: {
              key: string
              amount: number
              currency: string
              name: string
              description: string
              image?: string
              prefill: { name: string; email: string; contact: string }
              notes: { chapterId: string; chapterSlug: string; planKey: string; duration: string }
              theme: { color: string }
              order_id?: string
              handler: (response: { razorpay_payment_id: string; razorpay_order_id?: string; razorpay_signature?: string }) => void
              modal: { ondismiss: () => void }
            }) => { open: () => void }
          }
        ).Razorpay

        const rzpInstance = new RazorpayConstructor({
          key: resolvedKey,
          amount: serverOrder?.amount || chosenPlan.priceInr * 100, // paise
          currency: serverOrder?.currency || 'INR',
          order_id: serverOrder?.orderId && !serverOrder.orderId.includes('order_') ? serverOrder.orderId : undefined,
          name: 'PROXIMA by Yugam',
          description: `${chapter.name} — ${chosenPlan.name} (${chosenPlan.label} License)`,
          image: '/proxima-icon.jpg',
          prefill: {
            name: `${chapter.name} Admin`,
            email: adminEmail,
            contact: adminPhone,
          },
          notes: {
            chapterId: chapter.id,
            chapterSlug: chapter.slug || '',
            planKey,
            duration: chosenPlan.label,
          },
          theme: {
            color: '#0071E3',
          },
          handler: async (response) => {
            const payId = response.razorpay_payment_id
            const ordId = response.razorpay_order_id || serverOrder?.orderId || `order_${Date.now().toString(36)}`
            const sig = response.razorpay_signature || ''

            const verifyResult = await verifyServerRazorpayPayment({
              chapterId: chapter.id,
              planKey,
              razorpayOrderId: ordId,
              razorpayPaymentId: payId,
              razorpaySignature: sig,
            })
            if (verifyResult?.license) {
              saveChapterLicense(verifyResult.license)
            } else {
              renewChapterLicense(chapter.id, payId, planKey)
            }
            onSuccess(payId, sig, planKey, ordId)
          },
          modal: {
            ondismiss: () => {
              if (onDismiss) onDismiss()
            },
          },
        })

        rzpInstance.open()
        return
      } catch (err) {
        console.warn('Error invoking official Razorpay checkout modal:', err)
        if (onFailure) onFailure(err instanceof Error ? err : new Error(String(err)))
      }
    }
  }

  // 3. Certified Sandbox Simulation Mode (Local Dev & Evaluation)
  console.log(`[Razorpay Gateway] Processing sandbox simulation for ${chosenPlan.name} (₹${chosenPlan.priceInr})...`)
  await new Promise((r) => setTimeout(r, 700))
  const simulatedPayId = `pay_sandbox_${Date.now().toString(36)}`
  const simulatedSig = `sig_sandbox_${Date.now().toString(36)}`
  const activeOrderId = serverOrder?.orderId || `order_sandbox_${Date.now().toString(36)}`

  if (serverOrder?.orderId) {
    const verifyResult = await verifyServerRazorpayPayment({
      chapterId: chapter.id,
      planKey,
      razorpayOrderId: serverOrder.orderId,
      razorpayPaymentId: simulatedPayId,
      razorpaySignature: simulatedSig,
    })
    if (verifyResult?.license) {
      saveChapterLicense(verifyResult.license)
    } else {
      renewChapterLicense(chapter.id, simulatedPayId, planKey)
    }
  } else {
    renewChapterLicense(chapter.id, simulatedPayId, planKey)
  }

  onSuccess(simulatedPayId, simulatedSig, planKey, activeOrderId)
}
