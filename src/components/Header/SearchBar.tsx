import React, { useState, useEffect, useRef } from 'react'
import { Search, Navigation, X, Loader2, MapPin, ChevronRight } from 'lucide-react'
import { searchLocation, CHENNAI_HUBS } from '../../utils/geocoding'
import type { GeocodingResult } from '../../utils/geocoding'

interface SearchBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onSelectDestination: (dest: { name: string; latitude: number; longitude: number } | null) => void
  onTriggerNearMe: () => void
  isLocating: boolean
  activeDestinationName: string | null
  locationError: string | null
  onClearLocationError: () => void
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  onSelectDestination,
  onTriggerNearMe,
  isLocating,
  activeDestinationName,
  locationError,
  onClearLocationError,
}) => {
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([])
  const [isSearchingDest, setIsSearchingDest] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle autocomplete as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearchingDest(true)
      const results = await searchLocation(searchQuery)
      setSuggestions(results)
      setIsSearchingDest(false)
      setShowDropdown(results.length > 0)
    }, 200)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  return (
    <div ref={containerRef} className="w-full flex flex-col gap-2 pointer-events-auto">
      {/* iOS Spotlight Style High-Precision Search Pill */}
      <div className="ios-glass rounded-[26px] p-1.5 transition-all duration-300 shadow-[0_10px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_14px_36px_rgba(0,113,227,0.08)] border border-white/95 focus-within:border-[#0071E3]/40 focus-within:ring-2 focus-within:ring-[#0071E3]/15">
        <div className="flex items-center gap-2">
          {/* Search Input Container */}
          <div className="flex-1 flex items-center gap-2.5 pl-3.5">
            {isSearchingDest ? (
              <Loader2 className="w-4 h-4 text-[#0071E3] animate-spin flex-shrink-0" />
            ) : (
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0 transition-colors group-hover:text-[#0071E3]" />
            )}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0 || !searchQuery) {
                  setShowDropdown(true)
                }
              }}
              placeholder="Search member, company, or locality..."
              className="w-full bg-transparent text-[13px] text-[#0F172A] placeholder:text-slate-400 focus:outline-none py-1.5 font-medium tracking-tight"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  onSearchChange('')
                  setShowDropdown(false)
                }}
                className="p-1 hover:bg-black/5 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Primary Action Button ("Detect Location" Geospatial Locator) */}
          <button
            onClick={onTriggerNearMe}
            disabled={isLocating}
            title="Detect your location & find nearest members"
            className={`ios-press flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all flex-shrink-0 cursor-pointer ${
              activeDestinationName === 'My Current Location'
                ? 'bg-gradient-to-r from-[#0071E3] to-[#0077ED] text-white shadow-[0_4px_16px_rgba(0,113,227,0.35)] ring-2 ring-[#0071E3]/20'
                : 'bg-[#0F172A] hover:bg-black text-white shadow-xs hover:shadow-md'
            }`}
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-200" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span className="tracking-tight font-display hidden sm:inline">Detect Location</span>
            <span className="tracking-tight font-display sm:hidden">Near Me</span>
          </button>
        </div>
      </div>

      {/* Active Destination Tag (Apple Status Pill) */}
      {activeDestinationName && (
        <div className="flex items-center justify-between ios-glass bg-[#0071E3]/8 border-[#0071E3]/25 px-4 py-1.5 rounded-full text-xs text-[#0071E3] shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-[#0071E3] animate-pulse flex-shrink-0" />
            <span className="font-semibold text-slate-600 text-[11px] uppercase tracking-wider">Anchor:</span>
            <span className="font-bold truncate text-[#0071E3]">{activeDestinationName}</span>
          </div>
          <button
            onClick={() => onSelectDestination(null)}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 ml-2 bg-white/70 hover:bg-white px-2.5 py-0.5 rounded-full transition-all border border-black/5 cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* Location Error Notice */}
      {locationError && (
        <div className="flex items-center justify-between bg-amber-500/15 backdrop-blur-md border border-amber-500/30 px-4 py-2 rounded-2xl text-xs text-amber-900 shadow-sm animate-in fade-in">
          <span className="font-medium">{locationError}</span>
          <button onClick={onClearLocationError} className="p-0.5 hover:bg-amber-500/20 rounded-full cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Destination Dropdown (iOS Inset Grouped Table Style) */}
      {showDropdown && (
        <div className="absolute top-[108px] left-3 right-3 sm:left-4 sm:right-4 ios-glass rounded-[28px] p-2.5 z-50 max-h-80 overflow-y-auto shadow-[0_24px_60px_rgba(15,23,42,0.18)] border border-white/95 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 pt-2 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono-num">
            {searchQuery ? 'Destinations & Landmarks' : 'Suggested Business Hubs'}
          </div>

          <div className="space-y-1">
            {(suggestions.length > 0 ? suggestions : CHENNAI_HUBS.slice(0, 6)).map((hub, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSelectDestination({
                    name: hub.areaName,
                    latitude: hub.latitude,
                    longitude: hub.longitude,
                  })
                  setShowDropdown(false)
                  onSearchChange('')
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl text-left hover:bg-[#0071E3]/5 transition-all group ios-press cursor-pointer border border-transparent hover:border-[#0071E3]/15"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#0071E3] flex-shrink-0 group-hover:bg-[#0071E3] group-hover:text-white transition-all ring-1 ring-blue-100 shadow-2xs">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[#0F172A] tracking-tight group-hover:text-[#0071E3] transition-colors truncate font-display">
                      {hub.areaName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate tracking-tight font-normal">
                      {hub.displayName}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#0071E3] group-hover:translate-x-0.5 flex-shrink-0 transition-all" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
