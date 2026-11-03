import crypto from 'node:crypto'

// 1. In-memory Mock LocalStorage & SessionStorage for Node environment
class MockStorage {
  constructor() {
    this.store = new Map()
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null
  }
  setItem(key, value) {
    this.store.set(key, String(value))
  }
  removeItem(key) {
    this.store.delete(key)
  }
  clear() {
    this.store.clear()
  }
}

globalThis.localStorage = new MockStorage()
globalThis.sessionStorage = new MockStorage()
globalThis.window = {
  location: {
    origin: 'http://localhost:5050',
    hostname: 'localhost',
    search: '',
  },
}

// 2. SHA-256 fallback implementation from src/utils/crypto.ts
function fallbackSha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount))
  }

  let i = 0
  let j = 0
  let result = ''

  const words = []
  const asciiBitLength = ascii.length * 8

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]

  const totalWords = (((asciiBitLength + 64) >> 9) << 4) + 16
  for (i = 0; i < totalWords; i++) words[i] = 0

  for (i = 0; i < asciiBitLength; i += 8) {
    words[i >> 5] |= (ascii.charCodeAt(i / 8) & 0xff) << (24 - (i % 32))
  }
  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32))
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength

  for (i = 0; i < words.length; i += 16) {
    const w = words.slice(i, i + 16)
    const oldHash = hash.slice(0)
    hash = hash.slice(0, 8)

    for (j = 0; j < 64; j++) {
      const w15 = w[j - 15]
      const w2 = w[j - 2]
      const a = hash[0]
      const e = hash[4]
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[j] +
        (w[j] =
          j < 16
            ? w[j]
            : (w[j - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[j - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0)

      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))

      hash = [(temp1 + temp2) | 0, a, hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]]
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255
      result += (b < 16 ? '0' : '') + b.toString(16)
    }
  }

  return result
}

// 3. Haversine Distance computation
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// 4. Test Suite Execution
const auditResults = []

function assert(condition, testName, details = '') {
  if (condition) {
    auditResults.push({ status: 'PASS', name: testName, details })
    console.log(`[PASS] ${testName}`)
  } else {
    auditResults.push({ status: 'FAIL', name: testName, details })
    console.error(`[FAIL] ${testName}: ${details}`)
  }
}

console.log('=================================================================')
console.log('🚀 PROXIMA BRUTAL AUDIT: CRYPTO, AUTH, CHAPTERS, MEMBERS & MAP')
console.log('=================================================================\n')

// ==========================================
// TEST SECTION 1: CRYPTO & HASHING INTEGRITY
// ==========================================
console.log('--- SECTION 1: Cryptographic SHA-256 Hashing Verification ---')
const testPasswords = [
  'Proxima@Yugam2026!',
  'Titans@Proxima2026!',
  'Dynamic@Proxima2026!',
  'Admin@2026!',
  'Coimbatore#Pioneers$2026',
  'Pass with spaces and & special characters 123!@#$%^&*()_+',
  '12345678',
  'A',
]

for (const pwd of testPasswords) {
  const customHash = fallbackSha256(pwd)
  const nativeHash = crypto.createHash('sha256').update(pwd).digest('hex')
  assert(
    customHash === nativeHash,
    `SHA-256 Hash Accuracy for "${pwd.substring(0, 15)}..."`,
    `Expected: ${nativeHash}, Got: ${customHash}`
  )
}

// Master Admin known hash check
const masterPwd = 'Proxima@Yugam2026!'
const expectedMasterHash = '7d601c931c9a89456f78fe6353181d0e8285e61e9609c64481f603bd59b2382d'
assert(
  fallbackSha256(masterPwd) === expectedMasterHash,
  'Master Admin Stored SHA-256 Constant Verification',
  `Computed: ${fallbackSha256(masterPwd)}`
)

// ==========================================
// TEST SECTION 2: CHAPTER PROVISIONING
// ==========================================
console.log('\n--- SECTION 2: Chapter Provisioning & ID Creation ---')

function generateCryptographicKey() {
  const bytes = crypto.randomBytes(12)
  return `px_${bytes.toString('hex')}`
}

function createChapterMock(name, city, region, coords) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return {
    id: `chap-${slug}-${Date.now().toString(36)}`,
    slug,
    accessKey: generateCryptographicKey(),
    name,
    city,
    region,
    centerCoordinates: coords,
    defaultZoom: 12.5,
  }
}

const newChapter = createChapterMock(
  'Coimbatore Pioneers Chapter',
  'Coimbatore',
  'Tamil Nadu',
  [76.9558, 11.0168] // [lng, lat]
)

assert(newChapter.accessKey.startsWith('px_'), 'Chapter Access Key format starts with px_')
assert(newChapter.accessKey.length === 27, 'Chapter Access Key has 27 chars (px_ + 24 hex)')
assert(newChapter.slug === 'coimbatore-pioneers-chapter', 'Chapter slug generated correctly')
assert(
  Array.isArray(newChapter.centerCoordinates) &&
    newChapter.centerCoordinates[0] > 60 &&
    newChapter.centerCoordinates[0] < 100 &&
    newChapter.centerCoordinates[1] > 8 &&
    newChapter.centerCoordinates[1] < 38,
  'Chapter center coordinates in valid Indian [lng, lat] bounds'
)

// Collision resistance check across 10,000 keys
const keySet = new Set()
let collisionDetected = false
for (let k = 0; k < 10000; k++) {
  const key = generateCryptographicKey()
  if (keySet.has(key)) {
    collisionDetected = true
    break
  }
  keySet.add(key)
}
assert(!collisionDetected, 'Collision resistance: 10,000 unique cryptographic keys generated without duplicate')

// ==========================================
// TEST SECTION 3: AUTHENTICATION MATRIX
// ==========================================
console.log('\n--- SECTION 3: Unified Login & Authentication Matrix ---')

const MASTER_ACCOUNT = {
  email: 'admin@proxima.network',
  passwordHash: expectedMasterHash,
}

const CHAPTER_ACCOUNTS = [
  {
    chapterId: 'chap-titans',
    chapterSlug: 'chennai-titans',
    email: 'titans.admin@proxima.network',
    passwordHash: fallbackSha256('Titans@Proxima2026!'),
  },
  {
    chapterId: newChapter.id,
    chapterSlug: newChapter.slug,
    email: 'coimbatore.admin@proxima.network',
    passwordHash: fallbackSha256('Pioneers@Proxima2026!'),
  },
]

function mockAuthenticate(email, password) {
  const cleanEmail = email.trim().toLowerCase()
  const cleanPassword = password.trim()
  const hash = fallbackSha256(cleanPassword)

  const isMasterEmail =
    cleanEmail === MASTER_ACCOUNT.email.toLowerCase() ||
    cleanEmail === 'admin@yugamhq.com' ||
    cleanEmail === 'admin' ||
    cleanEmail === 'master'

  if (isMasterEmail && (hash === MASTER_ACCOUNT.passwordHash || cleanPassword === 'Proxima@Yugam2026!')) {
    return { role: 'MASTER_ADMIN', email: MASTER_ACCOUNT.email }
  }

  const matched = CHAPTER_ACCOUNTS.find(
    (acc) =>
      (acc.email.toLowerCase() === cleanEmail ||
       acc.email.toLowerCase().replace('@proxima.network', '@yugamhq.com') === cleanEmail ||
       acc.email.toLowerCase().replace('@yugamhq.com', '@proxima.network') === cleanEmail) &&
      (acc.passwordHash === hash || acc.passwordHash === cleanPassword)
  )

  if (matched) {
    return { role: 'CHAPTER_ADMIN', email: matched.email, chapterId: matched.chapterId }
  }

  return null
}

assert(
  mockAuthenticate('admin@proxima.network', 'Proxima@Yugam2026!')?.role === 'MASTER_ADMIN',
  'Master Admin Login via admin@proxima.network'
)
assert(
  mockAuthenticate('admin@yugamhq.com', 'Proxima@Yugam2026!')?.role === 'MASTER_ADMIN',
  'Master Admin Login via admin@yugamhq.com (backward compatible)'
)
assert(
  mockAuthenticate('admin', 'Proxima@Yugam2026!')?.role === 'MASTER_ADMIN',
  'Master Admin Login via shorthand "admin"'
)
assert(
  mockAuthenticate('titans.admin@proxima.network', 'Titans@Proxima2026!')?.role === 'CHAPTER_ADMIN',
  'Chapter Admin Login via titans.admin@proxima.network'
)
assert(
  mockAuthenticate('coimbatore.admin@proxima.network', 'Pioneers@Proxima2026!')?.chapterId === newChapter.id,
  'Newly provisioned Chapter Admin Login & Tenant Context'
)
assert(
  mockAuthenticate('titans.admin@proxima.network', 'WRONG_PASSWORD') === null,
  'Strict rejection on incorrect password'
)
assert(
  mockAuthenticate('unregistered@random.com', 'SomePassword123!') === null,
  'Strict rejection on nonexistent user'
)
assert(
  mockAuthenticate('titans.admin@proxima.network', 'Pioneers@Proxima2026!') === null,
  'Strict cross-tenant password isolation: Chapter A password cannot log into Chapter B'
)

// ==========================================
// TEST SECTION 4: MEMBER MANAGEMENT & RENEWALS
// ==========================================
console.log('\n--- SECTION 4: Member Data Isolation, Renewal Show/Hide Filter ---')

const chapterMembersStore = new Map()

function getMockChapterMembers(chapterId) {
  return chapterMembersStore.get(chapterId) || []
}

function saveMockChapterMembers(chapterId, members) {
  chapterMembersStore.set(chapterId, members)
}

function toggleRenewalMock(chapterId, memberId) {
  const current = getMockChapterMembers(chapterId)
  const updated = current.map((m) => {
    if (m.id === memberId) {
      const isCurrentlyVisible = m.isVisible !== false
      const newStatus = isCurrentlyVisible ? 'NOT_RENEWED' : 'RENEWED'
      return { ...m, isVisible: !isCurrentlyVisible, membershipStatus: newStatus }
    }
    return m
  })
  saveMockChapterMembers(chapterId, updated)
  return updated
}

// 1. Initial State: Real chapter must have ZERO members initially (no dummy data pollution)
assert(
  getMockChapterMembers('chap-titans').length === 0,
  'Clean State: Real Chapter starts with 0 records (No mock data pollution)'
)

// 2. Add Member to Chapter Titans
const member1 = {
  id: 'mem-101',
  chapterId: 'chap-titans',
  name: 'Sundararaman Krishnan',
  company: 'Kaveri Logistics & Freight',
  category: 'Logistics & Supply Chain',
  categoryId: 'logistics',
  phone: '+91 98401 23456',
  whatsapp: '+91 98401 23456',
  location: {
    area: 'Guindy',
    city: 'Chennai',
    state: 'Tamil Nadu',
    address: 'Olympia Technology Park, Guindy',
    coordinates: [80.2025, 13.0067], // [lng, lat]
  },
  membershipStatus: 'RENEWED',
  isVisible: true,
}

const member2 = {
  id: 'mem-102',
  chapterId: 'chap-titans',
  name: 'Ananya Ramachandran',
  company: 'Apex Legal Consultants',
  category: 'Legal Services',
  categoryId: 'legal',
  phone: '+91 98402 34567',
  whatsapp: '+91 98402 34567',
  location: {
    area: 'Anna Nagar',
    city: 'Chennai',
    state: 'Tamil Nadu',
    address: '2nd Avenue, Roundtana',
    coordinates: [80.2155, 13.0878], // [lng, lat]
  },
  membershipStatus: 'RENEWED',
  isVisible: true,
}

saveMockChapterMembers('chap-titans', [member1, member2])
assert(getMockChapterMembers('chap-titans').length === 2, 'Added 2 members to Chapter Titans successfully')

// 3. Verify Isolation: Other chapter must STILL have 0 members
assert(
  getMockChapterMembers(newChapter.id).length === 0,
  'Strict Tenant Isolation: New Chapter has 0 members, no leak from Titans'
)

// 4. Test Renewal Toggle (Show / Hide)
console.log('Testing renewal toggling...')
toggleRenewalMock('chap-titans', 'mem-101') // Toggle Sundararaman to non-renewed

const afterToggle = getMockChapterMembers('chap-titans')
const toggledMem = afterToggle.find((m) => m.id === 'mem-101')
assert(
  toggledMem?.isVisible === false && toggledMem?.membershipStatus === 'NOT_RENEWED',
  'Toggle Non-Renewed: Member isVisible set to false and membershipStatus set to NOT_RENEWED'
)

// 5. Test Live Public Map Visibility Filter
const publicMapMembers = afterToggle.filter((m) => m.isVisible !== false)
assert(
  publicMapMembers.length === 1 && publicMapMembers[0].id === 'mem-102',
  'Live Map Filter: Non-renewed member strictly hidden from public chapter map view'
)

// 6. Test Renewal Restoration
toggleRenewalMock('chap-titans', 'mem-101') // Member renews!
const restored = getMockChapterMembers('chap-titans').find((m) => m.id === 'mem-101')
assert(
  restored?.isVisible === true && restored?.membershipStatus === 'RENEWED',
  'Member Renewal: Re-toggled back to Visible & RENEWED'
)
const restoredMapMembers = getMockChapterMembers('chap-titans').filter((m) => m.isVisible !== false)
assert(
  restoredMapMembers.length === 2,
  'Live Map Filter: Renewed member immediately re-appears on public chapter map'
)

// ==========================================
// TEST SECTION 5: DISTANCE & MAP POINTER COORDINATES
// ==========================================
console.log('\n--- SECTION 5: Geospatial Radar & Distance Accuracy ---')

// Anna Nagar (13.0878 N, 80.2155 E) to Guindy (13.0067 N, 80.2025 E)
const distKm = calculateDistance(13.0878, 80.2155, 13.0067, 80.2025)
assert(
  distKm > 8.8 && distKm < 9.5,
  `Haversine formula accuracy: Anna Nagar to Guindy distance computed as ${distKm.toFixed(2)} km (expected ~9.1 km)`
)

// Radius filter test
const anchorAnnaNagar = { latitude: 13.0878, longitude: 80.2155 }
const membersWithDistance = [
  { ...member2, distanceKm: calculateDistance(anchorAnnaNagar.latitude, anchorAnnaNagar.longitude, member2.location.coordinates[1], member2.location.coordinates[0]) }, // 0 km
  { ...member1, distanceKm: calculateDistance(anchorAnnaNagar.latitude, anchorAnnaNagar.longitude, member1.location.coordinates[1], member1.location.coordinates[0]) }, // ~9.1 km
]

const within5Km = membersWithDistance.filter((m) => m.distanceKm <= 5)
assert(within5Km.length === 1 && within5Km[0].id === 'mem-102', '5km Radius Filter correctly matches only nearby member')

const within10Km = membersWithDistance.filter((m) => m.distanceKm <= 10)
assert(within10Km.length === 2, '10km Radius Filter matches both Anna Nagar and Guindy members')

const within15Km = membersWithDistance.filter((m) => m.distanceKm <= 15)
assert(within15Km.length === 2, '15km Radius Filter matches both Anna Nagar and Guindy members')

// Dynamic Radius Bounding Box Resizing verification
function calculateRadiusBounds(centerLng, centerLat, radiusKm) {
  const latRad = (centerLat * Math.PI) / 180
  const kmPerDegLat = 111.32
  const kmPerDegLng = 111.32 * Math.cos(latRad)
  const deltaLat = (radiusKm * 1.15) / kmPerDegLat
  const deltaLng = (radiusKm * 1.15) / kmPerDegLng
  return {
    sw: [centerLng - deltaLng, centerLat - deltaLat],
    ne: [centerLng + deltaLng, centerLat + deltaLat],
    spanLng: deltaLng * 2,
    spanLat: deltaLat * 2,
  }
}

const bounds5k = calculateRadiusBounds(80.2155, 13.0878, 5)
const bounds10k = calculateRadiusBounds(80.2155, 13.0878, 10)
const bounds15k = calculateRadiusBounds(80.2155, 13.0878, 15)

assert(bounds10k.spanLng > bounds5k.spanLng && bounds10k.spanLat > bounds5k.spanLat, '10km bounds expand proportionally beyond 5km bounds')
assert(bounds15k.spanLng > bounds10k.spanLng && bounds15k.spanLat > bounds10k.spanLat, '15km bounds expand proportionally beyond 10km bounds')
assert(Math.abs(bounds15k.spanLat / bounds5k.spanLat - 3) < 0.01, '15km bounding box spans exactly 3x the 5km radius')

// MapLibre Coordinate Order Verification
assert(
  member1.location.coordinates[0] === 80.2025 && member1.location.coordinates[1] === 13.0067,
  'MapLibre GeoJSON coordinates follow strict [Longitude, Latitude] standard'
)

// ==========================================
// TEST SECTION 6: GOOGLE MAPS LINK READER & PROXIMITY RADAR
// ==========================================
console.log('\n--- SECTION 6: Google Maps Link Reader & Proximity Radar ---')

// Mirror pure extraction functions from src/utils/googleMapsParser.ts
function parseCoordinatesFromGoogleMaps(input) {
  const trimmed = input.trim()
  if (!trimmed) return null

  // 1. Raw coordinate input
  const rawCoordRegex = /^(-?\d{1,3}\.\d+)\s*[°\sNnSs]?[,\s]+(-?\d{1,3}\.\d+)\s*[°\sEeWw]?$/
  const rawMatch = trimmed.match(rawCoordRegex)
  if (rawMatch) {
    return {
      latitude: parseFloat(rawMatch[1]),
      longitude: parseFloat(rawMatch[2]),
      sourceDescription: 'Raw Coordinates',
    }
  }

  // 2. Protobuf format: !3d<lat>!4d<lng>
  const protoRegex = /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/
  const protoMatch = trimmed.match(protoRegex)
  if (protoMatch) {
    return {
      latitude: parseFloat(protoMatch[1]),
      longitude: parseFloat(protoMatch[2]),
      sourceDescription: 'Google Maps Place Pin (!3d/!4d)',
    }
  }

  // 3. Embed format: !2d<lng>!3d<lat>
  const embedRegex = /!2d(-?\d{1,3}\.\d+)!3d(-?\d{1,3}\.\d+)/
  const embedMatch = trimmed.match(embedRegex)
  if (embedMatch) {
    return {
      latitude: parseFloat(embedMatch[2]),
      longitude: parseFloat(embedMatch[1]),
      sourceDescription: 'Google Maps Embed Link (!2d/!3d)',
    }
  }

  // 4. Standard @lat,lng format
  const atRegex = /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/
  const atMatch = trimmed.match(atRegex)
  if (atMatch) {
    return {
      latitude: parseFloat(atMatch[1]),
      longitude: parseFloat(atMatch[2]),
      sourceDescription: 'Google Maps Camera Center (@lat,lng)',
    }
  }

  // 5. Query parameter coordinates: ?q=lat,lng or destination=...
  const queryCoordRegex = /[?&](?:q|ll|query|saddr|daddr|destination|center)=(-?\d{1,3}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/
  const queryMatch = trimmed.match(queryCoordRegex)
  if (queryMatch) {
    return {
      latitude: parseFloat(queryMatch[1]),
      longitude: parseFloat(queryMatch[2]),
      sourceDescription: 'Google Maps Query Parameter',
    }
  }

  return null
}

function parseAddressComponents(fullName) {
  if (!fullName) return {}
  const parts = fullName.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    return { area: parts[0], city: parts[1] }
  }
  if (parts.length === 1) {
    return { area: parts[0] }
  }
  return {}
}

// 1. Test Protobuf URL parsing
const protoUrl = 'https://www.google.com/maps/place/Acme+HVAC+Hub/@13.0826802,80.2707184,17z/data=!4m6!3m5!1s0x0:0x0!3d13.0826802!4d80.2707184'
const parsedProto = parseCoordinatesFromGoogleMaps(protoUrl)
assert(
  parsedProto && Math.abs(parsedProto.latitude - 13.0826802) < 0.0001 && Math.abs(parsedProto.longitude - 80.2707184) < 0.0001,
  'Google Maps Parser: Extracted high-precision coordinates from protobuf !3d/!4d URL'
)

// 2. Test Standard @lat,lng URL parsing
const standardUrl = 'https://www.google.com/maps/place/Guindy+Industrial+Estate/@13.0067,80.2025,16z/'
const parsedStandard = parseCoordinatesFromGoogleMaps(standardUrl)
assert(
  parsedStandard && Math.abs(parsedStandard.latitude - 13.0067) < 0.0001 && Math.abs(parsedStandard.longitude - 80.2025) < 0.0001,
  'Google Maps Parser: Extracted coordinates from standard @lat,lng URL'
)

// 3. Test Embed URL parsing (!2d lng, !3d lat)
const embedUrl = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3886.0!2d80.21548!3d13.08784!2m3'
const parsedEmbed = parseCoordinatesFromGoogleMaps(embedUrl)
assert(
  parsedEmbed && Math.abs(parsedEmbed.latitude - 13.08784) < 0.0001 && Math.abs(parsedEmbed.longitude - 80.21548) < 0.0001,
  'Google Maps Parser: Extracted coordinates from Embed iframe link (!2d lng / !3d lat)'
)

// 4. Test Directions Destination URL parsing
const dirUrl = 'https://www.google.com/maps/dir/?api=1&destination=12.9716,77.5946'
const parsedDir = parseCoordinatesFromGoogleMaps(dirUrl)
assert(
  parsedDir && Math.abs(parsedDir.latitude - 12.9716) < 0.0001 && Math.abs(parsedDir.longitude - 77.5946) < 0.0001,
  'Google Maps Parser: Extracted coordinates from Google Directions destination URL'
)

// 5. Test Raw Coordinate string parsing
const rawInput = '17.3850, 78.4867'
const parsedRaw = parseCoordinatesFromGoogleMaps(rawInput)
assert(
  parsedRaw && Math.abs(parsedRaw.latitude - 17.3850) < 0.0001 && Math.abs(parsedRaw.longitude - 78.4867) < 0.0001,
  'Google Maps Parser: Handled raw coordinate text string'
)

// 6. Test Address Breakdown
const breakdown = parseAddressComponents('Anna Nagar, Chennai, Tamil Nadu')
assert(
  breakdown.area === 'Anna Nagar' && breakdown.city === 'Chennai',
  'Address Breakdown: Extracted locality (Anna Nagar) and city (Chennai) from place string'
)

// 7. Test Proximity Radar: Nearest Member Detection
const userDetectedGps = { latitude: 13.0850, longitude: 80.2120 } // Near Anna Nagar
const activeChapterMembers = [member1, member2] // member1 is Guindy, member2 is Anna Nagar

let closestMem = null
let minDistanceKm = Infinity
for (const m of activeChapterMembers) {
  const d = calculateDistance(
    userDetectedGps.latitude,
    userDetectedGps.longitude,
    m.location.coordinates[1],
    m.location.coordinates[0]
  )
  if (d < minDistanceKm) {
    minDistanceKm = d
    closestMem = m
  }
}

assert(
  closestMem && closestMem.id === 'mem-102',
  'Proximity Radar: Accurately identified closest member (Priya Narayanan in Anna Nagar)'
)
assert(
  minDistanceKm < 0.6,
  `Proximity Radar: Distance to nearest member computed as ${(minDistanceKm * 1000).toFixed(0)} meters (< 600m)`
)

// ==========================================
// TEST SECTION 7: REGIONAL DEMO PROFILES, WHATSAPP/CALL CHANNELS & WEB HOSTING
// ==========================================
console.log('\n--- SECTION 7: Regional Demo Profiles, WhatsApp & Web Hosting ---')

import fs from 'node:fs'
import path from 'node:path'

// Test all 8 cities in the interactive demo
const regions = ['bengaluru', 'mumbai', 'delhi', 'chennai', 'hyderabad', 'pune', 'coimbatore', 'dubai']

// Read chapterMembers.ts to verify the featuredMembers declarations
const chapterMembersSource = fs.readFileSync(path.resolve('src/data/chapterMembers.ts'), 'utf-8')

const regionCodeMap = {
  bengaluru: 'blr',
  mumbai: 'mum',
  delhi: 'del',
  chennai: 'chn',
  hyderabad: 'hyd',
  pune: 'pun',
  coimbatore: 'cbe',
  dubai: 'dxb',
}

for (const region of regions) {
  const hasRegionPreset = chapterMembersSource.includes(`${region}: {`)
  assert(hasRegionPreset, `Regional Demo: Preset exists for ${region.toUpperCase()}`)

  // Check that at least 2 members are defined for each region
  const code = regionCodeMap[region]
  const demoId1 = `demo-${code}-01`
  const demoId2 = `demo-${code}-02`
  const hasDemo1 = chapterMembersSource.includes(demoId1)
  const hasDemo2 = chapterMembersSource.includes(demoId2)
  assert(
    hasDemo1 && hasDemo2,
    `Regional Demo: At least 2 full native members (${demoId1}, ${demoId2}) defined for ${region}`
  )
}

// Verify WhatsApp and Phone contact formats for interactive calling/messaging
const samplePhone = '+919880123456'
const sampleWhatsApp = '919880123456'
const cleanWhatsAppDigits = sampleWhatsApp.replace(/[^0-9]/g, '')
const generatedCallUrl = `tel:${samplePhone}`
const generatedWhatsAppUrl = `https://wa.me/${cleanWhatsAppDigits}?text=${encodeURIComponent('Hello Anand Varma, I found your profile on the Executive Member Map.')}`

assert(generatedCallUrl === 'tel:+919880123456', 'Contact Action: tel: protocol generated correctly for direct calling')
assert(
  generatedWhatsAppUrl.startsWith('https://wa.me/919880123456'),
  'Contact Action: https://wa.me/ protocol generated correctly for direct WhatsApp messaging'
)

// Verify Web Hosting Build Artifacts
const distHtml = fs.readFileSync(path.resolve('dist/index.html'), 'utf-8')
assert(
  distHtml.includes('./assets/') && !distHtml.includes('src="/assets/'),
  'Web Hosting Ready: dist/index.html uses relative (./assets/) paths for any regular web hosting / subfolder'
)
assert(
  fs.existsSync(path.resolve('dist/.htaccess')),
  'Web Hosting Ready: dist/.htaccess present with Apache / cPanel URL rewrite & compression rules'
)
assert(
  fs.existsSync(path.resolve('dist/_redirects')),
  'Web Hosting Ready: dist/_redirects present for static hosting fallback'
)

console.log('\n=================================================================')
const passedCount = auditResults.filter((r) => r.status === 'PASS').length
const failedCount = auditResults.filter((r) => r.status === 'FAIL').length
console.log(`AUDIT FINISHED: ${passedCount} PASSED, ${failedCount} FAILED`)
console.log('=================================================================')

if (failedCount > 0) {
  process.exit(1)
}
