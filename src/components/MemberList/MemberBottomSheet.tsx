import { useState } from 'react'
import { Navigation, ChevronUp, ChevronDown, Building, MapPin, ArrowUpRight } from 'lucide-react'
import type { Member } from '../../types/member'
import { formatDistance } from '../../utils/distance'
import { openExternalNavigation } from '../../utils/navigation'
import { getLocationZoneColor } from '../../utils/locationColor'

interface MemberBottomSheetProps {
  members: Member[]
  selectedMemberId: string | null
  onSelectMember: (member: Member) => void
  onOpenProfile: (member: Member) => void
  hasAnchorPoint: boolean
  onOpenAdmin?: () => void
}

export const MemberBottomSheet: React.FC<MemberBottomSheetProps> = ({
  members,
  selectedMemberId,
  onSelectMember,
  onOpenProfile,
  hasAnchorPoint,
  onOpenAdmin,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (members.length === 0) {
    return (
      <div className="ios-glass-sheet rounded-t-[32px] p-6 text-center select-none animate-in slide-in-from-bottom-4 space-y-2.5">
        <p className="text-sm font-bold text-slate-800">No members to display</p>
        <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
          {hasAnchorPoint
            ? 'No members found within this radius. Try selecting "All" or expand your search.'
            : 'All mock dummy records have been removed. Add verified members in the Admin Portal.'}
        </p>
        {onOpenAdmin && (
          <button
            onClick={onOpenAdmin}
            className="ios-press px-4 py-2 bg-[#1D1D1F] hover:bg-black text-white text-xs font-bold rounded-full shadow-sm mt-1"
          >
            Open Admin Portal
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className={`ios-glass-sheet rounded-t-[36px] transition-all duration-300 ease-out flex flex-col pointer-events-auto select-none ${
        isExpanded ? 'max-h-[82vh] h-[78vh]' : 'max-h-[300px]'
      }`}
    >
      {/* iOS Drag Handle & Executive Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="pt-3 pb-2.5 px-6 flex flex-col items-center cursor-pointer border-b border-black/[0.04]"
      >
        <div className="w-10 h-1.5 bg-slate-400/35 rounded-full mb-2.5 transition-colors hover:bg-slate-500/50" />
        <div className="w-full flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-bold text-[#1D1D1F] tracking-tight">
              {hasAnchorPoint ? 'Members Near Location' : 'Approved Chapter Members'}
            </h3>
            <p className="text-[11px] font-medium text-slate-500">
              {members.length} {members.length === 1 ? 'business office' : 'business offices'} available
            </p>
          </div>
          <button className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center text-slate-600 hover:bg-black/10 transition-colors">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Member Cards Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 no-scrollbar">
        {members.map((member) => {
          const isSelected = member.id === selectedMemberId
          const zone = getLocationZoneColor(member.location.area, member.location.city)

          return (
            <div
              key={member.id}
              onClick={() => onSelectMember(member)}
              className={`ios-press p-4 rounded-[28px] transition-all duration-200 cursor-pointer border ${
                isSelected
                  ? 'bg-white shadow-[0_12px_32px_rgba(0,0,0,0.14)] border-[#0071E3]/40 ring-2 ring-[#0071E3]/20'
                  : 'bg-white/80 hover:bg-white border-black/[0.04] shadow-xs'
              }`}
            >
                  <div className="flex items-start gap-3.5">
                    {/* Executive Avatar (iOS Squircle with Location Ring) */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className="w-13 h-13 rounded-[18px] object-cover shadow-xs"
                        style={{ borderColor: zone.primaryHex, boxShadow: `0 0 0 2px ${zone.primaryHex}` }}
                      />
                      {member.oneToOneAvailability === 'AVAILABLE' && (
                        <span
                          title="Available for 1-2-1"
                          className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs"
                        />
                      )}
                    </div>

                    {/* Member Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-[14px] font-bold text-[#1D1D1F] tracking-tight truncate">
                          {member.name}
                        </h4>
                        {member.distanceKm !== undefined && (
                          <span className="text-[11px] font-bold text-[#0071E3] bg-[#0071E3]/10 px-2 py-0.5 rounded-full flex-shrink-0 tracking-tight flex items-center gap-0.5">
                            <Navigation className="w-2.5 h-2.5 text-[#0071E3]" />
                            {formatDistance(member.distanceKm)}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1 truncate mt-0.5 tracking-tight">
                        <Building className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{member.company}</span>
                      </p>

                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100/90 px-2.5 py-0.5 rounded-full">
                          {member.category}
                        </span>
                        {/* Location-Adopted Chromatic Badge */}
                        <span
                          className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1"
                          style={{
                            backgroundColor: `${zone.primaryHex}15`,
                            color: zone.primaryHex,
                            borderColor: `${zone.primaryHex}35`,
                          }}
                        >
                          <MapPin className="w-2.5 h-2.5" />
                          <span>{member.location.area}</span>
                        </span>
                      </div>
                    </div>
                  </div>

              {/* iOS Card Action Row */}
              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-black/[0.04]">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenProfile(member)
                  }}
                  className="ios-press flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200/80 text-slate-800 transition-colors"
                >
                  <span>View Profile</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openExternalNavigation(
                      member.location.latitude,
                      member.location.longitude,
                      `${member.company} - ${member.name}`
                    )
                  }}
                  className="ios-press flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-bold bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-[0_4px_12px_rgba(0,113,227,0.3)] transition-all"
                >
                  <Navigation className="w-3.5 h-3.5 text-blue-100" />
                  <span>Navigate</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
