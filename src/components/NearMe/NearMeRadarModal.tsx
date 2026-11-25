import React from 'react'
import {
  Navigation,
  X,
  MapPin,
  ArrowUpRight,
  Users,
  Compass,
  ChevronRight,
  Car,
  SlidersHorizontal,
} from 'lucide-react'
import type { Member, DistanceRadius, Chapter } from '../../types/member'
import { formatDistance } from '../../utils/distance'
import { openExternalNavigation } from '../../utils/navigation'
import { fetchNearbyRadarMembers } from '../../services/proximaApi'

interface NearMeRadarModalProps {
  isOpen: boolean
  onClose: () => void
  userLocation: { latitude: number; longitude: number } | null
  isLocating: boolean
  locationError: string | null
  onRetryLocation: () => void
  members: Member[]
  allChapterMembers: Member[]
  selectedRadius: DistanceRadius
  onSelectRadius: (radius: DistanceRadius) => void
  onSelectMember: (member: Member) => void
  onOpenProfile: (member: Member) => void
  onOpenDirectory: () => void
  activeChapter: Chapter | null
}

const RADIUS_OPTIONS: DistanceRadius[] = [3, 5, 10, 15, 25, 'ALL']

export const NearMeRadarModal: React.FC<NearMeRadarModalProps> = ({
  isOpen,
  onClose,
  userLocation,
  isLocating,
  locationError,
  onRetryLocation,
  members,
  allChapterMembers,
  selectedRadius,
  onSelectRadius,
  onSelectMember,
  onOpenProfile,
  onOpenDirectory,
  activeChapter,
}) => {
  const [serverRadarMembers, setServerRadarMembers] = React.useState<(Member & { distanceKm?: number })[] | null>(null)

  React.useEffect(() => {
    if (!isOpen || !userLocation) {
      setServerRadarMembers(null)
      return
    }

    const radius = selectedRadius === 'ALL' ? 50 : selectedRadius
    fetchNearbyRadarMembers({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      radiusKm: radius,
      chapterId: activeChapter?.id,
    })
      .then((res) => {
        if (res && res.members && res.members.length > 0) {
          setServerRadarMembers(res.members)
        } else {
          setServerRadarMembers(null)
        }
      })
      .catch(() => setServerRadarMembers(null))
  }, [isOpen, userLocation?.latitude, userLocation?.longitude, selectedRadius, activeChapter?.id])

  if (!isOpen) return null

  // Use server-side PostGIS results if available, otherwise fallback to client members
  const effectiveList = serverRadarMembers || members

  // Ensure members are strictly sorted from closest to farthest
  const sortedMembers = [...effectiveList].sort((a, b) => {
    const distA = a.distanceKm ?? Infinity
    const distB = b.distanceKm ?? Infinity
    return distA - distB
  })

  const closestMember = sortedMembers.length > 0 ? sortedMembers[0] : null
  const otherMembers = sortedMembers.length > 1 ? sortedMembers.slice(1) : []

  const handleMemberCardClick = (member: Member) => {
    onSelectMember(member)
    onOpenProfile(member)
  }

  const handleSwitchToDirectory = () => {
    onClose()
    onOpenDirectory()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in select-none">
      {/* Tap backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main VisionOS Frosted Radar Island */}
      <div className="relative w-full sm:max-w-xl max-h-[90vh] sm:max-h-[85vh] bg-white/95 backdrop-blur-xl rounded-t-[32px] sm:rounded-[36px] shadow-[0_25px_70px_rgba(15,23,42,0.25)] border border-white/90 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
        
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 border-b border-black/[0.06] bg-gradient-to-b from-blue-50/70 to-transparent flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0071E3] to-[#00A3FF] text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
              <Navigation className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-extrabold text-[#0F172A] tracking-tight">
                  Near Me Radar
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-[#0071E3] font-mono uppercase tracking-wider">
                  Live GPS
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate">
                {activeChapter ? `${activeChapter.name} • ` : ''}
                {userLocation
                  ? `${sortedMembers.length} nearby from your location`
                  : `${sortedMembers.length} ${sortedMembers.length === 1 ? 'member' : 'members'} ranked closest to you`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
            title="Close Radar Popup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Distance Range Filter Pills (Integrated inside popup) */}
        <div className="px-4 py-3 bg-slate-50/80 border-b border-black/[0.05] flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex-shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#0071E3]" />
            <span>Range:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {RADIUS_OPTIONS.map((radius) => {
              const isSelected = selectedRadius === radius
              return (
                <button
                  key={String(radius)}
                  type="button"
                  onClick={() => onSelectRadius(radius)}
                  className={`ios-press px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer font-display ${
                    isSelected
                      ? 'bg-[#0071E3] text-white shadow-xs shadow-blue-500/30 ring-2 ring-[#0071E3]/20'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-black/[0.06]'
                  }`}
                >
                  {radius === 'ALL' ? 'All Distances' : `${radius} km`}
                </button>
              )
            })}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          
          {/* Location Loading Indicator */}
          {isLocating && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200/80 text-center space-y-2 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white mx-auto flex items-center justify-center">
                <Navigation className="w-4 h-4 animate-spin" />
              </div>
              <p className="text-xs font-bold text-[#0071E3]">Triangulating your live position...</p>
              <p className="text-[11px] text-slate-500">Scanning chapter members within range.</p>
            </div>
          )}

          {/* Location Error Warning with Retry */}
          {locationError && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="truncate">{locationError}</span>
              </div>
              <button
                type="button"
                onClick={onRetryLocation}
                className="ios-press px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] whitespace-nowrap cursor-pointer"
              >
                Retry GPS
              </button>
            </div>
          )}

          {/* Spotlight: Closest Member to User (#1 Rank) */}
          {closestMember && (
            <div className="relative p-4 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50/40 to-blue-50 border border-emerald-300/70 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-2xs">
                  <Compass className="w-3 h-3 text-emerald-200" />
                  <span>#1 Closest to You</span>
                </div>

                <div className="flex items-center gap-1 font-mono text-xs font-black text-emerald-700 bg-white/90 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                  <span>{closestMember.distanceKm !== undefined ? formatDistance(closestMember.distanceKm) : 'Nearby'}</span>
                </div>
              </div>

              <div
                onClick={() => handleMemberCardClick(closestMember)}
                className="flex items-center gap-3.5 cursor-pointer group"
              >
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-sm flex-shrink-0">
                  <img
                    src={closestMember.photoUrl}
                    alt={closestMember.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    onError={(e) => {
                      // Fallback avatar
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-display text-sm font-extrabold text-[#0F172A] group-hover:text-[#0071E3] transition-colors truncate">
                    {closestMember.name}
                  </h4>
                  <p className="text-xs font-bold text-slate-700 truncate">
                    {closestMember.company}
                  </p>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                    <span className="font-semibold text-slate-600 truncate">{closestMember.category}</span>
                    <span>•</span>
                    <span className="truncate">{closestMember.location.area}</span>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-white text-slate-400 group-hover:text-[#0071E3] group-hover:bg-blue-50 flex items-center justify-center transition-all flex-shrink-0 shadow-2xs">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              {/* Fast Action Buttons */}
              <div className="pt-1 flex items-center gap-2 border-t border-emerald-200/50">
                <button
                  type="button"
                  onClick={() => {
                    onSelectMember(closestMember)
                    onOpenProfile(closestMember)
                  }}
                  className="ios-press flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer font-display"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>View Profile & 1-to-1</span>
                </button>

                <button
                  type="button"
                  onClick={() => openExternalNavigation(closestMember.location.latitude, closestMember.location.longitude)}
                  className="ios-press py-2 px-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-black/10 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer font-display"
                  title="Navigate in Google Maps"
                >
                  <Car className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden xs:inline">Navigate</span>
                </button>
              </div>
            </div>
          )}

          {/* Further Members Progressing to Farthest */}
          {otherMembers.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between px-1">
                <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Further Members in Range ({otherMembers.length})
                </h5>
                <span className="text-[10px] text-slate-400 font-mono">Sorted by Distance</span>
              </div>

              <div className="space-y-2">
                {otherMembers.map((member, idx) => {
                  const rank = idx + 2

                  return (
                    <div
                      key={member.id}
                      onClick={() => handleMemberCardClick(member)}
                      className="ios-press p-3 sm:p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-black/[0.06] shadow-2xs flex items-center justify-between gap-3 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Rank Badge */}
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-mono font-bold flex items-center justify-center flex-shrink-0">
                          #{rank}
                        </span>

                        {/* Avatar */}
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-black/5 flex-shrink-0">
                          <img
                            src={member.photoUrl}
                            alt={member.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'
                            }}
                          />
                        </div>

                        {/* Details */}
                        <div className="min-w-0">
                          <p className="font-display text-xs sm:text-[13px] font-bold text-[#0F172A] group-hover:text-[#0071E3] transition-colors truncate">
                            {member.name}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium truncate">
                            {member.company} • {member.category}
                          </p>
                        </div>
                      </div>

                      {/* Distance & Action */}
                      <div className="flex items-center gap-2 flex-shrink-0 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono text-xs font-black text-slate-800">
                            {member.distanceKm !== undefined ? formatDistance(member.distanceKm) : '—'}
                          </span>
                          <span className="text-[9px] font-medium text-slate-400 truncate max-w-[80px]">
                            {member.location.area}
                          </span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0071E3] transition-colors" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty State when no members in selected radius */}
          {sortedMembers.length === 0 && !isLocating && (
            <div className="py-10 px-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Compass className="w-6 h-6" />
              </div>
              <h4 className="font-display text-sm font-bold text-slate-800">
                No members within {selectedRadius === 'ALL' ? 'chapter' : `${selectedRadius} km`}
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Expand your proximity range to see chapter partners located slightly further out.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onSelectRadius(15)}
                  className="ios-press px-4 py-2 rounded-full bg-[#0071E3] text-white text-xs font-bold cursor-pointer font-display"
                >
                  Expand to 15 km
                </button>
                <button
                  type="button"
                  onClick={() => onSelectRadius('ALL')}
                  className="ios-press px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer font-display"
                >
                  View All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar: One-Tap Switch to Full Chapter Directory */}
        <div className="p-3.5 bg-slate-50/90 border-t border-black/[0.05] flex items-center justify-between gap-3 text-xs">
          <div className="text-[11px] text-slate-500 font-medium">
            Want to search the full directory?
          </div>

          <button
            type="button"
            onClick={handleSwitchToDirectory}
            className="ios-press px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-black/10 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs font-display"
          >
            <Users className="w-3.5 h-3.5 text-[#0071E3]" />
            <span>Open Chapter Directory ({allChapterMembers.length})</span>
          </button>
        </div>

      </div>
    </div>
  )
}
