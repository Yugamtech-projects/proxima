import React, { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Compass } from 'lucide-react'
import type { Member, Chapter, DistanceRadius } from '../../types/member'
import { getLocationZoneColor } from '../../utils/locationColor'
import { openExternalNavigation } from '../../utils/navigation'

interface MapContainerProps {
  members: Member[]
  selectedMemberId: string | null
  onSelectMember: (member: Member | null) => void
  onOpenProfile?: (member: Member) => void
  userLocation: { latitude: number; longitude: number } | null
  destinationLocation: { name: string; latitude: number; longitude: number } | null
  radiusFilter: DistanceRadius
  activeChapter: Chapter
  anchorPoint?: { name: string; latitude: number; longitude: number } | null
  triggerFlightAnimation?: boolean
  onFlightComplete?: () => void
  onNavigateMember?: (member: Member) => void
}

// Whole country of India overview coordinates
const INDIA_CENTER: [number, number] = [79.0, 21.0]
const INDIA_ZOOM = 4.4

// 100% Free & Open Bulletproof Tile Specification (Fast, sharp, zero API keys or CORS restrictions)
const BULLETPROOF_OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
}

/**
 * Generates a smooth 64-vertex GeoJSON circle polygon
 * for the visual distance radar boundary.
 */
function generateCirclePolygon(center: [number, number], radiusKm: number, numPoints = 64) {
  const [lng, lat] = center
  const coordinates: [number, number][] = []
  const latRad = (lat * Math.PI) / 180
  const kmPerDegLat = 111.32
  const kmPerDegLng = 111.32 * Math.cos(latRad)

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i * 2 * Math.PI) / numPoints
    const dLat = (radiusKm * Math.sin(angle)) / kmPerDegLat
    const dLng = (radiusKm * Math.cos(angle)) / (kmPerDegLng > 0.001 ? kmPerDegLng : 1)
    coordinates.push([lng + dLng, lat + dLat])
  }

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coordinates],
    },
    properties: {
      radiusKm,
    },
  }
}

/**
 * Creates an ultra-sharp, VisionOS frosted glass popup card
 * anchored directly above the selected member's map marker.
 */
function createMemberPopupElement(
  member: Member,
  zone: ReturnType<typeof getLocationZoneColor>,
  onOpenProfile?: (member: Member) => void,
  onClose?: () => void,
  onNavigateMember?: (member: Member) => void
): HTMLElement {
  const container = document.createElement('div')
  container.className = 'proxima-popup-card text-left select-none'

  const cleanPhone = (member.phone || member.whatsapp || '').replace(/[^0-9]/g, '')
  const hasWhatsapp = !!(member.whatsapp || member.phone)
  const hasPhone = !!member.phone

  const distanceText =
    member.distanceKm !== undefined
      ? member.distanceKm < 1
        ? `${Math.round(member.distanceKm * 1000)} m away`
        : `${member.distanceKm.toFixed(1)} km away`
      : null

  container.innerHTML = `
    <!-- Top Micro Bar: Verified Tag & Close Button -->
    <div class="flex items-center justify-between pb-2 mb-2.5 border-b border-black/[0.06]">
      <div class="flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 font-display">
          Verified Chapter Partner
        </span>
      </div>
      <button
        type="button"
        id="popup-close-btn"
        class="w-6 h-6 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
        title="Dismiss Popup"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <!-- Member Identity Row -->
    <div class="flex items-start gap-3">
      <!-- High-Res Avatar Squircle with Location Zone Ring -->
      <div class="relative flex-shrink-0">
        <div class="w-12 h-12 rounded-[16px] overflow-hidden bg-slate-100 ring-2 ring-white shadow-xs" style="box-shadow: 0 0 0 2px ${zone.primaryHex};">
          <img
            src="${member.photoUrl}"
            alt="${member.name}"
            class="w-full h-full object-cover"
            style="image-rendering: -webkit-optimize-contrast;"
          />
        </div>
        ${
          member.oneToOneAvailability === 'AVAILABLE'
            ? '<span class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white shadow-xs" title="Available for 1-to-1 Meetings"></span>'
            : ''
        }
      </div>

      <!-- Names & Company -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <h3 class="font-display text-[15px] font-extrabold text-[#0F172A] tracking-tight leading-tight truncate">
            ${member.name}
          </h3>
          <svg class="w-3.5 h-3.5 text-[#0071E3] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <p class="text-[12px] font-semibold text-slate-600 truncate mt-0.5">
          ${member.company}
        </p>
        
        <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider" style="background-color: ${zone.primaryHex}18; color: ${zone.primaryHex};">
            ${member.category}
          </span>
          <span class="text-[10px] font-medium text-slate-500 flex items-center gap-0.5">
            <svg class="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            ${member.location.area}, ${member.location.city}
          </span>
        </div>
      </div>
    </div>

    <!-- Distance Radar Pill (if location or destination is active) -->
    ${
      distanceText
        ? `
        <div class="mt-2.5 px-2.5 py-1 rounded-xl bg-blue-50/90 border border-blue-200/60 flex items-center justify-between text-[11px] text-[#0071E3] font-bold">
          <span class="flex items-center gap-1">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polygon points="12 8 8 12 12 16 16 12 12 8"/></svg>
            Proximity
          </span>
          <span class="font-mono">${distanceText}</span>
        </div>
      `
        : ''
    }

    <!-- High-Impact Action Hub: Profile + Directions + Quick Connect -->
    <div class="flex items-center gap-2 mt-3 pt-2.5 border-t border-black/[0.06]">
      <!-- Profile Button -->
      <button
        type="button"
        id="popup-profile-btn"
        class="ios-press flex-1 py-2 px-3 rounded-xl bg-[#0F172A] hover:bg-black text-white text-[11px] font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer font-display"
      >
        <svg class="w-3.5 h-3.5 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span>View Profile</span>
      </button>

      <!-- Directions Button -->
      <button
        type="button"
        id="popup-navigate-btn"
        class="ios-press flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#0071E3] to-[#0077ED] hover:from-[#0077ED] hover:to-[#0284C7] text-white text-[11px] font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer font-display"
      >
        <svg class="w-3.5 h-3.5 text-sky-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
        </svg>
        <span>Directions</span>
      </button>

      <!-- WhatsApp Quick Action -->
      ${
        hasWhatsapp
          ? `
        <a
          href="https://wa.me/${cleanPhone}?text=${encodeURIComponent(
            `Hi ${member.name}, I found your office on the PROXIMA map. Would love to schedule a 1-to-1 meeting.`
          )}"
          target="_blank"
          rel="noopener noreferrer"
          class="ios-press w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors flex-shrink-0 border border-emerald-200/80 shadow-2xs"
          title="Message on WhatsApp"
        >
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z"/>
          </svg>
        </a>
      `
          : ''
      }

      <!-- Direct Phone Call Quick Action -->
      ${
        hasPhone
          ? `
        <a
          href="tel:${cleanPhone}"
          class="ios-press w-8 h-8 rounded-xl bg-blue-50 text-[#0071E3] hover:bg-blue-100 flex items-center justify-center transition-colors flex-shrink-0 border border-blue-200/80 shadow-2xs"
          title="Direct Phone Call"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
        </a>
      `
          : ''
      }
    </div>
  `

  // Event Listeners
  const closeBtn = container.querySelector('#popup-close-btn')
  if (closeBtn && onClose) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      onClose()
    })
  }

  const profileBtn = container.querySelector('#popup-profile-btn')
  if (profileBtn && onOpenProfile) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      onOpenProfile(member)
    })
  }

  const navigateBtn = container.querySelector('#popup-navigate-btn')
  if (navigateBtn) {
    navigateBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      if (onNavigateMember) {
        onNavigateMember(member)
      } else {
        openExternalNavigation(
          member.location.latitude,
          member.location.longitude,
          `${member.company} (${member.location.area})`
        )
      }
    })
  }

  return container
}

export const MapContainer: React.FC<MapContainerProps> = ({
  members,
  selectedMemberId,
  onSelectMember,
  onOpenProfile,
  userLocation,
  destinationLocation,
  radiusFilter,
  activeChapter,
  anchorPoint,
  triggerFlightAnimation = false,
  onFlightComplete,
  onNavigateMember,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Map<string, Marker>>(new Map())
  const userMarkerRef = useRef<Marker | null>(null)
  const destinationMarkerRef = useRef<Marker | null>(null)
  const activePopupRef = useRef<maplibregl.Popup | null>(null)
  const [isFlightActive, setIsFlightActive] = useState(triggerFlightAnimation)

  // Initialize Map: starts at full country of India if triggerFlightAnimation is set, else at chapter
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const initialCenter = triggerFlightAnimation ? INDIA_CENTER : activeChapter.centerCoordinates
    const initialZoom = triggerFlightAnimation ? INDIA_ZOOM : activeChapter.defaultZoom

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: BULLETPROOF_OSM_STYLE,
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: false,
    })

    map.on('load', () => {
      map.resize()

      // Initialize radius radar overlay layers
      if (!map.getSource('radius-radar-source')) {
        map.addSource('radius-radar-source', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        })
      }

      if (!map.getLayer('radius-radar-fill')) {
        map.addLayer({
          id: 'radius-radar-fill',
          type: 'fill',
          source: 'radius-radar-source',
          paint: {
            'fill-color': '#0071E3',
            'fill-opacity': 0.06,
          },
        })
      }

      if (!map.getLayer('radius-radar-stroke')) {
        map.addLayer({
          id: 'radius-radar-stroke',
          type: 'line',
          source: 'radius-radar-source',
          paint: {
            'line-color': '#0071E3',
            'line-width': 1.8,
            'line-dasharray': [4, 3],
            'line-opacity': 0.65,
          },
        })
      }

      // If initial flight animation is requested, pause for 700ms then smoothly fly down to chapter
      if (triggerFlightAnimation) {
        setIsFlightActive(true)
        setTimeout(() => {
          map.flyTo({
            center: activeChapter.centerCoordinates,
            zoom: activeChapter.defaultZoom || 12.2,
            speed: 0.52, // Majestic, immersive glide across the subcontinent
            curve: 1.45,
            duration: 4200,
            essential: true,
          })

          map.once('moveend', () => {
            setIsFlightActive(false)
            if (onFlightComplete) onFlightComplete()
          })
        }, 700)
      }
    })

    // Dismiss active popup when clicking on empty map space
    map.on('click', () => {
      onSelectMember(null)
    })

    const handleResize = () => map.resize()
    window.addEventListener('resize', handleResize)

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'bottom-right')
    map.addControl(new maplibregl.FullscreenControl(), 'top-right')

    mapRef.current = map

    return () => {
      window.removeEventListener('resize', handleResize)
      if (activePopupRef.current) {
        activePopupRef.current.remove()
        activePopupRef.current = null
      }
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Replay flight animation from India overview down to chapter
  const handleReplayFlight = () => {
    const map = mapRef.current
    if (!map) return
    setIsFlightActive(true)

    // Step 1: Smoothly rise to entire country of India
    map.flyTo({
      center: INDIA_CENTER,
      zoom: INDIA_ZOOM,
      speed: 0.75,
      curve: 1.3,
      duration: 2200,
      essential: true,
    })

    // Step 2: Settle and dive back down to chapter
    setTimeout(() => {
      map.flyTo({
        center: activeChapter.centerCoordinates,
        zoom: activeChapter.defaultZoom || 12.2,
        speed: 0.52,
        curve: 1.45,
        duration: 4200,
        essential: true,
      })

      map.once('moveend', () => {
        setIsFlightActive(false)
      })
    }, 2600)
  }

  // Smoothly pan & zoom whenever active chapter changes (if not in initial flight)
  useEffect(() => {
    const map = mapRef.current
    if (!map || isFlightActive) return

    map.flyTo({
      center: activeChapter.centerCoordinates,
      zoom: activeChapter.defaultZoom,
      speed: 1.0,
      curve: 1.4,
      essential: true,
    })
  }, [activeChapter])

  // Sync member markers with maximum retina sharpness & luxury Apple squircle styling
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current.clear()

    members.forEach((member) => {
      const isSelected = member.id === selectedMemberId
      const zone = getLocationZoneColor(member.location.area, member.location.city)

      const el = document.createElement('div')
      el.className = 'group cursor-pointer transition-transform duration-200'
      el.style.transformOrigin = 'bottom center'

      el.innerHTML = `
        <div class="relative flex flex-col items-center select-none group">
          <!-- Stylized Pin Head with ONLY the Member Photo -->
          <div class="relative transition-all duration-300 ease-out group-hover:scale-115 ${
            isSelected ? 'scale-115 -translate-y-1' : ''
          }">
            <!-- Photo Avatar in Stylized Circular/Squircle Map Pin -->
            <div
              class="relative w-11 h-11 sm:w-12 sm:h-12 rounded-[18px] overflow-hidden bg-white p-0.5 transition-all shadow-[0_8px_20px_rgba(15,23,42,0.22)]"
              style="
                box-shadow: ${
                  isSelected
                    ? `0 12px 28px ${zone.glowRgba}, 0 0 0 3px #ffffff, 0 0 0 5.5px ${zone.primaryHex}`
                    : `0 8px 20px rgba(15,23,42,0.18), 0 0 0 2px #ffffff, 0 0 0 4px ${zone.primaryHex}dd`
                };
              "
            >
              <img
                src="${member.photoUrl}"
                alt="${member.name}"
                class="w-full h-full rounded-[14px] object-cover"
                style="image-rendering: -webkit-optimize-contrast;"
              />
            </div>

            <!-- Online / 1-to-1 Available Status Dot -->
            ${
              member.oneToOneAvailability === 'AVAILABLE'
                ? `<span class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white shadow-xs" title="Available for 1-to-1 Meetings"></span>`
                : ''
            }

            <!-- Precision Teardrop Pin Tip (Points directly to exact GPS coordinates) -->
            <div
              class="w-3.5 h-3.5 rotate-45 mx-auto -mt-2 shadow-xs transition-colors"
              style="
                background-color: ${zone.primaryHex};
                border-right: 2px solid #ffffff;
                border-bottom: 2px solid #ffffff;
                box-shadow: 0 4px 8px rgba(15,23,42,0.2);
              "
            ></div>
          </div>

          <!-- Clean Locality Label UNDER the Icon -->
          <div class="mt-1 transition-all duration-200">
            <div
              class="flex items-center gap-1 px-2.5 py-0.5 rounded-full border shadow-sm transition-all ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-105'
                  : 'bg-white/95 backdrop-blur-md text-slate-800 border-white/95 hover:bg-white group-hover:scale-105'
              }"
              style="box-shadow: 0 4px 12px rgba(15,23,42,0.12);"
            >
              <span
                class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style="background-color: ${zone.primaryHex};"
              ></span>
              <span class="font-display font-extrabold text-[10px] tracking-tight whitespace-nowrap uppercase">
                ${member.location.area}
              </span>
            </div>
          </div>
        </div>
      `

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        onSelectMember(member)
        map.flyTo({
          center: [member.location.longitude, member.location.latitude],
          zoom: Math.max(map.getZoom(), 13.8),
          essential: true,
          duration: 900,
        })
      })

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([member.location.longitude, member.location.latitude])
        .addTo(map)

      markersRef.current.set(member.id, marker)
    })
  }, [members, selectedMemberId, onSelectMember])

  // Synchronize Elegant MapLibre Popup with selectedMemberId
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Dismiss existing popup
    if (activePopupRef.current) {
      activePopupRef.current.remove()
      activePopupRef.current = null
    }

    if (!selectedMemberId) return

    const member = members.find((m) => m.id === selectedMemberId)
    if (!member) return

    const zone = getLocationZoneColor(member.location.area, member.location.city)
    const content = createMemberPopupElement(
      member,
      zone,
      onOpenProfile,
      () => {
        onSelectMember(null)
      },
      onNavigateMember
    )

    const popup = new maplibregl.Popup({
      offset: [0, -80],
      closeButton: false,
      closeOnClick: false,
      anchor: 'bottom',
      maxWidth: '360px',
      className: 'proxima-elegant-popup',
    })
      .setLngLat([member.location.longitude, member.location.latitude])
      .setDOMContent(content)
      .addTo(map)

    activePopupRef.current = popup

    // Center smoothly on selected member with padding for top console and bottom card
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    map.flyTo({
      center: [member.location.longitude, member.location.latitude],
      zoom: Math.max(map.getZoom(), 13.8),
      padding: {
        top: isMobile ? 120 : 130,
        bottom: isMobile ? 220 : 140,
        left: isMobile ? 20 : 280,
        right: 20,
      },
      essential: true,
      duration: 800,
    })
  }, [selectedMemberId, members, onOpenProfile, onSelectMember])

  // DYNAMIC RESIZE: Smoothly resize and fit map bounds whenever distance radius filter or anchor changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || isFlightActive) return

    // Resolve geographic anchor (Destination Area > User GPS > Explicit Anchor > Chapter Center)
    const anchorLng =
      destinationLocation?.longitude ??
      userLocation?.longitude ??
      anchorPoint?.longitude ??
      activeChapter.centerCoordinates[0]
    const anchorLat =
      destinationLocation?.latitude ??
      userLocation?.latitude ??
      anchorPoint?.latitude ??
      activeChapter.centerCoordinates[1]

    // 1. Update visual radar circle GeoJSON
    const updateRadarCircle = () => {
      const source = map.getSource('radius-radar-source') as maplibregl.GeoJSONSource | undefined
      if (source) {
        if (radiusFilter !== 'ALL' && typeof radiusFilter === 'number') {
          const circleFeature = generateCirclePolygon([anchorLng, anchorLat], radiusFilter)
          source.setData({
            type: 'FeatureCollection',
            features: [circleFeature],
          })
        } else {
          source.setData({
            type: 'FeatureCollection',
            features: [],
          })
        }
      }
    }

    if (map.isStyleLoaded()) {
      updateRadarCircle()
    } else {
      map.once('styledata', updateRadarCircle)
    }

    // Responsive padding taking into account desktop side drawer (width ~380px) and top header
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768
    const padding = {
      top: 140, // Header + Search + Filter capsules
      bottom: 70, // Bottom safe area
      left: isDesktop ? 360 : 50, // Avoid overlapping with left side directory drawer
      right: 50,
    }

    // 2. Adjust camera viewport / bounding box according to radius
    if (radiusFilter === 'ALL') {
      if (members.length > 1) {
        const bounds = new maplibregl.LngLatBounds()
        members.forEach((m) => bounds.extend([m.location.longitude, m.location.latitude]))
        map.fitBounds(bounds, {
          padding,
          maxZoom: activeChapter.defaultZoom || 13,
          duration: 900,
          essential: true,
        })
      } else {
        map.flyTo({
          center: [anchorLng, anchorLat],
          zoom: activeChapter.defaultZoom || 12.2,
          duration: 900,
          essential: true,
        })
      }
    } else {
      const radiusKm = typeof radiusFilter === 'number' ? radiusFilter : 10
      const latRad = (anchorLat * Math.PI) / 180
      const kmPerDegLat = 111.32
      const kmPerDegLng = 111.32 * Math.cos(latRad)

      // Add 15% breathing room around radius perimeter so boundary & pins fit gracefully
      const deltaLat = (radiusKm * 1.15) / kmPerDegLat
      const deltaLng = (radiusKm * 1.15) / (kmPerDegLng > 0.001 ? kmPerDegLng : 1)

      const sw: [number, number] = [anchorLng - deltaLng, anchorLat - deltaLat]
      const ne: [number, number] = [anchorLng + deltaLng, anchorLat + deltaLat]

      map.fitBounds([sw, ne], {
        padding,
        duration: 850,
        essential: true,
      })
    }
  }, [radiusFilter, destinationLocation, userLocation, anchorPoint, activeChapter, isFlightActive, members])

  // Handle User Location Beacon (Apple Blue Pulse Beacon)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (userLocation) {
      if (!userMarkerRef.current) {
        const beaconEl = document.createElement('div')
        beaconEl.className = 'relative flex items-center justify-center'
        beaconEl.innerHTML = `
          <div class="absolute w-12 h-12 rounded-full bg-[#0071E3]/25 marker-pulse"></div>
          <div class="relative w-5.5 h-5.5 rounded-full bg-[#0071E3] border-[2.5px] border-white shadow-[0_4px_16px_rgba(0,113,227,0.5)] flex items-center justify-center">
            <div class="w-2 h-2 rounded-full bg-white shadow-xs"></div>
          </div>
        `
        userMarkerRef.current = new maplibregl.Marker({ element: beaconEl, anchor: 'center' })
          .setLngLat([userLocation.longitude, userLocation.latitude])
          .addTo(map)
      } else {
        userMarkerRef.current.setLngLat([userLocation.longitude, userLocation.latitude])
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove()
      userMarkerRef.current = null
    }
  }, [userLocation])

  // Handle Destination Location Beacon (Apple Amber Flag)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (destinationLocation) {
      if (!destinationMarkerRef.current) {
        const destEl = document.createElement('div')
        destEl.className = 'relative flex flex-col items-center select-none'
        destEl.innerHTML = `
          <div class="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[11px] font-bold rounded-2xl shadow-[0_6px_20px_rgba(245,158,11,0.45)] flex items-center gap-1.5 border border-white/40">
            <span>${destinationLocation.name}</span>
          </div>
          <div class="w-2.5 h-2.5 rotate-45 -mt-1.5 bg-amber-600 shadow-xs"></div>
        `
        destinationMarkerRef.current = new maplibregl.Marker({ element: destEl, anchor: 'bottom' })
          .setLngLat([destinationLocation.longitude, destinationLocation.latitude])
          .addTo(map)
      } else {
        destinationMarkerRef.current.setLngLat([destinationLocation.longitude, destinationLocation.latitude])
      }
    } else if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove()
      destinationMarkerRef.current = null
    }
  }, [destinationLocation])

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Cinematic Flight Status Beacon */}
      {isFlightActive && (
        <div className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-300">
          <div className="ios-glass px-4 py-2 rounded-full border border-white/95 shadow-[0_8px_30px_rgba(0,0,0,0.15)] flex items-center gap-2.5 text-xs font-semibold text-[#1D1D1F]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0071E3] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0071E3]"></span>
            </span>
            <span>Descending from India to {activeChapter.name}...</span>
          </div>
        </div>
      )}

      {/* Fly from India Replay Pill */}
      {!isFlightActive && (
        <button
          type="button"
          onClick={handleReplayFlight}
          className="ios-press absolute bottom-28 sm:bottom-24 right-4 z-20 ios-glass px-3.5 py-2 rounded-full border border-white/90 shadow-md text-xs font-semibold text-slate-700 flex items-center gap-1.5 hover:bg-white hover:text-[#0071E3] transition-all cursor-pointer"
          title="Watch cinematic descent from India"
        >
          <Compass className="w-3.5 h-3.5 text-[#0071E3]" />
          <span className="hidden sm:inline">Country View ·</span>
          <span>Fly to City</span>
        </button>
      )}
    </div>
  )
}
