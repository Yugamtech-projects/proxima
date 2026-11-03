import type { Member } from '../types/member'
import { calculateHaversineDistance } from '../utils/distance'

export interface ViewerIdentity {
  name: string
  memberId?: string
  phone?: string
  isSelfExcluded: boolean
  setAt: string
}

export interface MemberInteractionRecord {
  memberId: string
  memberName: string
  lastNavigatedDate?: string
  lastMetDate?: string
  navigationCount: number
  metCount: number
}

export type MeetingStatus = 'NEVER_MET' | 'OVERDUE_90' | 'RECENT'

const VIEWER_STORAGE_PREFIX = 'proxima_viewer_session_'
const INTERACTION_STORAGE_PREFIX = 'proxima_interactions_'

export function getStoredViewer(chapterId: string): ViewerIdentity | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${VIEWER_STORAGE_PREFIX}${chapterId}`)
    if (!raw) return null
    return JSON.parse(raw) as ViewerIdentity
  } catch {
    return null
  }
}

export function saveStoredViewer(chapterId: string, viewer: ViewerIdentity): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${VIEWER_STORAGE_PREFIX}${chapterId}`, JSON.stringify(viewer))
  } catch (err) {
    console.error('Failed to save viewer identity', err)
  }
}

export function clearStoredViewer(chapterId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(`${VIEWER_STORAGE_PREFIX}${chapterId}`)
  } catch (err) {
    console.error('Failed to clear viewer identity', err)
  }
}

export function getInteractionHistory(
  chapterId: string,
  viewerNameOrId: string
): Record<string, MemberInteractionRecord> {
  if (typeof window === 'undefined' || !viewerNameOrId) return {}
  try {
    const slug = viewerNameOrId.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const key = `${INTERACTION_STORAGE_PREFIX}${chapterId}_${slug}`
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function saveInteractionHistory(
  chapterId: string,
  viewerNameOrId: string,
  history: Record<string, MemberInteractionRecord>
): void {
  if (typeof window === 'undefined' || !viewerNameOrId) return
  try {
    const slug = viewerNameOrId.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const key = `${INTERACTION_STORAGE_PREFIX}${chapterId}_${slug}`
    localStorage.setItem(key, JSON.stringify(history))
  } catch (err) {
    console.error('Failed to save interaction history', err)
  }
}

export function logNavigationToMember(
  chapterId: string,
  viewerNameOrId: string,
  targetMember: Member
): void {
  const history = getInteractionHistory(chapterId, viewerNameOrId)
  const existing = history[targetMember.id] || {
    memberId: targetMember.id,
    memberName: targetMember.name,
    navigationCount: 0,
    metCount: 0,
  }

  existing.lastNavigatedDate = new Date().toISOString()
  existing.navigationCount = (existing.navigationCount || 0) + 1
  history[targetMember.id] = existing

  saveInteractionHistory(chapterId, viewerNameOrId, history)
}

export function logMeetingWithMember(
  chapterId: string,
  viewerNameOrId: string,
  targetMember: Member,
  metDateIso = new Date().toISOString()
): void {
  const history = getInteractionHistory(chapterId, viewerNameOrId)
  const existing = history[targetMember.id] || {
    memberId: targetMember.id,
    memberName: targetMember.name,
    navigationCount: 0,
    metCount: 0,
  }

  existing.lastMetDate = metDateIso
  existing.metCount = (existing.metCount || 0) + 1
  history[targetMember.id] = existing

  saveInteractionHistory(chapterId, viewerNameOrId, history)
}

export function getMemberMeetingStatus(record?: MemberInteractionRecord): {
  status: MeetingStatus
  daysSinceLastMet?: number
  label: string
} {
  if (!record || !record.lastMetDate) {
    return {
      status: 'NEVER_MET',
      label: 'Never Visited',
    }
  }

  const metTime = new Date(record.lastMetDate).getTime()
  if (isNaN(metTime)) {
    return {
      status: 'NEVER_MET',
      label: 'Never Visited',
    }
  }

  const days = Math.max(0, Math.floor((Date.now() - metTime) / (1000 * 60 * 60 * 24)))

  if (days >= 90) {
    return {
      status: 'OVERDUE_90',
      daysSinceLastMet: days,
      label: `${days}d ago`,
    }
  }

  return {
    status: 'RECENT',
    daysSinceLastMet: days,
    label: days === 0 ? 'Today' : `${days}d ago`,
  }
}

export interface NearbyOpportunity {
  member: Member
  distanceKm: number
  distanceMeters: number
  status: MeetingStatus
  daysSinceLastMet?: number
  label: string
}

/**
 * Intelligent Trip Multiplier Function:
 * Given a primary destination member (e.g. Mr. Baskar), find other chapter members
 * located within radius (default 1.5km) who have either NEVER been visited or have not
 * been visited in the last 90 days.
 */
export function findNearbyTripOpportunities(
  primaryMember: Member,
  allChapterMembers: Member[],
  chapterId: string,
  viewerNameOrId: string,
  maxDistanceKm = 1.8
): NearbyOpportunity[] {
  const history = getInteractionHistory(chapterId, viewerNameOrId)
  const opportunities: NearbyOpportunity[] = []

  const pLat = primaryMember.location.latitude
  const pLng = primaryMember.location.longitude

  for (const candidate of allChapterMembers) {
    // Exclude the destination member themselves
    if (candidate.id === primaryMember.id) continue

    // Exclude viewer themselves if matching name/id
    if (
      candidate.id === viewerNameOrId ||
      candidate.name.toLowerCase().trim() === viewerNameOrId.toLowerCase().trim()
    ) {
      continue
    }

    const distKm = calculateHaversineDistance(
      pLat,
      pLng,
      candidate.location.latitude,
      candidate.location.longitude
    )

    if (distKm <= maxDistanceKm) {
      const record = history[candidate.id]
      const statusInfo = getMemberMeetingStatus(record)

      opportunities.push({
        member: candidate,
        distanceKm: distKm,
        distanceMeters: Math.round(distKm * 1000),
        status: statusInfo.status,
        daysSinceLastMet: statusInfo.daysSinceLastMet,
        label: statusInfo.label,
      })
    }
  }

  // Sort priority: NEVER_MET first, then OVERDUE_90, then nearest distance
  return opportunities.sort((a, b) => {
    const priorityWeight = (status: MeetingStatus) => {
      if (status === 'NEVER_MET') return 1
      if (status === 'OVERDUE_90') return 2
      return 3
    }

    const pA = priorityWeight(a.status)
    const pB = priorityWeight(b.status)

    if (pA !== pB) return pA - pB
    return a.distanceKm - b.distanceKm
  })
}

/**
 * Pre-compose an executive 1-tap WhatsApp catchup request
 */
export function generateCatchupWhatsAppUrl(
  targetMember: Member,
  viewerName: string,
  chapterName: string,
  primaryMember: Member
): string {
  const phone = targetMember.whatsapp || targetMember.phone
  const cleanPhone = phone.replace(/[^0-9]/g, '')
  const intlPhone = cleanPhone.startsWith('91')
    ? cleanPhone
    : cleanPhone.length === 10
    ? `91${cleanPhone}`
    : cleanPhone

  const firstName = targetMember.name.split(' ')[0]
  const destinationArea = primaryMember.location.area || primaryMember.location.city

  const message = `Hi ${firstName}, ${viewerName} here from ${chapterName}. I have a meeting with ${primaryMember.name} near your office in ${destinationArea} today. If you're around, can I drop by for a quick 15-minute 1-to-1 catchup?`

  return `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`
}
