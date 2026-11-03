export interface GeocodingResult {
  displayName: string
  areaName: string
  latitude: number
  longitude: number
  source: 'preset' | 'osm_nominatim'
}

// Instant Pan-India & Global landmark and locality dictionary
export const PAN_INDIA_GLOBAL_HUBS: GeocodingResult[] = [
  // Bengaluru
  { areaName: 'Indiranagar', displayName: 'Indiranagar (100ft & 12th Main), Bengaluru', latitude: 12.9719, longitude: 77.6412, source: 'preset' },
  { areaName: 'Koramangala', displayName: 'Koramangala (5th & 7th Block), Bengaluru', latitude: 12.9352, longitude: 77.6245, source: 'preset' },
  { areaName: 'Whitefield', displayName: 'Whitefield (ITPL Main Road), Bengaluru', latitude: 12.9698, longitude: 77.7499, source: 'preset' },
  { areaName: 'MG Road', displayName: 'MG Road (CBD / Trinity), Bengaluru', latitude: 12.9756, longitude: 77.6074, source: 'preset' },
  { areaName: 'Electronic City', displayName: 'Electronic City Phase 1, Bengaluru', latitude: 12.8452, longitude: 77.6766, source: 'preset' },

  // Mumbai
  { areaName: 'BKC', displayName: 'Bandra Kurla Complex (G Block), Mumbai', latitude: 19.0657, longitude: 72.8656, source: 'preset' },
  { areaName: 'Nariman Point', displayName: 'Nariman Point (Maker Chambers), Mumbai', latitude: 18.9256, longitude: 72.8236, source: 'preset' },
  { areaName: 'Lower Parel', displayName: 'Lower Parel (One World Center / High Street Phoenix), Mumbai', latitude: 18.9953, longitude: 72.8296, source: 'preset' },
  { areaName: 'Andheri East', displayName: 'Andheri East (MIDC / Chakala), Mumbai', latitude: 19.1136, longitude: 72.8697, source: 'preset' },
  { areaName: 'Powai', displayName: 'Powai (Hiranandani Business Park), Mumbai', latitude: 19.1176, longitude: 72.9056, source: 'preset' },

  // Delhi NCR
  { areaName: 'Connaught Place', displayName: 'Connaught Place (Inner Circle & Barakhamba), Delhi', latitude: 28.6315, longitude: 77.2218, source: 'preset' },
  { areaName: 'Cyber City Gurgaon', displayName: 'DLF Cyber City / Cyber Hub, Gurugram', latitude: 28.4950, longitude: 77.0878, source: 'preset' },
  { areaName: 'Noida Sec 62', displayName: 'Noida Sector 62 (IT & Commercial Hub), Noida', latitude: 28.6256, longitude: 77.3649, source: 'preset' },
  { areaName: 'Aerocity', displayName: 'Aerocity (Worldmark / Hospitality District), Delhi', latitude: 28.5528, longitude: 77.1215, source: 'preset' },

  // Chennai
  { areaName: 'Anna Nagar', displayName: 'Anna Nagar (Roundtana & 2nd Ave), Chennai', latitude: 13.0878, longitude: 80.2155, source: 'preset' },
  { areaName: 'T. Nagar', displayName: 'T. Nagar (Panagal Park & Pondy Bazaar), Chennai', latitude: 13.0418, longitude: 80.2341, source: 'preset' },
  { areaName: 'Guindy', displayName: 'Guindy (Olympia Tech Park / Kathipara), Chennai', latitude: 13.0115, longitude: 80.2038, source: 'preset' },
  { areaName: 'Alwarpet', displayName: 'Alwarpet (TTK Road / Eldams Road), Chennai', latitude: 13.0336, longitude: 80.2520, source: 'preset' },
  { areaName: 'Nungambakkam', displayName: 'Nungambakkam (High Road / Sterling Rd), Chennai', latitude: 13.0620, longitude: 80.2415, source: 'preset' },
  { areaName: 'OMR - Perungudi', displayName: 'Perungudi / Kandanchavadi (OMR IT Corridor), Chennai', latitude: 12.9654, longitude: 80.2462, source: 'preset' },
  { areaName: 'Velachery', displayName: 'Velachery (100 Feet Bypass / Phoenix MarketCity), Chennai', latitude: 12.9815, longitude: 80.2180, source: 'preset' },
  { areaName: 'Kilpauk', displayName: 'Kilpauk (Poonamallee High Road), Chennai', latitude: 13.0784, longitude: 80.2432, source: 'preset' },
  { areaName: 'Adyar', displayName: 'Adyar (Gandhi Nagar / Sardar Patel Rd), Chennai', latitude: 13.0067, longitude: 80.2570, source: 'preset' },
  { areaName: 'Porur', displayName: 'Porur (Junction / DLF Cybercity), Chennai', latitude: 13.0382, longitude: 80.1565, source: 'preset' },

  // Hyderabad
  { areaName: 'Hitec City', displayName: 'Hitec City (Mindspace / Cyber Towers), Hyderabad', latitude: 17.4435, longitude: 78.3814, source: 'preset' },
  { areaName: 'Gachibowli', displayName: 'Gachibowli (Financial District), Hyderabad', latitude: 17.4401, longitude: 78.3498, source: 'preset' },
  { areaName: 'Banjara Hills', displayName: 'Banjara Hills (Road No. 12), Hyderabad', latitude: 17.4156, longitude: 78.4357, source: 'preset' },

  // Pune
  { areaName: 'Koregaon Park', displayName: 'Koregaon Park (North Main Road), Pune', latitude: 18.5362, longitude: 73.8967, source: 'preset' },
  { areaName: 'Hinjewadi', displayName: 'Hinjewadi IT Park Phase 1, Pune', latitude: 18.5913, longitude: 73.7297, source: 'preset' },
  { areaName: 'Viman Nagar', displayName: 'Viman Nagar (Phoenix Marketcity), Pune', latitude: 18.5679, longitude: 73.9143, source: 'preset' },

  // Coimbatore
  { areaName: 'Race Course', displayName: 'Race Course Road, Coimbatore', latitude: 11.0067, longitude: 76.9754, source: 'preset' },
  { areaName: 'Avinashi Road', displayName: 'Avinashi Road (Nava India), Coimbatore', latitude: 11.0189, longitude: 76.9942, source: 'preset' },

  // Global / International (Dubai, Singapore, London)
  { areaName: 'DIFC', displayName: 'Dubai International Financial Centre (Gate Building), Dubai', latitude: 25.2104, longitude: 55.2798, source: 'preset' },
  { areaName: 'Downtown Dubai', displayName: 'Downtown Dubai (Emaar Square / Burj Area), Dubai', latitude: 25.1972, longitude: 55.2744, source: 'preset' },
  { areaName: 'Business Bay', displayName: 'Business Bay (Al Abraj Street), Dubai', latitude: 25.1856, longitude: 55.2678, source: 'preset' },
  { areaName: 'Marina Bay', displayName: 'Marina Bay Financial Centre, Singapore', latitude: 1.2801, longitude: 103.8542, source: 'preset' },
  { areaName: 'Canary Wharf', displayName: 'Canary Wharf Financial District, London', latitude: 51.5054, longitude: -0.0209, source: 'preset' },
]

// Backward-compatible alias for existing tests and components
export const CHENNAI_HUBS: GeocodingResult[] = PAN_INDIA_GLOBAL_HUBS

/**
 * Searches local Pan-India and global preset hubs first;
 * falls back to OpenStreetMap Nominatim for any global query.
 */
export async function searchLocation(query: string, contextCity?: string): Promise<GeocodingResult[]> {
  const cleanQuery = query.trim().toLowerCase()
  if (!cleanQuery) return []

  // 1. Instant local and national preset matches
  const localMatches = PAN_INDIA_GLOBAL_HUBS.filter(
    (hub) =>
      hub.areaName.toLowerCase().includes(cleanQuery) ||
      hub.displayName.toLowerCase().includes(cleanQuery)
  )

  if (localMatches.length > 0) {
    return localMatches
  }

  // 2. OpenStreetMap Nominatim for any global city or address
  try {
    const searchParam = contextCity ? `${query}, ${contextCity}` : query
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchParam
      )}&limit=5`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'ProximaNetworkMap/2.0',
        },
      }
    )
    if (!res.ok) return []
    const data = await res.json()

    return data.map((item: { display_name: string; lat: string; lon: string }) => ({
      displayName: item.display_name,
      areaName: item.display_name.split(',')[0],
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      source: 'osm_nominatim' as const,
    }))
  } catch {
    return []
  }
}
