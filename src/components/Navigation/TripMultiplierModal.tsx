import React, { useState } from 'react'
import {
  X,
  Navigation,
  Sparkles,
  MessageCircle,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Clock,
} from 'lucide-react'
import type { Member } from '../../types/member'
import {
  findNearbyTripOpportunities,
  generateCatchupWhatsAppUrl,
  logNavigationToMember,
  logMeetingWithMember,
  getInteractionHistory,
  getMemberMeetingStatus,
  type NearbyOpportunity,
} from '../../services/viewerIdentity'
import { fetchNearbyRadarMembers } from '../../services/proximaApi'

interface TripMultiplierModalProps {
  isOpen: boolean
  onClose: () => void
  primaryMember: Member
  allChapterMembers: Member[]
  chapterId: string
  chapterName: string
  viewerName: string
  onLaunchGoogleMaps: (targetMember: Member) => void
}

export const TripMultiplierModal: React.FC<TripMultiplierModalProps> = ({
  isOpen,
  onClose,
  primaryMember,
  allChapterMembers,
  chapterId,
  chapterName,
  viewerName,
  onLaunchGoogleMaps,
}) => {
  const [opportunities, setOpportunities] = useState<NearbyOpportunity[]>(() =>
    findNearbyTripOpportunities(
      primaryMember,
      allChapterMembers,
      chapterId,
      viewerName,
      2.0 // scan within 2km radius around primary member's office
    )
  )

  // Query server-side PostGIS spatial engine for en-route networking opportunities
  React.useEffect(() => {
    if (!isOpen || !primaryMember.location?.latitude || !primaryMember.location?.longitude) return

    fetchNearbyRadarMembers({
      latitude: primaryMember.location.latitude,
      longitude: primaryMember.location.longitude,
      radiusKm: 2.5,
      chapterId,
    })
      .then((res) => {
        if (res && res.members && res.members.length > 0) {
          const filtered = res.members.filter((m) => m.id !== primaryMember.id)
          if (filtered.length > 0) {
            const history = getInteractionHistory(chapterId, viewerName)
            const mapped: NearbyOpportunity[] = filtered.map((m) => {
              const statusInfo = getMemberMeetingStatus(history[m.id])
              return {
                member: m,
                distanceKm: m.distanceKm,
                distanceMeters: Math.round(m.distanceKm * 1000),
                status: statusInfo.status,
                daysSinceLastMet: statusInfo.daysSinceLastMet,
                label: statusInfo.label,
              }
            })
            setOpportunities(mapped)
          }
        }
      })
      .catch(() => {})
  }, [isOpen, primaryMember.id, primaryMember.location?.latitude, primaryMember.location?.longitude, chapterId, viewerName])

  const [loggedMetIds, setLoggedMetIds] = useState<Set<string>>(new Set())

  if (!isOpen) return null

  const handleMarkMet = (oppMember: Member) => {
    logMeetingWithMember(chapterId, viewerName, oppMember)
    setLoggedMetIds((prev) => new Set([...prev, oppMember.id]))

    // Update list dynamically
    setOpportunities((prev) =>
      prev.map((opp) => {
        if (opp.member.id === oppMember.id) {
          return {
            ...opp,
            status: 'RECENT',
            daysSinceLastMet: 0,
            label: 'Today',
          }
        }
        return opp
      })
    )
  }

  const handleProceedNavigation = () => {
    // Log navigation to primary member
    logNavigationToMember(chapterId, viewerName, primaryMember)
    onLaunchGoogleMaps(primaryMember)
    onClose()
  }

  // Count high priority targets
  const neverVisitedCount = opportunities.filter((o) => o.status === 'NEVER_MET').length
  const overdueCount = opportunities.filter((o) => o.status === 'OVERDUE_90').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl rounded-[32px] border border-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.24)] p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200 text-left max-h-[90vh] flex flex-col">
        
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 inline-block mb-0.5">
                Meet Nearby Members
              </span>
              <h3 className="font-display text-sm sm:text-base font-bold text-[#0F172A] tracking-tight">
                Meet other members while you're nearby
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Destination Summary Card */}
        <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-2xl flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#0071E3] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
              {primaryMember.name.charAt(0)}
            </div>
            <div className="min-w-0 text-xs">
              <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider block">
                Heading To:
              </span>
              <span className="font-bold text-slate-900 block truncate text-xs sm:text-[13px]">
                {primaryMember.name} · {primaryMember.company}
              </span>
              <span className="text-[11px] text-[#0071E3] font-medium truncate block flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {primaryMember.location.area || primaryMember.location.city}
              </span>
            </div>
          </div>
        </div>

        {/* Nearby Members List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
          {opportunities.length > 0 ? (
            <>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 pt-1">
                <span className="flex items-center gap-1.5">
                  <span>Members near this office</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono-num font-bold">
                    {opportunities.length}
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {neverVisitedCount > 0 && `${neverVisitedCount} never visited · `}
                  {overdueCount > 0 && `${overdueCount} overdue`}
                </span>
              </div>

              {/* List of Nearby Opportunities */}
              <div className="space-y-2">
                {opportunities.map((opp) => {
                  const target = opp.member
                  const isLogged = loggedMetIds.has(target.id) || opp.status === 'RECENT'
                  const whatsAppUrl = generateCatchupWhatsAppUrl(
                    target,
                    viewerName,
                    chapterName,
                    primaryMember
                  )

                  return (
                    <div
                      key={target.id}
                      className="p-3 bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-xs sm:text-[13px] font-bold text-slate-900 truncate">
                              {target.name}
                            </span>
                            {/* Proximity Distance */}
                            <span className="text-[10px] font-bold font-mono text-[#0071E3] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60 flex-shrink-0">
                              {opp.distanceMeters < 1000
                                ? `${opp.distanceMeters}m away`
                                : `${opp.distanceKm.toFixed(1)}km away`}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {target.category} · {target.company}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex-shrink-0">
                          {opp.status === 'NEVER_MET' ? (
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/80 text-[10px] font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-purple-500" />
                              <span>Never Met</span>
                            </span>
                          ) : opp.status === 'OVERDUE_90' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>{opp.daysSinceLastMet}d Overdue</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Met Recently</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        {/* 1-Tap WhatsApp Catchup */}
                        <a
                          href={whatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ios-press px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer flex-shrink-0"
                          title="Open WhatsApp with pre-composed catchup invite"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>1-Tap WhatsApp Catchup</span>
                        </a>

                        {/* Mark Met Button */}
                        <button
                          type="button"
                          onClick={() => handleMarkMet(target)}
                          disabled={isLogged}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-lg transition-all cursor-pointer ${
                            isLogged
                              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                              : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                          }`}
                        >
                          {isLogged ? '✓ Logged' : 'Mark Visited'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="p-4 bg-slate-50 rounded-2xl text-center space-y-1 border border-slate-200/60 my-2">
              <p className="text-xs font-semibold text-slate-700">
                No other members within 2 km of {primaryMember.name}.
              </p>
              <p className="text-[11px] text-slate-400">
                Direct route to {primaryMember.location.area || primaryMember.location.city}.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-200/80 flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleProceedNavigation}
            className="flex-1 ios-press py-3 px-4 rounded-xl btn-proxima-primary text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Navigation className="w-4 h-4 text-sky-200" />
            <span>Launch Google Maps to {primaryMember.name.split(' ')[0]}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>
        </div>
      </div>
    </div>
  )
}
