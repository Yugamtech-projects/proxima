import React, { useState, useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import { X, Search, CheckCircle2, ShieldCheck, MapPin, AlertCircle } from 'lucide-react'
import { searchLocation } from '../../utils/geocoding'
import type { GeocodingResult } from '../../utils/geocoding'

interface LocationVerifierModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveLocation?: (location: {
    address: string
    area: string
    latitude: number
    longitude: number
  }) => void
}

const OPEN_FREE_MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'



export const LocationVerifierModal: React.FC<LocationVerifierModalProps> = ({
  isOpen,
  onClose,
  onSaveLocation,
}) => {
  const [addressInput, setAddressInput] = useState('Anna Nagar 2nd Avenue, Chennai')
  const [areaInput, setAreaInput] = useState('Anna Nagar')
  const [latitude, setLatitude] = useState(13.0878)
  const [longitude, setLongitude] = useState(80.2155)
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRef = useRef<Marker | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: OPEN_FREE_MAP_STYLE,
        center: [longitude, latitude],
        zoom: 15.5,
        attributionControl: false,
      })

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')

      // Luxury draggable pin
      const pinEl = document.createElement('div')
      pinEl.className = 'cursor-grab active:cursor-grabbing flex flex-col items-center group select-none'
      pinEl.innerHTML = `
        <div class="px-2.5 py-1 bg-[#0071E3] text-white text-[10px] font-bold rounded-full shadow-lg border border-white/60 whitespace-nowrap mb-1">
          Drag to Entrance
        </div>
        <div class="w-7 h-7 rounded-full bg-[#0071E3] border-[2.5px] border-white shadow-[0_4px_16px_rgba(0,113,227,0.5)] flex items-center justify-center text-white">
          <div class="w-2.5 h-2.5 rounded-full bg-white"></div>
        </div>
        <div class="w-1.5 h-3 bg-[#0071E3] -mt-0.5"></div>
      `

      const marker = new maplibregl.Marker({
        element: pinEl,
        draggable: true,
        anchor: 'bottom',
      })
        .setLngLat([longitude, latitude])
        .addTo(map)

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat()
        setLatitude(parseFloat(lngLat.lat.toFixed(6)))
        setLongitude(parseFloat(lngLat.lng.toFixed(6)))
      })

      mapRef.current = map
      markerRef.current = marker
    }, 150)

    return () => {
      clearTimeout(timer)
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [isOpen])

  const handleSearchAddress = async () => {
    if (!addressInput.trim()) return
    setIsSearching(true)
    const results = await searchLocation(addressInput)
    setSuggestions(results)
    setIsSearching(false)

    if (results.length > 0) {
      applyLocation(results[0])
    }
  }

  const applyLocation = (hub: GeocodingResult) => {
    setLatitude(hub.latitude)
    setLongitude(hub.longitude)
    setAreaInput(hub.areaName)
    setSuggestions([])

    if (mapRef.current && markerRef.current) {
      markerRef.current.setLngLat([hub.longitude, hub.latitude])
      mapRef.current.flyTo({ center: [hub.longitude, hub.latitude], zoom: 16 })
    }
  }

  const handleConfirm = () => {
    setConfirmed(true)
    if (onSaveLocation) {
      onSaveLocation({
        address: addressInput,
        area: areaInput,
        latitude,
        longitude,
      })
    }
    setTimeout(() => {
      setConfirmed(false)
      onClose()
    }, 1200)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in select-none">
      <div className="bg-[#F5F5F7] w-full max-w-2xl rounded-[36px] shadow-[0_25px_70px_rgba(0,0,0,0.35)] border border-white/60 overflow-hidden flex flex-col max-h-[92vh]">
        {/* iOS Header */}
        <div className="px-6 py-5 border-b border-black/[0.06] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1D1D1F]">Authoritative Location Verification</h3>
              <p className="text-[11px] text-slate-500 font-medium">Position the pin directly on the verified commercial doorway</p>
            </div>
          </div>
          <button onClick={onClose} className="ios-press w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4 text-slate-700 no-scrollbar">
          {/* Strict Privacy Banner */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="font-normal leading-relaxed">
              <strong>Approved Commercial Only:</strong> Under network privacy bylaws, home and personal addresses are strictly forbidden. Pin must mark an authorized office, clinic, or studio.
            </p>
          </div>

          {/* Search Box */}
          <div className="ios-glass p-4 rounded-[24px] space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              1. Address Geocoding
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress()}
                  placeholder="e.g. Olympia Tech Park, Guindy, Chennai"
                  className="w-full text-xs font-medium py-2.5 px-3.5 rounded-xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3]"
                />
              </div>
              <button
                onClick={handleSearchAddress}
                disabled={isSearching}
                className="ios-press px-4 py-2.5 bg-[#1D1D1F] hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 flex-shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Locate</span>
              </button>
            </div>

            {suggestions.length > 0 && (
              <div className="mt-2 bg-white border border-black/5 rounded-2xl p-1.5 space-y-1 shadow-sm">
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => applyLocation(item)}
                    className="w-full text-left text-xs p-2 rounded-xl hover:bg-blue-50 text-slate-800 hover:text-[#0071E3] flex items-center gap-2 truncate font-medium"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#0071E3] flex-shrink-0" />
                    <span className="truncate">{item.displayName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Drag Pin Map */}
          <div className="ios-glass p-4 rounded-[24px] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                2. Visual Doorstep Calibration
              </label>
              <span className="text-[11px] text-[#0071E3] font-semibold">Draggable Pin Active</span>
            </div>
            <div className="w-full h-56 rounded-2xl overflow-hidden border border-black/10 shadow-inner relative">
              <div ref={mapContainerRef} className="w-full h-full" />
            </div>
          </div>

          {/* Precise Coordinate Readout */}
          <div className="grid grid-cols-2 gap-3">
            <div className="ios-glass p-3.5 rounded-2xl">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Locked Latitude</span>
              <span className="font-mono text-xs font-bold text-[#1D1D1F]">{latitude}</span>
            </div>
            <div className="ios-glass p-3.5 rounded-2xl">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Locked Longitude</span>
              <span className="font-mono text-xs font-bold text-[#1D1D1F]">{longitude}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-black/[0.06] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="ios-press px-4 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`ios-press flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-bold text-white transition-all shadow-md ${
              confirmed ? 'bg-emerald-600' : 'bg-[#0071E3] hover:bg-[#0077ED]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{confirmed ? 'Coordinates Verified & Saved' : 'Confirm Verified Pin'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
