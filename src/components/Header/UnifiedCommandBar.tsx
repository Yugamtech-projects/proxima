import React, { useState, useEffect, useRef } from 'react'
import {
  Search,
  Navigation,
  X,
  Loader2,
  MapPin,
  ChevronRight,
  Share2,
  Check,
  ShieldCheck,
  Users,
  Lock,
  Home,
  ArrowLeft,
  UserCheck,
} from 'lucide-react'
import type { DistanceRadius } from '../../types/member'
import { searchLocation, CHENNAI_HUBS } from '../../utils/geocoding'
import type { GeocodingResult } from '../../utils/geocoding'

interface UnifiedCommandBarProps {
  // Brand & Navigation
  onResetToGateway: () => void
  onShareMap: () => void
  copiedShareLink: boolean
  onOpenLegal: () => void
  onOpenAdmin?: () => void
  isDemo?: boolean
  chapterName?: string
  viewerName?: string
  onOpenViewerModal?: () => void

  // Search & Geocoding
  searchQuery: string
  onSearchChange: (query: string) => void
  onSelectDestination: (dest: { name: string; latitude: number; longitude: number } | null) => void
  onTriggerNearMe: () => void
  isLocating: boolean
  activeDestinationName: string | null
  locationError: string | null
  onClearLocationError: () => void

  // Filters & Counts
  selectedRadius: DistanceRadius
  onSelectRadius: (radius: DistanceRadius) => void
  hasAnchorPoint: boolean
  matchCount: number
  onToggleDirectory?: () => void
  isDirectoryOpen?: boolean
}

const RADIUS_OPTIONS: DistanceRadius[] = [3, 5, 10, 15, 25, 'ALL']

export const UnifiedCommandBar: React.FC<UnifiedCommandBarProps> = ({
  onResetToGateway,
  onShareMap,
  copiedShareLink,
  onOpenLegal,
  onOpenAdmin,
  isDemo = false,
  chapterName,
  viewerName,
  onOpenViewerModal,
  searchQuery,
  onSearchChange,
  onSelectDestination,
  onTriggerNearMe,
  isLocating,
  activeDestinationName,
  locationError,
  onClearLocationError,
  selectedRadius,
  onSelectRadius,
  hasAnchorPoint,
  matchCount,
  onToggleDirectory,
  isDirectoryOpen = false,
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
    <div
      ref={containerRef}
      className="w-full max-w-3xl mx-auto flex flex-col pointer-events-auto relative select-none"
    >
      {/* 
        Master Unified Console: Single cohesive VisionOS frosted-glass container.
        Replaces the 3 disjointed stacked pills with one precision-sculpted control island.
      */}
      <div className="ios-glass rounded-[28px] shadow-[0_16px_45px_rgba(15,23,42,0.12)] border border-white/95 overflow-hidden transition-all duration-300">
        
        {/* Tier 1: Brand, Search Input, and Primary Actions */}
        <div className="p-2 sm:p-2.5 flex items-center justify-between gap-2">
          
          {/* Obvious Interactive Home Button with Proxima App Icon */}
          <button
            type="button"
            onClick={onResetToGateway}
            className="ios-press flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200/90 hover:border-[#0071E3]/50 shadow-[0_2px_8px_rgba(15,23,42,0.06)] hover:shadow-xs text-left focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 cursor-pointer group flex-shrink-0 transition-all"
            title={isDemo ? `Exit ${chapterName || 'Demo'} & Return to Landing Page` : 'Return to Home / Landing Page'}
            aria-label="Return to Home / Landing Page"
          >
            {/* The App Icon with integrated Home indicator */}
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white p-0.5 shadow-2xs ring-1 ring-black/10 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105">
              <img
                src="/proxima-icon.jpg"
                alt="Proxima"
                className="w-full h-full rounded-[8px] object-cover"
              />
              {/* Home Glyph Overlay Badge */}
              <div 
                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#0071E3] text-white flex items-center justify-center shadow-xs ring-1.5 ring-white transition-transform group-hover:scale-110"
                title="Home"
              >
                <Home className="w-2 sm:w-2.5 h-2 sm:h-2.5" />
              </div>
            </div>

            {/* Clear labels making navigation intent unmistakable */}
            <div className="flex flex-col leading-tight max-w-[130px] sm:max-w-[220px]">
              <div className="flex items-center gap-1 font-display truncate">
                <ArrowLeft className="w-3 h-3 text-[#0071E3] group-hover:-translate-x-0.5 transition-transform flex-shrink-0" />
                <span className="text-xs sm:text-[13px] font-extrabold tracking-tight text-[#0F172A] group-hover:text-[#0071E3] transition-colors truncate">
                  {viewerName
                    ? `${chapterName || 'Chapter'} for ${viewerName}`
                    : (chapterName || 'Home')}
                </span>
                {isDemo && (
                  <span className="hidden xs:inline-block px-1.5 py-0.5 text-[8px] sm:text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 rounded uppercase tracking-wider flex-shrink-0">
                    Demo
                  </span>
                )}
              </div>
              <span className="hidden xs:inline text-[8px] sm:text-[9px] font-semibold text-slate-400 group-hover:text-slate-600 transition-colors tracking-tight truncate">
                {isDemo ? 'Exit to Landing' : 'Proxima Map'}
              </span>
            </div>
          </button>

          {/* Integrated High-Precision Search Field */}
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 hover:bg-slate-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0071E3]/20 border border-black/[0.04] transition-all min-w-0">
            {isSearchingDest ? (
              <Loader2 className="w-3.5 h-3.5 text-[#0071E3] animate-spin flex-shrink-0" />
            ) : (
              <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
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
              placeholder="Search member, company, area..."
              className="w-full bg-transparent text-xs sm:text-[13px] text-[#0F172A] placeholder:text-slate-400 focus:outline-none font-medium tracking-tight truncate"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('')
                  setShowDropdown(false)
                }}
                className="p-0.5 hover:bg-black/10 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Primary Action Button Cluster */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            {/* Detect Location / Near Me GPS Button */}
            <button
              type="button"
              onClick={onTriggerNearMe}
              disabled={isLocating}
              title="Detect your location & scan nearest members"
              className={`ios-press flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer font-display ${
                activeDestinationName === 'My Current Location'
                  ? 'bg-gradient-to-r from-[#0071E3] to-[#0077ED] text-white shadow-[0_4px_16px_rgba(0,113,227,0.35)] ring-2 ring-[#0071E3]/20'
                  : 'bg-[#0F172A] hover:bg-black text-white shadow-xs'
              }`}
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-200" />
              ) : (
                <Navigation className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span className="hidden sm:inline">Near Me</span>
            </button>

            {/* Share Map */}
            <button
              type="button"
              onClick={onShareMap}
              className={`ios-press flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-full transition-all shadow-xs cursor-pointer font-display ${
                copiedShareLink
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-black/10'
              }`}
              title="Share Chapter Map"
            >
              {copiedShareLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span className="hidden md:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden md:inline">Share</span>
                </>
              )}
            </button>

            {/* Enterprise Security, Privacy & Terms */}
            <button
              type="button"
              onClick={onOpenLegal}
              className="ios-press flex items-center justify-center w-8 h-8 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-black/10 transition-all shadow-xs cursor-pointer"
              title="Security Policy, Privacy & Terms"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </button>

            {/* Admin Portal Gateway */}
            {onOpenAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="ios-press flex items-center justify-center w-8 h-8 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-black/10 transition-all shadow-xs cursor-pointer group"
                title="Admin Portal (Manage Chapter & Members)"
              >
                <Lock className="w-3.5 h-3.5 text-slate-600 group-hover:text-[#0071E3] transition-colors" />
              </button>
            )}
          </div>
        </div>

        {/* Tier 2: Seamlessly Integrated Radius Filter & Chapter Intelligence Dock */}
        <div className="px-3 sm:px-4 py-1.5 bg-slate-50/70 border-t border-black/[0.05] flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          
          {/* Segmented Control for Radius */}
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono-num mr-1 hidden xs:inline">
              Radius:
            </span>
            <div className="flex items-center bg-black/[0.06] p-0.5 rounded-full">
              {RADIUS_OPTIONS.map((radius) => {
                const isSelected = selectedRadius === radius
                return (
                  <button
                    key={radius}
                    type="button"
                    onClick={() => onSelectRadius(radius)}
                    title={hasAnchorPoint ? `Filter within ${radius}km` : 'Filter within radius'}
                    className={`ios-press px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer font-mono-num ${
                      isSelected
                        ? 'bg-white text-[#0071E3] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                    }`}
                  >
                    {radius === 'ALL' ? 'All' : `${radius}k`}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right Indicator: Viewer Persona & Active Verified Offices Counter */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {onOpenViewerModal && (
              <button
                type="button"
                onClick={onOpenViewerModal}
                className="ios-press flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white hover:bg-blue-50/70 text-slate-700 hover:text-[#0071E3] border border-black/10 text-[11px] font-bold shadow-2xs transition-all cursor-pointer"
                title={
                  viewerName
                    ? `Viewing as ${viewerName}. Click to change or switch.`
                    : 'Personalize this map view for you'
                }
              >
                <UserCheck className="w-3.5 h-3.5 text-[#0071E3]" />
                <span className="truncate max-w-[100px] sm:max-w-[150px]">
                  {viewerName ? `View for ${viewerName}` : 'Set View'}
                </span>
              </button>
            )}

            {onToggleDirectory ? (
              <button
                type="button"
                onClick={onToggleDirectory}
                className={`ios-press flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                  isDirectoryOpen
                    ? 'bg-[#0071E3] text-white border-transparent shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-black/10 shadow-2xs'
                }`}
                title={isDirectoryOpen ? 'Hide Directory Drawer' : 'Show Verified Members Directory'}
              >
                <Users className="w-3 h-3" />
                <span className="font-mono-num">{matchCount}</span>
                <span className="hidden sm:inline">Offices</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white text-[11px] font-bold text-slate-700 border border-black/10 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono-num font-extrabold">{matchCount}</span>
                <span className="text-slate-500 font-medium">Offices</span>
              </div>
            )}
          </div>
        </div>

        {/* Tier 3 (Conditional): Active Destination / Anchor Pill */}
        {activeDestinationName && (
          <div className="px-3.5 py-1.5 bg-blue-50/70 border-t border-blue-100 flex items-center justify-between text-xs text-[#0071E3] animate-in fade-in duration-200">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-[#0071E3] animate-pulse flex-shrink-0" />
              <span className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider">
                Anchor Point:
              </span>
              <span className="font-bold truncate text-[#0071E3]">{activeDestinationName}</span>
            </div>
            <button
              type="button"
              onClick={() => onSelectDestination(null)}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 ml-2 bg-white px-2 py-0.5 rounded-full transition-all border border-black/5 cursor-pointer shadow-2xs"
            >
              Clear
            </button>
          </div>
        )}

        {/* Tier 4 (Conditional): Location Error Notice */}
        {locationError && (
          <div className="px-3.5 py-1.5 bg-amber-50 border-t border-amber-200 flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
            <span className="font-medium text-[11px]">{locationError}</span>
            <button
              type="button"
              onClick={onClearLocationError}
              className="p-0.5 hover:bg-amber-100 rounded-full cursor-pointer text-amber-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Autocomplete Destination Dropdown (Anchored directly under Unified Console) */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 ios-glass rounded-[28px] p-2.5 z-50 max-h-80 overflow-y-auto shadow-[0_24px_60px_rgba(15,23,42,0.18)] border border-white/95 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 pt-2 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono-num">
            {searchQuery ? 'Destinations & Landmarks' : 'Suggested Business Hubs'}
          </div>

          <div className="space-y-1">
            {(suggestions.length > 0 ? suggestions : CHENNAI_HUBS.slice(0, 6)).map((hub, idx) => (
              <button
                key={idx}
                type="button"
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
