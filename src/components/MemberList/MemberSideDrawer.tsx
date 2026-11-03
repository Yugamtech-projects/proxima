import React, { useState, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Navigation,
  MapPin,
  ArrowUpRight,
  MessageCircle,
  Users,
  X,
  Lock,
  Home,
} from 'lucide-react'
import type { Member } from '../../types/member'
import { formatDistance } from '../../utils/distance'
import { openExternalNavigation } from '../../utils/navigation'
import { getLocationZoneColor } from '../../utils/locationColor'

interface MemberSideDrawerProps {
  members: Member[]
  selectedMemberId: string | null
  onSelectMember: (member: Member) => void
  onOpenProfile: (member: Member) => void
  hasAnchorPoint: boolean
  onOpenAdmin?: () => void
  onResetToGateway?: () => void
  isFlightActive?: boolean
  onOpenSecurity?: () => void
  onOpenPrivacy?: () => void
  onOpenTerms?: () => void
  isOpen?: boolean
  onToggleOpen?: (open: boolean) => void
  hideFloatingPrompt?: boolean
  onClearFilters?: () => void
  onNavigateMember?: (member: Member) => void
}

export const MemberSideDrawer: React.FC<MemberSideDrawerProps> = ({
  members,
  selectedMemberId,
  onSelectMember,
  onOpenProfile,
  hasAnchorPoint,
  onOpenAdmin,
  onResetToGateway,
  isFlightActive = false,
  onOpenSecurity,
  onOpenPrivacy,
  onOpenTerms,
  isOpen: propIsOpen,
  onToggleOpen,
  hideFloatingPrompt = false,
  onClearFilters,
  onNavigateMember,
}) => {
  // Controlled or uncontrolled isOpen
  const [internalIsOpen, setInternalIsOpen] = useState(!isFlightActive)
  const isDrawerOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen

  const setDrawerOpen = (open: boolean) => {
    if (onToggleOpen) {
      onToggleOpen(open)
    } else {
      setInternalIsOpen(open)
    }
  }

  // Auto-hide side drawer during cinematic flight animation so map is 100% visible
  useEffect(() => {
    if (isFlightActive) {
      setDrawerOpen(false)
    } else {
      // Small graceful delay after flight ends before sliding drawer in
      const timer = setTimeout(() => {
        setDrawerOpen(true)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [isFlightActive])

  // Scroll to selected member when clicked on map
  useEffect(() => {
    if (selectedMemberId && isDrawerOpen) {
      const el = document.getElementById(`side-member-${selectedMemberId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [selectedMemberId, isDrawerOpen])

  const handleMemberClick = (member: Member) => {
    onSelectMember(member)
    // On mobile devices (< 768px), immediately auto-collapse the drawer so the user views the member's pin on the map immediately!
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setDrawerOpen(false)
    }
  }

  return (
    <>
      {/* Prominent Floating Executive Directory Prompt when Drawer is Closed */}
      {!isDrawerOpen && !isFlightActive && !selectedMemberId && !hideFloatingPrompt && (
        <div className="fixed left-3 sm:left-4 bottom-6 sm:bottom-8 z-30 pointer-events-auto animate-in fade-in slide-in-from-left-4 duration-300">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="ios-press ios-glass p-2.5 sm:p-3 pr-3.5 sm:pr-4 rounded-[28px] border border-white/95 shadow-[0_16px_40px_rgba(15,23,42,0.14)] hover:shadow-[0_20px_50px_rgba(0,113,227,0.22)] flex items-center gap-3 sm:gap-3.5 hover:bg-white transition-all cursor-pointer group ring-1 ring-black/5 relative"
            title="Open verified chapter directory"
          >
            {/* Attention Beacon */}
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border-2 border-white shadow-xs"></span>
            </span>

            {/* Overlapping Member Faces Stack */}
            <div className="flex items-center -space-x-2.5 flex-shrink-0">
              {members.slice(0, 3).map((m) => (
                <img
                  key={m.id}
                  src={m.photoUrl}
                  alt={m.name}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-2 ring-white shadow-xs"
                />
              ))}
              {members.length > 3 && (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#0071E3] to-[#0077ED] text-white text-[10px] sm:text-[11px] font-extrabold flex items-center justify-center ring-2 ring-white shadow-xs font-mono-num">
                  +{members.length - 3}
                </div>
              )}
            </div>

            {/* Text Hierarchy */}
            <div className="flex flex-col text-left pr-1">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-xs sm:text-[13px] font-bold text-[#0F172A] tracking-tight">
                  Chapter Directory
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-[#0071E3] text-[10px] font-bold border border-blue-200/80 font-mono-num">
                  {members.length} Offices
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium line-clamp-1">
                Tap to view offices, 1-to-1s & contacts
              </span>
            </div>

            {/* Action Arrow Button */}
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0071E3] group-hover:bg-[#0077ED] text-white flex items-center justify-center transition-all shadow-xs group-hover:scale-105 flex-shrink-0 ml-auto">
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>
      )}

      {/* 
        Directory Drawer / Bottom Sheet:
        - On Mobile: Seamless Bottom Sheet that auto-collapses when a member is tapped so the map is 100% visible!
        - On Desktop: Clean floating left sidebar
      */}
      <aside
        className={`fixed z-30 pointer-events-auto transition-transform duration-400 ease-out flex select-none 
          inset-x-2 bottom-2 max-h-[80vh] top-auto sm:top-24 sm:bottom-6 sm:left-4 sm:right-auto sm:max-h-none sm:w-[410px]
          ${
            isDrawerOpen
              ? 'translate-y-0 sm:translate-y-0 sm:translate-x-0'
              : 'translate-y-[calc(100%+24px)] sm:translate-y-0 sm:-translate-x-[calc(100%+24px)]'
          }
        `}
      >
        <div className="relative w-full h-full ios-glass rounded-[28px] sm:rounded-[34px] border border-white/95 shadow-[0_20px_50px_rgba(15,23,42,0.18)] flex flex-col overflow-hidden backdrop-blur-2xl">
          
          {/* Mobile Drag Indicator Bar */}
          <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mt-2 mb-0.5 sm:hidden flex-shrink-0" />

          {/* Drawer Header (Google Maps Style) */}
          <div className="pt-3 sm:pt-4 pb-3 px-5 border-b border-black/[0.05] flex items-center justify-between bg-white/50 backdrop-blur-md flex-shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm font-bold text-[#0F172A] tracking-tight">
                  {hasAnchorPoint ? 'Members Near Location' : 'Chapter Directory'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#0071E3]/10 text-[#0071E3] text-[10px] font-bold font-mono-num">
                  {members.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {members.length === 1 ? '1 business office verified' : `${members.length} business offices verified`}
              </p>
            </div>

            {/* Close / Collapse Button */}
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              title="Collapse directory to view full map"
            >
              <ChevronLeft className="w-4 h-4 sm:block hidden" />
              <X className="w-4 h-4 sm:hidden" />
            </button>
          </div>

          {/* Member Cards Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 overscroll-contain">
            {members.length === 0 ? (
              <div className="py-12 px-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                  <Users className="w-6 h-6" />
                </div>
                <p className="font-display text-sm font-bold text-slate-800">No members match criteria</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  {hasAnchorPoint
                    ? 'No members found within this distance. Try widening your radius or clearing your search.'
                    : 'No verified members matched your search terms.'}
                </p>
                {onClearFilters ? (
                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="btn-proxima-primary px-4 py-2 text-white text-xs font-semibold rounded-full shadow-xs mt-2 cursor-pointer"
                  >
                    Clear Filters & View All
                  </button>
                ) : onOpenAdmin ? (
                  <button
                    onClick={onOpenAdmin}
                    className="ios-press px-4 py-2 bg-[#0F172A] hover:bg-black text-white text-xs font-bold rounded-full shadow-xs mt-2 cursor-pointer font-display"
                  >
                    Open Admin Portal
                  </button>
                ) : null}
              </div>
            ) : (
              members.map((member) => {
                const isSelected = member.id === selectedMemberId
                const zone = getLocationZoneColor(member.location.area, member.location.city)

                return (
                  <div
                    key={member.id}
                    id={`side-member-${member.id}`}
                    onClick={() => handleMemberClick(member)}
                    className={`ios-press p-3.5 sm:p-4 rounded-[24px] transition-all duration-200 cursor-pointer border ${
                      isSelected
                        ? 'bg-white shadow-[0_12px_32px_rgba(0,113,227,0.18)] border-[#0071E3]/50 ring-2 ring-[#0071E3]/25'
                        : 'bg-white/80 hover:bg-white border-black/[0.04] shadow-2xs hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar Squircle with Location Zone Ring */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={member.photoUrl}
                          alt={member.name}
                          className="w-12 h-12 rounded-[18px] object-cover ring-1 ring-black/5"
                          style={{
                            boxShadow: `0 0 0 2px ${zone.primaryHex}`,
                          }}
                        />
                        {member.oneToOneAvailability === 'AVAILABLE' && (
                          <span
                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white shadow-xs"
                            title="Available for 1-to-1 Meetings"
                          />
                        )}
                      </div>

                      {/* Member Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-display text-xs sm:text-[13px] font-bold text-[#0F172A] truncate">
                            {member.name}
                          </h4>
                          {member.distanceKm !== undefined && (
                            <span className="text-[10px] font-bold text-[#0071E3] bg-blue-50/90 border border-blue-200/60 px-2 py-0.5 rounded-full flex-shrink-0 font-mono-num">
                              {formatDistance(member.distanceKm)}
                            </span>
                          )}
                        </div>

                        {/* Company & Category */}
                        <p className="text-[11px] font-medium text-slate-600 truncate mt-0.5">
                          {member.company}
                        </p>

                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {/* Category Badge */}
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium">
                            {member.category}
                          </span>

                          {/* Location District Pill */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${zone.badgeBg} ${zone.badgeText} ${zone.badgeBorder}`}
                          >
                            <MapPin className="w-2.5 h-2.5" />
                            <span>{member.location.area}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-black/[0.04]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenProfile(member)
                        }}
                        className="ios-press flex-1 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-[11px] font-bold text-slate-800 transition-colors flex items-center justify-center gap-1 cursor-pointer font-display"
                      >
                        <span>Profile</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-400" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
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
                        }}
                        className="ios-press flex-1 py-1.5 px-3 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-[11px] font-bold text-white shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer font-display"
                      >
                        <Navigation className="w-3 h-3 text-sky-200" />
                        <span>Directions</span>
                      </button>

                      {member.whatsapp && (
                        <a
                          href={`https://wa.me/${member.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Hi ${member.name}, I found your office on the PROXIMA map. Would love to schedule a 1-to-1 meeting.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="ios-press w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors flex-shrink-0 border border-emerald-200/60"
                          title="Message on WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Minimal Bottom Drawer Bar with Security, Legal Links & Attribution */}
          <div className="px-4 py-2 bg-slate-50/90 border-t border-black/[0.04] flex flex-col gap-1.5 text-[10px] text-slate-500 flex-shrink-0">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onOpenSecurity || onOpenPrivacy}
                className="flex items-center gap-1.5 font-medium text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                title="Enterprise Security & Privacy Architecture"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Secure & Private</span>
              </button>
              <div className="flex items-center gap-2">
                {onResetToGateway && (
                  <>
                    <button
                      type="button"
                      onClick={onResetToGateway}
                      className="font-bold text-slate-600 hover:text-[#0071E3] transition-colors cursor-pointer flex items-center gap-1"
                      title="Return to Home / Landing Page"
                    >
                      <Home className="w-2.5 h-2.5 text-[#0071E3]" />
                      <span>Home</span>
                    </button>
                    <span>·</span>
                  </>
                )}
                {onOpenAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={onOpenAdmin}
                      className="font-bold text-slate-600 hover:text-[#0071E3] transition-colors cursor-pointer flex items-center gap-1"
                      title="Open Chapter Admin Portal"
                    >
                      <Lock className="w-2.5 h-2.5" />
                      <span>Admin</span>
                    </button>
                    <span>·</span>
                  </>
                )}
                {onOpenSecurity && (
                  <>
                    <button
                      type="button"
                      onClick={onOpenSecurity}
                      className="hover:text-[#0071E3] transition-colors cursor-pointer"
                    >
                      Security
                    </button>
                    <span>·</span>
                  </>
                )}
                {onOpenPrivacy && (
                  <button
                    type="button"
                    onClick={onOpenPrivacy}
                    className="hover:text-[#0071E3] transition-colors cursor-pointer"
                  >
                    Privacy
                  </button>
                )}
                {onOpenTerms && (
                  <>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={onOpenTerms}
                      className="hover:text-[#0071E3] transition-colors cursor-pointer"
                    >
                      Terms
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="text-[9px] text-slate-400 text-center border-t border-slate-200/50 pt-1">
              Proudly built from the house of{' '}
              <a
                href="https://www.oruyugam.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0F172A] hover:text-[#0071E3] font-bold underline decoration-[#0F172A]/25 hover:decoration-[#0071E3] transition-colors"
              >
                Yugam Consulting
              </a>
            </div>
          </div>
        </div>

        {/* Google Maps Style Edge Toggle Handle Tab on the Right */}
        <button
          type="button"
          onClick={() => setDrawerOpen(!isDrawerOpen)}
          className="absolute -right-5 sm:-right-6 top-1/2 -translate-y-1/2 w-5 sm:w-6 h-14 ios-glass rounded-r-xl border-y border-r border-white/95 shadow-[4px_0_12px_rgba(15,23,42,0.08)] hidden sm:flex items-center justify-center text-slate-500 hover:text-[#0071E3] transition-colors cursor-pointer"
          title={isDrawerOpen ? 'Collapse panel' : 'Expand panel'}
        >
          <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-300 ${isDrawerOpen ? '' : 'rotate-180'}`} />
        </button>
      </aside>
    </>
  )
}
