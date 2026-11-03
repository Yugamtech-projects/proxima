export interface LocationZoneColor {
  zoneName: string
  primaryHex: string
  accentHex: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
  glowRgba: string
}

// Apple Vibrant Executive Neighborhood Color Palette
const PALETTE_ZONES: Record<string, { primaryHex: string; accentHex: string; badgeBg: string; badgeText: string; badgeBorder: string; glowRgba: string }> = {
  // Sapphire Blue (Central / North-West hubs)
  sapphire: {
    primaryHex: '#0071E3',
    accentHex: '#38BDF8',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    glowRgba: 'rgba(0, 113, 227, 0.4)',
  },
  // Emerald Jade (South / Tech / Green corridors)
  emerald: {
    primaryHex: '#10B981',
    accentHex: '#34D399',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    glowRgba: 'rgba(16, 185, 129, 0.4)',
  },
  // Royal Amethyst (Central-South / Luxury / Retail)
  amethyst: {
    primaryHex: '#8B5CF6',
    accentHex: '#A78BFA',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    glowRgba: 'rgba(139, 92, 246, 0.4)',
  },
  // Solar Amber (IT Corridors / Expressways)
  amber: {
    primaryHex: '#F59E0B',
    accentHex: '#FBBF24',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    glowRgba: 'rgba(245, 158, 11, 0.4)',
  },
  // Ocean Cyan (Coastal / Creative corridors)
  cyan: {
    primaryHex: '#06B6D4',
    accentHex: '#22D3EE',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-800',
    badgeBorder: 'border-cyan-200',
    glowRgba: 'rgba(6, 182, 212, 0.4)',
  },
  // Coral Rose (North Commerce / Heritage / Ports)
  coral: {
    primaryHex: '#F43F5E',
    accentHex: '#FB7185',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
    glowRgba: 'rgba(244, 63, 94, 0.4)',
  },
  // Deep Indigo (Industrial / Outer hubs)
  indigo: {
    primaryHex: '#6366F1',
    accentHex: '#818CF8',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    glowRgba: 'rgba(99, 102, 241, 0.4)',
  },
  // Violet Dusk (Prime Financial / Residential)
  violet: {
    primaryHex: '#7C3AED',
    accentHex: '#C084FC',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-800',
    badgeBorder: 'border-violet-200',
    glowRgba: 'rgba(124, 58, 237, 0.4)',
  },
}

// Preset mapping for prominent neighborhoods across chapters
const KNOWN_AREAS: Record<string, keyof typeof PALETTE_ZONES> = {
  // Chennai
  'anna nagar': 'sapphire',
  'kilpauk': 'sapphire',
  'shenoy nagar': 'sapphire',
  't. nagar': 'amethyst',
  't nagar': 'amethyst',
  'alwarpet': 'violet',
  'nungambakkam': 'violet',
  'guindy': 'emerald',
  'ekkattuthangal': 'emerald',
  'velachery': 'emerald',
  'adyar': 'cyan',
  'besant nagar': 'cyan',
  'thiruvanmiyur': 'cyan',
  'omr': 'amber',
  'sholinganallur': 'amber',
  'perungudi': 'amber',
  'parrys': 'coral',
  'george town': 'coral',
  'royapuram': 'coral',
  'ambattur': 'indigo',
  'mogappair': 'indigo',
  'kodambakkam': 'amethyst',

  // Bengaluru
  'koramangala': 'amethyst',
  'indiranagar': 'sapphire',
  'whitefield': 'amber',
  'hsr layout': 'emerald',
  'jayanagar': 'cyan',
  'mg road': 'coral',
  'electronic city': 'indigo',

  // Mumbai
  'bandra': 'amethyst',
  'bkc': 'sapphire',
  'andheri': 'indigo',
  'lower parel': 'cyan',
  'colaba': 'coral',
  'powai': 'emerald',

  // Delhi NCR
  'connaught place': 'sapphire',
  'gurgaon': 'amber',
  'noida': 'emerald',
  'south extension': 'amethyst',
  'nehru place': 'coral',

  // Hyderabad
  'hitec city': 'amber',
  'jubilee hills': 'amethyst',
  'banjara hills': 'violet',
  'gachibowli': 'emerald',
  'secunderabad': 'sapphire',
}

const PALETTE_KEYS = Object.keys(PALETTE_ZONES) as (keyof typeof PALETTE_ZONES)[]

/**
 * Deterministically computes a harmonious Apple vibrant zone color for any location.
 */
export function getLocationZoneColor(areaName?: string, cityName?: string): LocationZoneColor {
  const cleanArea = (areaName || cityName || 'Central').trim()
  const lower = cleanArea.toLowerCase()

  // 1. Direct match on known neighborhood
  for (const [key, paletteKey] of Object.entries(KNOWN_AREAS)) {
    if (lower.includes(key)) {
      const p = PALETTE_ZONES[paletteKey]
      return {
        zoneName: cleanArea,
        ...p,
      }
    }
  }

  // 2. Deterministic string hash for unlisted areas across any city/state in India
  let hash = 0
  for (let i = 0; i < lower.length; i++) {
    hash = (hash << 5) - hash + lower.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % PALETTE_KEYS.length
  const selectedKey = PALETTE_KEYS[index]
  const p = PALETTE_ZONES[selectedKey]

  return {
    zoneName: cleanArea,
    ...p,
  }
}
