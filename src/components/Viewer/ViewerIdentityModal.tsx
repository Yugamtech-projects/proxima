import React, { useState } from 'react'
import { X, UserCheck, EyeOff, Sparkles, Building2, Search } from 'lucide-react'
import type { Member } from '../../types/member'

interface ViewerIdentityModalProps {
  isOpen: boolean
  onClose: () => void
  chapterName: string
  chapterMembers: Member[]
  initialViewerName?: string
  onSaveViewer: (viewerInfo: { name: string; memberId?: string; isSelfExcluded: boolean }) => void
  onBrowseAsGuest?: () => void
}

export const ViewerIdentityModal: React.FC<ViewerIdentityModalProps> = ({
  isOpen,
  onClose,
  chapterName,
  chapterMembers,
  initialViewerName = '',
  onSaveViewer,
  onBrowseAsGuest,
}) => {
  const [typedName, setTypedName] = useState(initialViewerName)
  const [selectedMember, setSelectedMember] = useState<Member | null>(() => {
    if (!initialViewerName) return null
    return (
      chapterMembers.find(
        (m) => m.name.toLowerCase().trim() === initialViewerName.toLowerCase().trim()
      ) || null
    )
  })
  const [isSelfExcluded, setIsSelfExcluded] = useState(true)

  if (!isOpen) return null

  // Filter roster matches as user types
  const matches = typedName.trim().length >= 1
    ? chapterMembers.filter(
        (m) =>
          m.name.toLowerCase().includes(typedName.toLowerCase()) ||
          m.company.toLowerCase().includes(typedName.toLowerCase()) ||
          m.category.toLowerCase().includes(typedName.toLowerCase())
      ).slice(0, 5)
    : []

  const handleSelectMember = (m: Member) => {
    setSelectedMember(m)
    setTypedName(m.name)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const finalName = typedName.trim()
    if (!finalName) return

    onSaveViewer({
      name: finalName,
      memberId: selectedMember ? selectedMember.id : undefined,
      isSelfExcluded,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-2xl rounded-[32px] border border-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.24)] p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200 text-left">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/80 text-[#0071E3] flex items-center justify-center flex-shrink-0 shadow-2xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60 inline-block mb-1">
                Personalized Map View
              </span>
              <h3 className="font-display text-base sm:text-lg font-bold text-[#0F172A] tracking-tight">
                Who is viewing {chapterName}?
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

        <p className="text-xs text-slate-600 leading-relaxed font-normal">
          Enter your name once. Your browser remembers you so you get a tailored view, auto-exclude yourself from search, and find peers near your office.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Your Name / Chapter Profile *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={typedName}
                onChange={(e) => {
                  setTypedName(e.target.value)
                  setSelectedMember(null)
                }}
                placeholder="e.g. Ramesh Kumar"
                className="w-full text-xs font-semibold py-2.5 pl-3.5 pr-8 rounded-xl border border-slate-200/90 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] transition-all"
                autoFocus
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Smart Matching Roster Pills */}
            {matches.length > 0 && !selectedMember && (
              <div className="mt-2 space-y-1.5 p-2 bg-slate-50 rounded-2xl border border-slate-200/70 max-h-48 overflow-y-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block">
                  Select your profile from chapter roster:
                </span>
                {matches.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMember(m)}
                    className="w-full text-left p-2 rounded-xl bg-white hover:bg-blue-50/70 hover:border-[#0071E3]/40 border border-slate-200/60 shadow-2xs transition-all flex items-center justify-between gap-2 cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 group-hover:text-[#0071E3] transition-colors truncate">
                        {m.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{m.company} · {m.category}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#0071E3] bg-blue-50 px-2 py-0.5 rounded-md flex-shrink-0">
                      This is me
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Profile Badge */}
            {selectedMember && (
              <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div className="min-w-0 text-xs">
                    <span className="font-bold text-emerald-900 block truncate">
                      Linked: {selectedMember.name}
                    </span>
                    <span className="text-[10px] text-emerald-700 truncate block">
                      {selectedMember.company} ({selectedMember.location.area || selectedMember.location.city})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer flex-shrink-0"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Privacy & Self-Exclusion Setting */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isSelfExcluded}
                onChange={(e) => setIsSelfExcluded(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#0071E3] rounded border-slate-300 focus:ring-[#0071E3] cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                  Hide my name & pin from my own map view
                </span>
                <p className="text-[11px] text-slate-500 font-normal leading-normal mt-0.5">
                  Avoids cluttering your map with your own card when you are looking for fellow chapter members to visit or refer.
                </p>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="submit"
              disabled={!typedName.trim()}
              className="w-full ios-press py-3 px-4 rounded-xl btn-proxima-primary text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>Set My Map View ({typedName.trim() || 'Your Name'})</span>
            </button>

            {onBrowseAsGuest && (
              <button
                type="button"
                onClick={() => {
                  onBrowseAsGuest()
                  onClose()
                }}
                className="w-full ios-press py-2.5 px-4 rounded-xl btn-depth-secondary text-slate-600 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Browse as Visitor / Guest</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
