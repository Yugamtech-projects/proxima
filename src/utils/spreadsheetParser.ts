/**
 * PROXIMA Smart Spreadsheet & CSV Parser
 * 
 * Ingests CSV or TSV data (from file upload or Excel copy-paste),
 * identifies columns with fuzzy matching, resolves Google Maps links / coordinates,
 * and formats valid Member records.
 */

import type { Member, MemberLocation } from '../types/member'
import { parseGoogleMapsLocation } from './googleMapsParser'

export interface ParsedMemberRow {
  rowNumber: number
  fullName: string
  company: string
  category: string
  phone: string
  email: string
  address: string
  area: string
  googleMapsOrCoords: string
  website: string
  photoUrl: string
  resolvedLocation: MemberLocation
  locationSource: 'GOOGLE_MAPS_LINK' | 'RAW_COORDINATES' | 'DISTRICT_CLUSTERED' | 'CHAPTER_DEFAULT'
  warnings: string[]
  isValid: boolean
}

export interface SpreadsheetParseResult {
  totalRows: number
  validCount: number
  warningCount: number
  rows: ParsedMemberRow[]
  members: Member[]
}

/**
 * Standard category icons mapping for Lucide
 */
const CATEGORY_ICON_MAP: Record<string, string> = {
  legal: 'Scale',
  advocate: 'Scale',
  law: 'Scale',
  tax: 'Calculator',
  finance: 'Briefcase',
  accounting: 'Calculator',
  ca: 'Calculator',
  audit: 'FileText',
  health: 'Activity',
  doctor: 'Activity',
  pharma: 'ShieldPlus',
  hospital: 'Building2',
  realestate: 'Home',
  realty: 'Home',
  property: 'Building',
  construction: 'Hammer',
  architecture: 'Compass',
  interior: 'Layout',
  tech: 'Laptop',
  software: 'Code',
  it: 'Server',
  cloud: 'Cloud',
  manufacturing: 'Factory',
  industrial: 'Cog',
  automotive: 'Car',
  transport: 'Truck',
  logistics: 'Truck',
  freight: 'Plane',
  marketing: 'Megaphone',
  advertising: 'Sparkles',
  media: 'Film',
  education: 'GraduationCap',
  training: 'BookOpen',
  consulting: 'TrendingUp',
  insurance: 'Shield',
}

function detectCategoryIcon(category: string): string {
  const lower = category.toLowerCase().replace(/[^a-z]/g, '')
  for (const [key, icon] of Object.entries(CATEGORY_ICON_MAP)) {
    if (lower.includes(key)) return icon
  }
  return 'Building'
}

/**
 * Robust CSV/TSV line splitter that respects quoted strings containing commas or tabs.
 */
function parseDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++ // Skip escaped quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

/**
 * Detects whether the content is tab-delimited (TSV from Excel paste) or comma-delimited (CSV).
 */
function detectDelimiter(firstLine: string): string {
  const tabCount = (firstLine.match(/\t/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  return tabCount > commaCount ? '\t' : ','
}

/**
 * Normalizes header string to find matching column field.
 */
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Maps CSV headers to target member fields.
 */
function mapHeaderIndices(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {}

  headers.forEach((h, index) => {
    const norm = normalizeHeader(h)

    // Name
    if (/^(fullname|name|membername|contactname|executive|person)/.test(norm)) {
      if (map.name === undefined) map.name = index
    }
    // Company
    else if (/^(company|companyname|firm|organization|businessname|entity)/.test(norm)) {
      if (map.company === undefined) map.company = index
    }
    // Category
    else if (/^(category|businesscategory|classification|industry|domain|specialty|profession)/.test(norm)) {
      if (map.category === undefined) map.category = index
    }
    // Phone
    else if (/^(phone|mobile|contact|phonenumber|mobilenumber|whatsapp|tel)/.test(norm)) {
      if (map.phone === undefined) map.phone = index
    }
    // Email
    else if (/^(email|mail|e-mail)/.test(norm)) {
      if (map.email === undefined) map.email = index
    }
    // Address
    else if (/^(address|officeaddress|streetaddress|street|officelocation)/.test(norm)) {
      if (map.address === undefined) map.address = index
    }
    // Area / Locality
    else if (/^(locality|area|district|corridor|suburb|zone|localityarea)/.test(norm)) {
      if (map.area === undefined) map.area = index
    }
    // Google Maps / Coordinates
    else if (/^(googlemaps|maps|mapslink|googlemapslink|coordinates|coords|latlng|locationlink)/.test(norm)) {
      if (map.googleMaps === undefined) map.googleMaps = index
    }
    // Website
    else if (/^(website|web|site|url|homepage)/.test(norm)) {
      if (map.website === undefined) map.website = index
    }
    // Photo URL
    else if (/^(photo|photourl|image|headshot|avatar|picture)/.test(norm)) {
      if (map.photoUrl === undefined) map.photoUrl = index
    }
  })

  return map
}

/**
 * Generates deterministic coordinates jitter around chapter hub when no coordinates exist.
 */
function generateDeterministicJitter(index: number, baseLat: number, baseLng: number): [number, number] {
  // Golden ratio spiral distribution for natural, non-overlapping spacing
  const angle = index * 2.39996323 // Golden angle in radians
  const distanceKm = 0.5 + Math.sqrt(index) * 0.45 // Expands outward from 0.5km to ~4km
  
  // 1 deg latitude ~ 111 km, 1 deg longitude ~ 111 * cos(lat) km
  const latDelta = (distanceKm / 111) * Math.sin(angle)
  const lngDelta = (distanceKm / (111 * Math.cos(baseLat * (Math.PI / 180)))) * Math.cos(angle)
  
  return [
    Number((baseLat + latDelta).toFixed(6)),
    Number((baseLng + lngDelta).toFixed(6)),
  ]
}

/**
 * Main parser function: takes raw string or file content and returns validated Member objects.
 */
export async function parseMemberSpreadsheet(
  rawText: string,
  chapter: {
    id: string
    name: string
    city: string
    accessKey?: string
    centerCoordinates: [number, number]
  }
): Promise<SpreadsheetParseResult> {
  // Clean potential BOM and split lines
  const cleanText = rawText.replace(/^\uFEFF/, '').trim()
  const rawLines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0)

  if (rawLines.length === 0) {
    return { totalRows: 0, validCount: 0, warningCount: 0, rows: [], members: [] }
  }

  const delimiter = detectDelimiter(rawLines[0])
  const headerCells = parseDelimitedLine(rawLines[0], delimiter)
  const headerMap = mapHeaderIndices(headerCells)

  const rows: ParsedMemberRow[] = []
  const members: Member[] = []

  const baseLng = chapter.centerCoordinates[0]
  const baseLat = chapter.centerCoordinates[1]

  // Iterate over data rows
  for (let i = 1; i < rawLines.length; i++) {
    const rowNumber = i + 1
    const cells = parseDelimitedLine(rawLines[i], delimiter)
    
    // Skip completely empty rows
    if (cells.every((c) => c === '')) continue

    const fullName = (headerMap.name !== undefined ? cells[headerMap.name] : cells[0]) || ''
    const company = (headerMap.company !== undefined ? cells[headerMap.company] : cells[1]) || ''
    const category = (headerMap.category !== undefined ? cells[headerMap.category] : cells[2]) || 'General Business'
    const phone = (headerMap.phone !== undefined ? cells[headerMap.phone] : cells[3]) || ''
    const email = (headerMap.email !== undefined ? cells[headerMap.email] : cells[4]) || ''
    const address = (headerMap.address !== undefined ? cells[headerMap.address] : cells[5]) || ''
    const area = (headerMap.area !== undefined ? cells[headerMap.area] : cells[6]) || chapter.city
    const googleMapsOrCoords = (headerMap.googleMaps !== undefined ? cells[headerMap.googleMaps] : cells[7]) || ''
    const website = (headerMap.website !== undefined ? cells[headerMap.website] : cells[8]) || ''
    const photoUrl = (headerMap.photoUrl !== undefined ? cells[headerMap.photoUrl] : cells[9]) || ''

    const warnings: string[] = []

    if (!fullName) {
      warnings.push('Missing member full name')
    }
    if (!company) {
      warnings.push('Company name is missing (assigned Chapter Affiliate)')
    }
    if (!phone) {
      warnings.push('Phone number is missing')
    }

    // Resolve GPS Coordinates
    let resolvedLat = baseLat
    let resolvedLng = baseLng
    let locationSource: ParsedMemberRow['locationSource'] = 'CHAPTER_DEFAULT'

    if (googleMapsOrCoords.trim()) {
      try {
        const parsedGeo = await parseGoogleMapsLocation(googleMapsOrCoords.trim())
        if (parsedGeo) {
          resolvedLat = parsedGeo.latitude
          resolvedLng = parsedGeo.longitude
          locationSource = parsedGeo.sourceDescription.includes('Raw')
            ? 'RAW_COORDINATES'
            : 'GOOGLE_MAPS_LINK'
        } else {
          warnings.push('Google Maps link could not be parsed into GPS; clustered by locality')
        }
      } catch {
        warnings.push('Failed to parse location link; defaulted to district radius')
      }
    }

    // If still defaulted, apply deterministic spread around hub
    if (locationSource === 'CHAPTER_DEFAULT') {
      const [jitterLat, jitterLng] = generateDeterministicJitter(i, baseLat, baseLng)
      resolvedLat = jitterLat
      resolvedLng = jitterLng
      locationSource = area.trim() ? 'DISTRICT_CLUSTERED' : 'CHAPTER_DEFAULT'
    }

    const memberId = `mem-${chapter.id}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`

    const resolvedLocation: MemberLocation = {
      address: address.trim() || `${area}, ${chapter.city}`,
      area: area.trim() || chapter.city,
      city: chapter.city,
      pincode: '600001',
      latitude: resolvedLat,
      longitude: resolvedLng,
      locationStatus: locationSource === 'CHAPTER_DEFAULT' ? 'PENDING' : 'VERIFIED',
      verifiedAt: new Date().toISOString(),
    }

    const isValid = fullName.trim().length > 0

    const parsedRow: ParsedMemberRow = {
      rowNumber,
      fullName: fullName.trim() || `Member ${i}`,
      company: company.trim() || `${fullName}'s Firm`,
      category: category.trim() || 'Business Services',
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      area: area.trim() || chapter.city,
      googleMapsOrCoords: googleMapsOrCoords.trim(),
      website: website.trim(),
      photoUrl: photoUrl.trim(),
      resolvedLocation,
      locationSource,
      warnings,
      isValid,
    }

    rows.push(parsedRow)

    if (isValid) {
      const memberObj: Member = {
        id: memberId,
        name: parsedRow.fullName,
        company: parsedRow.company,
        category: parsedRow.category,
        categoryId: parsedRow.category.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        categoryIcon: detectCategoryIcon(parsedRow.category),
        shortBio: `${parsedRow.category} specialist at ${parsedRow.company}`,
        phone: parsedRow.phone,
        whatsapp: parsedRow.phone,
        email: parsedRow.email,
        website: parsedRow.website,
        photoUrl: parsedRow.photoUrl,
        chapter: chapter.name,
        chapterId: chapter.id,
        chapterAccessKey: chapter.accessKey,
        oneToOneAvailability: 'AVAILABLE',
        referralRequirements: 'Active executive available for chapter 1-to-1s and referrals.',
        tags: [parsedRow.category, parsedRow.area, chapter.city],
        membershipStatus: 'RENEWED',
        isVisible: true,
        location: resolvedLocation,
      }
      members.push(memberObj)
    }
  }

  const validCount = rows.filter((r) => r.isValid).length
  const warningCount = rows.filter((r) => r.warnings.length > 0).length

  return {
    totalRows: rows.length,
    validCount,
    warningCount,
    rows,
    members,
  }
}
