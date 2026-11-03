export interface MemberLocation {
  address: string
  area: string
  city: string
  pincode: string
  latitude: number
  longitude: number
  locationStatus: 'VERIFIED' | 'PENDING' | 'REQUIRES_UPDATE'
  verifiedAt?: string
}

export interface Member {
  id: string
  name: string
  company: string
  category: string
  categoryId: string
  categoryIcon: string // Lucide icon identifier
  shortBio: string
  phone: string
  whatsapp: string
  email: string
  website: string
  location: MemberLocation
  photoUrl: string
  chapter: string
  chapterId?: string
  chapterAccessKey?: string
  oneToOneAvailability: 'AVAILABLE' | 'BY_APPOINTMENT' | 'BUSY'
  referralRequirements: string
  tags: string[]
  distanceKm?: number
  membershipStatus?: 'RENEWED' | 'NOT_RENEWED'
  isVisible?: boolean // true = shown on map (renewed), false = hidden (not renewed)
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
}

export type DistanceRadius = 1 | 3 | 5 | 10 | 15 | 25 | 'ALL'

export interface SearchDestination {
  name: string
  latitude: number
  longitude: number
  source: 'user_gps' | 'searched_destination' | 'preset'
}

export interface Chapter {
  id: string
  slug: string
  accessKey: string
  name: string
  region: string
  city: string
  organizationType?: string // e.g. 'BNI', 'CNI', 'Rotary', 'Lions Club', 'TiE', 'Yi', 'Round Table', 'Independent'
  centerCoordinates: [number, number] // [lng, lat]
  defaultZoom: number
  license?: ChapterLicense
  isPrototype?: boolean
}

export interface ChapterLicense {
  chapterId: string
  status: 'ACTIVE' | 'TRIAL' | 'EXPIRED'
  plan: string // '₹199 / Chapter / Month'
  priceInr: number // 199
  validUntil: string // ISO date
  autoRenew: boolean
  lastPaymentDate?: string
  lastPaymentId?: string
  razorpaySubscriptionId?: string
  invoices?: {
    id: string
    date: string
    amount: number
    plan?: string
    status: 'PAID' | 'FAILED'
    receiptUrl?: string
  }[]
}

