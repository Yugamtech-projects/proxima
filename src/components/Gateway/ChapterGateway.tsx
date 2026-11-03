import React, { useState } from 'react'
import { ArrowRight, Link2, Lock, Sparkles } from 'lucide-react'
import { getChapterByToken, DEFAULT_CHAPTERS } from '../../data/chapters'

interface ChapterGatewayProps {
  onSelectChapter: (accessKey: string) => void
  onOpenAdmin: () => void
  onOpenBrandStory?: () => void
  onOpenLegal?: () => void
}

export const ChapterGateway: React.FC<ChapterGatewayProps> = ({
  onSelectChapter,
  onOpenAdmin,
  onOpenBrandStory,
}) => {
  const [inputCode, setInputCode] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let clean = inputCode.trim()
    if (clean.includes('?c=')) {
      clean = clean.split('?c=')[1].split('&')[0]
    } else if (clean.includes('?chapter=')) {
      clean = clean.split('?chapter=')[1].split('&')[0]
    }

    if (!clean) {
      setErrorMsg('Please enter your chapter key or paste your private invite link.')
      return
    }

    const found = getChapterByToken(clean)
    if (found) {
      setErrorMsg(null)
      onSelectChapter(found.accessKey)
    } else {
      setErrorMsg(`Access token not recognized. Please check your chapter invitation link.`)
    }
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden flex items-center justify-center p-4 bg-[#F5F5F7] select-none font-sans antialiased">
      {/* Soft Ambient Apple Radial Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] bg-gradient-to-tr from-blue-400/10 via-sky-300/10 to-indigo-300/10 rounded-full blur-3xl pointer-events-none" />

      {/* Gateway Card */}
      <div className="relative w-full max-w-[390px] bg-white/85 backdrop-blur-2xl p-8 sm:p-9 rounded-[38px] shadow-[0_24px_70px_-12px_rgba(0,0,0,0.12),0_0_0_1px_rgba(255,255,255,0.9)_inset] border border-black/[0.05] space-y-7 text-center">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={onOpenBrandStory}
            className="group flex flex-col items-center focus:outline-none cursor-pointer"
            title="About PROXIMA by Yugam — Heritage & Philosophy"
          >
            {/* App Icon Mark */}
            <div className="w-[72px] h-[72px] rounded-[22px] bg-[#0B0D14] p-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.18)] ring-1 ring-black/10 flex items-center justify-center mb-4 transition-transform group-hover:scale-[1.04]">
              <img
                src="/proxima-icon.jpg"
                alt="Proxima"
                className="w-full h-full rounded-[16px] object-cover"
              />
            </div>

            {/* Title */}
            <h1 className="text-[26px] font-bold tracking-tight text-[#1D1D1F] leading-none">
              PROXIMA
            </h1>

            {/* by Yugam below logo */}
            <p className="text-[11px] font-semibold text-slate-400 tracking-[0.22em] uppercase mt-2 group-hover:text-slate-600 transition-colors">
              by Yugam
            </p>
          </button>
        </div>

        {/* Chapter Access Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
          <div className="space-y-1.5">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Link2 className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value)
                  if (errorMsg) setErrorMsg(null)
                }}
                placeholder="Paste chapter link or access code"
                className="w-full text-xs font-medium pl-10 pr-3.5 py-3.5 rounded-2xl border border-black/[0.08] bg-[#E8E8ED]/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0071E3]/15 focus:border-[#0071E3]/40 shadow-xs transition-all placeholder:text-slate-400"
                autoFocus
              />
            </div>
            {errorMsg && (
              <p className="text-[11px] text-red-600 font-medium px-1.5 pt-0.5 animate-in fade-in">
                {errorMsg}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="ios-press w-full py-3.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.985] text-white text-xs font-bold transition-all shadow-[0_4px_16px_rgba(0,113,227,0.3)] flex items-center justify-center gap-2"
          >
            <span>Access Chapter Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Quick Sample Link & Admin Sign In */}
        <div className="pt-2 border-t border-black/[0.05] flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={() => onSelectChapter(DEFAULT_CHAPTERS[0].accessKey)}
            className="ios-press text-slate-500 hover:text-[#0071E3] text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#0071E3]" />
            <span>Launch Sample Chapter (Chennai Titans)</span>
          </button>

          <button
            type="button"
            onClick={onOpenAdmin}
            className="ios-press text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1.5 pt-0.5 transition-colors"
          >
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Admin Sign In</span>
          </button>
        </div>
      </div>
    </div>
  )
}
