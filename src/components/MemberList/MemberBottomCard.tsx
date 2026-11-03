import React from 'react'
import {
  Navigation,
  MessageCircle,
  Phone,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  List,
} from 'lucide-react'
import type { Member } from '../../types/member'
import { formatDistance } from '../../utils/distance'
import { openExternalNavigation } from '../../utils/navigation'
import { getLocationZoneColor } from '../../utils/locationColor'

interface MemberBottomCardProps {
  member: Member
  membersList: Member[]
  onSelectMember: (member: Member | null) => void
  onOpenProfile: (member: Member) => void
  onOpenDirectory: () => void
  onNavigateMember?: (member: Member) => void
}

export const MemberBottomCard: React.FC<MemberBottomCardProps> = ({
  member,
  membersList,
  onSelectMember,
  onOpenProfile,
  onOpenDirectory,
  onNavigateMember,
}) => {
  const zone = getLocationZoneColor(member.location.area, member.location.city)
  const currentIndex = membersList.findIndex((m) => m.id === member.id)
  const totalCount = membersList.length

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (currentIndex > 0) {
      onSelectMember(membersList[currentIndex - 1])
    } else if (totalCount > 1) {
      onSelectMember(membersList[totalCount - 1])
    }
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (currentIndex < totalCount - 1) {
      onSelectMember(membersList[currentIndex + 1])
    } else if (totalCount > 1) {
      onSelectMember(membersList[0])
    }
  }

  const cleanPhone = (member.phone || member.whatsapp || '').replace(/[^0-9]/g, '')
  const hasWhatsapp = !!(member.whatsapp || member.phone)
  const hasPhone = !!member.phone

  return (
    <div className="fixed bottom-4 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-lg z-40 pointer-events-auto select-none animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="ios-glass rounded-[28px] shadow-[0_20px_60px_rgba(15,23,42,0.22)] border border-white/95 overflow-hidden bg-white/95 backdrop-blur-2xl">
        
        {/* Top Micro Navigation & Context Header */}
        <div className="px-4 pt-3 pb-2 border-b border-black/[0.05] flex items-center justify-between text-xs">
          {/* Locality & Distance Pill */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${zone.badgeBg} ${zone.badgeText} ${zone.badgeBorder}`}
            >
              <MapPin className="w-2.5 h-2.5" />
              <span>{member.location.area}</span>
            </span>

            {member.distanceKm !== undefined && (
              <span className="text-[10px] font-bold text-[#0071E3] bg-blue-50/90 border border-blue-200/60 px-2 py-0.5 rounded-full font-mono-num">
                {formatDistance(member.distanceKm)}
              </span>
            )}
          </div>

          {/* Stepper Controls (< Prev · 3/14 · Next >) & Close */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {totalCount > 1 && (
              <div className="flex items-center gap-1 bg-slate-100/90 px-1.5 py-0.5 rounded-full border border-black/[0.04]">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="ios-press w-5 h-5 rounded-full hover:bg-white text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                  title="Previous Member"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-bold text-slate-500 font-mono-num px-1">
                  {currentIndex + 1} of {totalCount}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  className="ios-press w-5 h-5 rounded-full hover:bg-white text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                  title="Next Member"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Back to List Drawer */}
            <button
              type="button"
              onClick={onOpenDirectory}
              className="ios-press w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Open full member directory"
            >
              <List className="w-3.5 h-3.5" />
            </button>

            {/* Dismiss X */}
            <button
              type="button"
              onClick={() => onSelectMember(null)}
              className="ios-press w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Close card"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Member Profile Body */}
        <div className="p-3.5 sm:p-4 flex items-center gap-3">
          {/* Avatar Squircle with Location Zone Ring */}
          <div
            className="relative flex-shrink-0 cursor-pointer group"
            onClick={() => onOpenProfile(member)}
            title="Click to view full profile"
          >
            <img
              src={member.photoUrl}
              alt={member.name}
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-[18px] object-cover ring-2 ring-white shadow-sm transition-transform group-hover:scale-105"
              style={{
                boxShadow: `0 0 0 2.5px ${zone.primaryHex}`,
              }}
            />
            {member.oneToOneAvailability === 'AVAILABLE' && (
              <span
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white shadow-xs"
                title="Available for 1-to-1 Meetings"
              />
            )}
          </div>

          {/* Member Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h3
                onClick={() => onOpenProfile(member)}
                className="font-display text-sm sm:text-base font-bold text-[#0F172A] tracking-tight truncate hover:text-[#0071E3] transition-colors cursor-pointer"
              >
                {member.name}
              </h3>
            </div>
            
            <p className="text-xs font-semibold text-slate-600 truncate mt-0.5">
              {member.company}
            </p>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full truncate">
                {member.category}
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                {member.location.address}
              </span>
            </div>
          </div>
        </div>

        {/* Direct Action Toolbar */}
        <div className="px-3.5 pb-3.5 pt-1 grid grid-cols-4 gap-1.5 sm:gap-2">
          {/* 1. Directions (Apple / Google Navigation) */}
          <button
            type="button"
            onClick={() => {
              if (onNavigateMember) {
                onNavigateMember(member)
              } else {
                openExternalNavigation(
                  member.location.latitude,
                  member.location.longitude,
                  member.name
                )
              }
            }}
            className="ios-press py-2 px-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[11px] sm:text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer font-display"
            title="Get Directions"
          >
            <Navigation className="w-3.5 h-3.5 text-sky-200" />
            <span className="truncate">Directions</span>
          </button>

          {/* 2. WhatsApp Direct */}
          {hasWhatsapp ? (
            <a
              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                `Hi ${member.name}, I found your office on the PROXIMA chapter map. Would love to connect for a 1-to-1 business meeting.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ios-press py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] sm:text-xs font-bold border border-emerald-200/70 transition-colors flex items-center justify-center gap-1 cursor-pointer font-display"
              title="Chat on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span className="truncate">WhatsApp</span>
            </a>
          ) : (
            <div className="py-2 px-2 rounded-xl bg-slate-50 text-slate-300 text-[11px] font-bold border border-slate-100 flex items-center justify-center">
              <MessageCircle className="w-3.5 h-3.5" />
            </div>
          )}

          {/* 3. Direct Phone Call */}
          {hasPhone ? (
            <a
              href={`tel:${cleanPhone}`}
              className="ios-press py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] sm:text-xs font-bold border border-black/[0.04] transition-colors flex items-center justify-center gap-1 cursor-pointer font-display"
              title={`Call ${member.name}`}
            >
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span className="truncate">Call</span>
            </a>
          ) : (
            <div className="py-2 px-2 rounded-xl bg-slate-50 text-slate-300 text-[11px] font-bold border border-slate-100 flex items-center justify-center">
              <Phone className="w-3.5 h-3.5" />
            </div>
          )}

          {/* 4. Full Profile */}
          <button
            type="button"
            onClick={() => onOpenProfile(member)}
            className="ios-press py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] sm:text-xs font-bold border border-black/[0.04] transition-colors flex items-center justify-center gap-1 cursor-pointer font-display"
            title="View Full Profile"
          >
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate">Profile</span>
          </button>
        </div>

      </div>
    </div>
  )
}
