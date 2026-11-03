import React, { useState } from 'react'
import {
  X,
  Phone,
  MessageCircle,
  Mail,
  Globe,
  Navigation,
  MapPin,
  Building,
  CheckCircle2,
  Calendar,
  Sparkles,
  Share2,
  Briefcase,
  ExternalLink,
} from 'lucide-react'
import type { Member } from '../../types/member'
import { openExternalNavigation } from '../../utils/navigation'
import { formatDistance } from '../../utils/distance'
import { getLocationZoneColor } from '../../utils/locationColor'

interface MemberProfileModalProps {
  member: Member | null
  onClose: () => void
  onNavigateMember?: (member: Member) => void
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  member,
  onClose,
  onNavigateMember,
}) => {
  const [oneToOneRequested, setOneToOneRequested] = useState(false)

  if (!member) return null

  const handleRequestOneToOne = () => {
    setOneToOneRequested(true)
    setTimeout(() => {
      setOneToOneRequested(false)
    }, 3500)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `${member.name} — ${member.company}`,
          text: `Connect with ${member.name} (${member.category}) at ${member.company}. Office: ${member.location.address}, ${member.location.area}`,
          url: window.location.href,
        })
        .catch(() => {})
    } else {
      navigator.clipboard.writeText(
        `${member.name} (${member.company}) — Category: ${member.category} — Phone: ${member.phone} — Office: ${member.location.address}, ${member.location.area}`
      )
      alert('Member contact details copied to clipboard!')
    }
  }

  const zone = getLocationZoneColor(member.location.area, member.location.city)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#F8F9FD] w-full max-w-lg rounded-t-[36px] sm:rounded-[36px] shadow-[0_28px_80px_rgba(15,23,42,0.35)] border border-white/80 overflow-hidden max-h-[92vh] flex flex-col select-none">
        
        {/* Executive Header Banner */}
        <div className="relative bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] text-white p-6 pb-7">
          {/* Top Actions Bar (Clean, no chapter area) */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-blue-200/90 bg-white/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-1.5 font-display">
              <Briefcase className="w-3 h-3 text-[#38BDF8]" />
              <span>Executive Member Profile</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="ios-press w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                title="Share Profile"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="ios-press w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Member Identity & Details */}
          <div className="flex items-center gap-4 mt-5">
            <div className="relative flex-shrink-0">
              <img
                src={member.photoUrl}
                alt={member.name}
                className="w-20 h-20 rounded-[24px] object-cover shadow-xl ring-2 ring-white/20"
                style={{ borderColor: zone.primaryHex }}
              />
              {member.oneToOneAvailability === 'AVAILABLE' && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-[#0F172A] shadow-xs"
                  title="Available for 1-to-1 Meetings"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-white truncate">
                {member.name}
              </h2>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 truncate font-medium mt-0.5">
                <Building className="w-3.5 h-3.5 text-blue-300 flex-shrink-0" />
                <span className="truncate">{member.company}</span>
              </p>

              {/* Badges: Category & Locality */}
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                {/* Verified Business Category */}
                <span className="text-[11px] font-bold bg-[#0071E3] text-white px-3 py-0.5 rounded-full shadow-sm font-display tracking-tight">
                  {member.category}
                </span>

                {/* Physical Business Locality */}
                <span className="text-[11px] font-bold bg-white/15 text-white px-2.5 py-0.5 rounded-full backdrop-blur-md border border-white/20 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-sky-300" />
                  <span>{member.location.area}</span>
                </span>

                {/* Proximity Distance (if active) */}
                {member.distanceKm !== undefined && (
                  <span className="text-[10px] font-bold bg-emerald-500/90 text-white px-2 py-0.5 rounded-full font-mono-num shadow-2xs">
                    {formatDistance(member.distanceKm)} away
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Executive Dossier */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
          
          {/* 1. Physical Business Office Location Card */}
          <div className="ios-glass p-4 rounded-[26px] space-y-3 shadow-xs border border-white/90">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-mono-num">
                <MapPin className="w-3.5 h-3.5 text-[#0071E3]" />
                <span>Business Office Location</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (onNavigateMember) {
                    onNavigateMember(member)
                  } else {
                    openExternalNavigation(
                      member.location.latitude,
                      member.location.longitude,
                      `${member.company} - ${member.name}`
                    )
                  }
                }}
                className="ios-press text-[11px] font-bold text-[#0071E3] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Get Directions</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="bg-white/80 p-3.5 rounded-2xl border border-black/[0.04] space-y-1">
              <p className="text-xs sm:text-[13px] text-[#0F172A] font-bold leading-snug">
                {member.location.address || 'Commercial Office'}
              </p>
              <p className="text-xs text-slate-600 font-medium">
                {member.location.area}, {member.location.city} {member.location.pincode ? `— PIN ${member.location.pincode}` : ''}
              </p>
            </div>
          </div>

          {/* 2. Executive Bio / About the Business */}
          {member.shortBio && (
            <div className="ios-glass p-4 rounded-[26px] space-y-1.5 shadow-xs border border-white/90">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono-num">
                About the Business
              </h4>
              <p className="text-xs sm:text-[13px] leading-relaxed text-[#0F172A] font-medium">
                {member.shortBio}
              </p>
            </div>
          )}

          {/* 3. Ideal Referral Triggers / Business Introductions */}
          {member.referralRequirements && (
            <div className="bg-gradient-to-br from-amber-50/90 to-amber-100/50 border border-amber-300/50 p-4 rounded-[26px] space-y-1.5 shadow-xs">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs font-display">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Ideal Referral Introductions</span>
              </div>
              <p className="text-xs sm:text-[13px] text-amber-950/90 leading-relaxed font-medium">
                {member.referralRequirements}
              </p>
            </div>
          )}

          {/* 4. 1-to-1 Meeting Availability */}
          <div className="ios-glass p-3.5 rounded-[24px] flex items-center justify-between shadow-xs border border-white/90">
            <div className="flex items-center gap-3">
              <div
                className={`w-3.5 h-3.5 rounded-full ${
                  member.oneToOneAvailability === 'AVAILABLE'
                    ? 'bg-emerald-500 ring-4 ring-emerald-500/20'
                    : 'bg-amber-500 ring-4 ring-amber-500/20'
                }`}
              />
              <div>
                <p className="font-display text-xs font-bold text-[#0F172A]">
                  {member.oneToOneAvailability === 'AVAILABLE'
                    ? 'Available for 1-to-1 Meetings'
                    : '1-to-1 By Prior Appointment'}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Connect to explore business referrals and collaboration
                </p>
              </div>
            </div>

            <button
              onClick={handleRequestOneToOne}
              disabled={oneToOneRequested}
              className={`ios-press flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer font-display ${
                oneToOneRequested
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                  : 'bg-[#0F172A] hover:bg-black text-white'
              }`}
            >
              {oneToOneRequested ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Requested</span>
                </>
              ) : (
                <>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Request</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Footer (Direct Communication & Turn-by-Turn Navigation) */}
        <div className="p-4 bg-white/95 border-t border-black/[0.06] flex flex-col gap-2.5">
          {/* Direct Phone & WhatsApp Contact Badge */}
          {member.phone && (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-50 border border-black/[0.05] text-xs">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#0071E3]" />
                <span className="font-mono font-bold text-slate-800">{member.phone}</span>
              </div>
              {member.whatsapp && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>WhatsApp Enabled</span>
                </div>
              )}
            </div>
          )}

          {/* iOS Circular Quick Action Grid */}
          <div className="grid grid-cols-4 gap-2">
            {member.phone ? (
              <a
                href={`tel:${member.phone}`}
                className="ios-press flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-[#0F172A] transition-all"
                title={`Call ${member.phone}`}
              >
                <div className="w-9 h-9 rounded-full bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center mb-1">
                  <Phone className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold font-display">Call</span>
              </a>
            ) : (
              <div className="flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl bg-slate-50 text-slate-300 opacity-60">
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center mb-1">
                  <Phone className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold font-display">Call</span>
              </div>
            )}

            {member.whatsapp || member.phone ? (
              <a
                href={`https://wa.me/${(member.whatsapp || member.phone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `Hello ${member.name}, I found your profile on the Executive Member Map. Would love to connect for a 1-to-1.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ios-press flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-[#0F172A] transition-all"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-1">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold font-display">WhatsApp</span>
              </a>
            ) : (
              <div className="flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl bg-slate-50 text-slate-300 opacity-60">
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center mb-1">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold font-display">WhatsApp</span>
              </div>
            )}

            {member.email ? (
              <a
                href={`mailto:${member.email}?subject=${encodeURIComponent('Business Referral & Connection')}`}
                className="ios-press flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-[#0F172A] transition-all"
              >
                <div className="w-9 h-9 rounded-full bg-slate-500/10 text-slate-700 flex items-center justify-center mb-1">
                  <Mail className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold font-display">Email</span>
              </a>
            ) : (
              <div className="flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl bg-slate-50 text-slate-300 opacity-60">
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center mb-1">
                  <Mail className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold font-display">Email</span>
              </div>
            )}

            {member.website ? (
              <a
                href={member.website.startsWith('http') ? member.website : `https://${member.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ios-press flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-[#0F172A] transition-all"
              >
                <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mb-1">
                  <Globe className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold font-display">Website</span>
              </a>
            ) : (
              <div className="flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl bg-slate-50 text-slate-300 opacity-60">
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center mb-1">
                  <Globe className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold font-display">Website</span>
              </div>
            )}
          </div>

          {/* Primary Turn-by-Turn Navigation Button */}
          <button
            onClick={() =>
              openExternalNavigation(
                member.location.latitude,
                member.location.longitude,
                `${member.company} - ${member.name}`
              )
            }
            className="btn-proxima-primary ios-press w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-full text-white font-bold text-sm shadow-[0_8px_24px_rgba(0,113,227,0.35)] transition-all cursor-pointer font-display"
          >
            <Navigation className="w-4 h-4 text-sky-200" />
            <span className="tracking-tight">Start Turn-by-Turn Navigation to Office</span>
          </button>
        </div>
      </div>
    </div>
  )
}
