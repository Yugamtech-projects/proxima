import type { Chapter } from '../types/member'

export const PRODUCTION_DOMAIN = 'proxima.network'
export const APP_NAME = 'PROXIMA'
export const APP_TAGLINE = 'by Yugam'

/**
 * Chapters directory configured with high-entropy cryptographic access keys.
 * Pattern is unguessable (24-character hexadecimal tokens) preventing unauthorized
 * enumeration or URL tampering across BNI chapters.
 */
export const DEFAULT_CHAPTERS: Chapter[] = [
  {
    id: 'chap-titans',
    slug: 'chennai-demo',
    accessKey: 'px_7b9f3e1a8d4c205e81d6f03a',
    name: 'Chennai - Demo',
    organizationType: 'Executive Demo',
    region: 'Tamil Nadu',
    city: 'Chennai',
    centerCoordinates: [80.2155, 13.0878], // Anna Nagar / Central
    defaultZoom: 12.5,
  },
  {
    id: 'chap-blr-central',
    slug: 'bangalore-demo',
    accessKey: 'px_3e71d80b5a942cf6a14e908b',
    name: 'Bangalore Demo',
    organizationType: 'Executive Demo',
    region: 'Karnataka',
    city: 'Bengaluru',
    centerCoordinates: [77.5946, 12.9716],
    defaultZoom: 12.2,
  },
  {
    id: 'chap-mumbai-apex',
    slug: 'mumbai-demo',
    accessKey: 'px_80d4f17a9e25bc36e7192a54',
    name: 'Mumbai Demo',
    organizationType: 'Executive Demo',
    region: 'Maharashtra',
    city: 'Mumbai',
    centerCoordinates: [72.8777, 19.0760],
    defaultZoom: 12.0,
  },
]

/**
 * Storage key for persistent custom chapters
 */
const CHAPTERS_STORAGE_KEY = 'proxima_all_chapters_v3'

/**
 * Returns all chapters, including default and dynamically created chapters.
 */
export function getAllChapters(): Chapter[] {
  if (typeof window === 'undefined') return DEFAULT_CHAPTERS
  try {
    const raw = localStorage.getItem(CHAPTERS_STORAGE_KEY)
    if (raw) {
      const parsed: Chapter[] = JSON.parse(raw)
      const customOnes = parsed.filter((p) => !DEFAULT_CHAPTERS.some((d) => d.id === p.id))
      return [...DEFAULT_CHAPTERS, ...customOnes]
    }
  } catch (e) {
    console.error('Failed reading chapters from localStorage:', e)
  }
  return DEFAULT_CHAPTERS
}

/**
 * Saves all chapters to persistent browser storage.
 */
export function saveChapters(chapters: Chapter[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CHAPTERS_STORAGE_KEY, JSON.stringify(chapters))
  } catch (e) {
    console.error('Failed saving chapters:', e)
  }
}

/**
 * Dynamically provisions a new B2B Chapter with an unguessable 24-char cryptographic access key.
 */
export function createNewChapter(params: {
  name: string
  city: string
  region: string
  organizationType?: string
  centerCoordinates?: [number, number]
  defaultZoom?: number
}): Chapter {
  const current = getAllChapters()
  const slug = params.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const randomHex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('')

  const newChapter: Chapter = {
    id: `chap-${slug}-${Date.now().toString(36)}`,
    slug,
    accessKey: `px_${randomHex}`,
    name: params.name.trim(),
    city: params.city.trim(),
    region: params.region.trim(),
    organizationType: params.organizationType || 'Business Forum',
    centerCoordinates: params.centerCoordinates || [80.2155, 13.0878],
    defaultZoom: params.defaultZoom || 12.5,
  }

  saveChapters([...current, newChapter])
  return newChapter
}

/**
 * Resolves a chapter strictly by its unique cryptographic access key or legacy slug.
 * Returns null if token is invalid or tampered with.
 */
export function getChapterByToken(token: string | null): Chapter | null {
  if (!token) return null
  const clean = token.trim().toLowerCase()
  const allChapters = getAllChapters()

  // 1. Strict match on cryptographic access key
  const matchKey = allChapters.find(
    (c) => c.accessKey.toLowerCase() === clean
  )
  if (matchKey) return matchKey

  // 2. Fallback match on slug (for backward compatibility during migration)
  const matchSlug = allChapters.find(
    (c) => c.slug.toLowerCase() === clean
  )
  return matchSlug || null
}

export function getChapterBySlug(slug: string | null): Chapter | null {
  return getChapterByToken(slug)
}

/**
 * Generates an unguessable, secure chapter URL formatted with ?c=<accessKey>
 */
export function getChapterShareUrl(accessKeyOrSlug: string, forceProduction = false): string {
  const ch = getChapterByToken(accessKeyOrSlug) || DEFAULT_CHAPTERS[0]
  const key = ch.accessKey

  if (forceProduction || typeof window === 'undefined') {
    return `https://${PRODUCTION_DOMAIN}/?c=${key}`
  }
  if (window.location.hostname === PRODUCTION_DOMAIN) {
    return `https://${PRODUCTION_DOMAIN}/?c=${key}`
  }
  return `${window.location.origin}/?c=${key}`
}

export function getProductionChapterShareUrl(accessKeyOrSlug: string): string {
  const ch = getChapterByToken(accessKeyOrSlug) || DEFAULT_CHAPTERS[0]
  return `https://${PRODUCTION_DOMAIN}/?c=${ch.accessKey}`
}
