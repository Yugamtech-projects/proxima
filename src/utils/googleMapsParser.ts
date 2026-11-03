import { searchLocation } from './geocoding'

export interface ParsedLocationResult {
  latitude: number
  longitude: number
  extractedName?: string
  suggestedArea?: string
  suggestedCity?: string
  confidence: 'HIGH_COORDINATES' | 'GEOCODED'
  sourceDescription: string
}

/**
 * Intelligent Google Maps URL & Location string parser.
 * Handles:
 * 1. Standard Google Maps URLs: https://www.google.com/maps/place/.../@13.08784,80.21548,17z
 * 2. Place protobuf URLs: !3d13.08784!4d80.21548 (lat, lng)
 * 3. Embed iframe URLs: !2d80.21548!3d13.08784 (lng, lat)
 * 4. Query string coordinates: ?q=13.08784,80.21548 or ?ll=13.08784,80.21548 or destination=...
 * 5. Raw pasted coordinates: "13.08784, 80.21548" or "13.08784N, 80.21548E"
 * 6. Named Google Maps place links: /maps/place/Anna+Nagar+Tower+Park
 * 7. Short links (maps.app.goo.gl) with client-side resolution attempt
 */
export async function parseGoogleMapsLocation(input: string): Promise<ParsedLocationResult | null> {
  const trimmed = input.trim()
  if (!trimmed) return null

  // 1. Check for raw coordinate input: "13.08784, 80.21548" or "13.08784 80.21548"
  const rawCoordRegex = /^(-?\d{1,3}\.\d+)\s*[°\sNnSs]?[,\s]+(-?\d{1,3}\.\d+)\s*[°\sEeWw]?$/
  const rawMatch = trimmed.match(rawCoordRegex)
  if (rawMatch) {
    const lat = parseFloat(rawMatch[1])
    const lng = parseFloat(rawMatch[2])
    if (isValidLatLng(lat, lng)) {
      return {
        latitude: lat,
        longitude: lng,
        confidence: 'HIGH_COORDINATES',
        sourceDescription: 'Raw Latitude & Longitude Coordinates',
      }
    }
  }

  // 2. Check for Protobuf format: !3d<lat>!4d<lng> (most accurate in Google Maps place links)
  const protoRegex = /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/
  const protoMatch = trimmed.match(protoRegex)
  if (protoMatch) {
    const lat = parseFloat(protoMatch[1])
    const lng = parseFloat(protoMatch[2])
    if (isValidLatLng(lat, lng)) {
      const placeName = extractPlaceNameFromUrl(trimmed)
      const components = parseAddressComponents(placeName)
      return {
        latitude: lat,
        longitude: lng,
        extractedName: placeName,
        suggestedArea: components.area,
        suggestedCity: components.city,
        confidence: 'HIGH_COORDINATES',
        sourceDescription: 'Google Maps Place Pin (!3d/!4d)',
      }
    }
  }

  // 3. Check for Embed format: !2d<lng>!3d<lat>
  const embedRegex = /!2d(-?\d{1,3}\.\d+)!3d(-?\d{1,3}\.\d+)/
  const embedMatch = trimmed.match(embedRegex)
  if (embedMatch) {
    const lng = parseFloat(embedMatch[1])
    const lat = parseFloat(embedMatch[2])
    if (isValidLatLng(lat, lng)) {
      const placeName = extractPlaceNameFromUrl(trimmed)
      const components = parseAddressComponents(placeName)
      return {
        latitude: lat,
        longitude: lng,
        extractedName: placeName,
        suggestedArea: components.area,
        suggestedCity: components.city,
        confidence: 'HIGH_COORDINATES',
        sourceDescription: 'Google Maps Embed Link (!2d/!3d)',
      }
    }
  }

  // 4. Check for standard @<lat>,<lng> pattern (e.g. /@13.08784,80.21548,17z)
  const atRegex = /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/
  const atMatch = trimmed.match(atRegex)
  if (atMatch) {
    const lat = parseFloat(atMatch[1])
    const lng = parseFloat(atMatch[2])
    if (isValidLatLng(lat, lng)) {
      const placeName = extractPlaceNameFromUrl(trimmed)
      const components = parseAddressComponents(placeName)
      return {
        latitude: lat,
        longitude: lng,
        extractedName: placeName,
        suggestedArea: components.area,
        suggestedCity: components.city,
        confidence: 'HIGH_COORDINATES',
        sourceDescription: 'Google Maps Geographic Coordinates (@lat,lng)',
      }
    }
  }

  // 5. Check for query parameter coordinates: ?q=13.08784,80.21548 or ?ll=13.08784,80.21548 or destination=...
  const queryCoordRegex = /[?&](?:q|ll|query|saddr|daddr|destination|center)=(-?\d{1,3}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/
  const queryMatch = trimmed.match(queryCoordRegex)
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1])
    const lng = parseFloat(queryMatch[2])
    if (isValidLatLng(lat, lng)) {
      const placeName = extractPlaceNameFromUrl(trimmed)
      const components = parseAddressComponents(placeName)
      return {
        latitude: lat,
        longitude: lng,
        extractedName: placeName,
        suggestedArea: components.area,
        suggestedCity: components.city,
        confidence: 'HIGH_COORDINATES',
        sourceDescription: 'Google Maps Query Parameter',
      }
    }
  }

  // 6. If it's a short URL (maps.app.goo.gl or goo.gl/maps), try to resolve or follow redirect
  if (trimmed.includes('maps.app.goo.gl/') || trimmed.includes('goo.gl/maps/')) {
    try {
      const response = await fetch(trimmed, { method: 'GET', redirect: 'follow' })
      if (response.url && response.url !== trimmed) {
        const resolved = await parseGoogleMapsLocation(response.url)
        if (resolved) {
          return {
            ...resolved,
            sourceDescription: `Resolved from Google Maps Shortlink (${resolved.sourceDescription})`,
          }
        }
      }
    } catch {
      // Browser CORS may prevent following external shortlinks directly in JS
    }
  }

  // 7. If it's a Google Maps URL with a place name (/place/Anna+Nagar) but no numeric coords, geocode it
  const placeName = extractPlaceNameFromUrl(trimmed)
  if (placeName) {
    const geocoded = await searchLocation(placeName)
    if (geocoded.length > 0) {
      const components = parseAddressComponents(placeName)
      return {
        latitude: geocoded[0].latitude,
        longitude: geocoded[0].longitude,
        extractedName: placeName,
        suggestedArea: components.area || geocoded[0].areaName,
        suggestedCity: components.city,
        confidence: 'GEOCODED',
        sourceDescription: `Geocoded from Place Name: "${placeName}"`,
      }
    }
  }

  // 8. If user pasted general text / address, try geocoding it directly
  if (trimmed.length > 3 && !trimmed.startsWith('http')) {
    const geocoded = await searchLocation(trimmed)
    if (geocoded.length > 0) {
      const locName = geocoded[0].areaName || geocoded[0].displayName
      const components = parseAddressComponents(locName)
      return {
        latitude: geocoded[0].latitude,
        longitude: geocoded[0].longitude,
        extractedName: locName,
        suggestedArea: components.area || geocoded[0].areaName,
        suggestedCity: components.city,
        confidence: 'GEOCODED',
        sourceDescription: `Geocoded Address: "${locName}"`,
      }
    }
  }

  return null
}

function isValidLatLng(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

function extractPlaceNameFromUrl(url: string): string | undefined {
  try {
    const placeMatch = url.match(/\/maps\/place\/([^/@?#]+)/)
    if (placeMatch && placeMatch[1]) {
      const decoded = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
      return decoded.trim()
    }
    const searchMatch = url.match(/\/maps\/search\/([^/@?#]+)/)
    if (searchMatch && searchMatch[1]) {
      const decoded = decodeURIComponent(searchMatch[1].replace(/\+/g, ' '))
      return decoded.trim()
    }
    // Also check for ?q=Some+Place+Name
    const qMatch = url.match(/[?&]q=([^&]+)/)
    if (qMatch && qMatch[1] && !/^-?\d+\.\d+/.test(qMatch[1])) {
      const decoded = decodeURIComponent(qMatch[1].replace(/\+/g, ' '))
      return decoded.trim()
    }
  } catch {
    // ignore URL decoding errors
  }
  return undefined
}

export function parseAddressComponents(fullName?: string): { area?: string; city?: string } {
  if (!fullName) return {}
  const parts = fullName.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    return {
      area: parts[0],
      city: parts[1],
    }
  }
  if (parts.length === 1) {
    return { area: parts[0] }
  }
  return {}
}
