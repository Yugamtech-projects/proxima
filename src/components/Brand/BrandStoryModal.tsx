import React from 'react'
import { X, Compass, ShieldCheck, MapPin, ArrowRight } from 'lucide-react'

interface BrandStoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export const BrandStoryModal: React.FC<BrandStoryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in select-none">
      <div className="bg-[#F5F5F7] w-full max-w-lg rounded-[38px] shadow-[0_28px_80px_rgba(0,0,0,0.35)] border border-white/70 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-black/[0.05] flex items-center justify-between bg-white/80 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              About Proxima
            </span>
          </div>

          <button
            onClick={onClose}
            className="ios-press p-2 hover:bg-black/5 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-center">
          {/* Brand Icon & Heading */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-[22px] bg-[#0A0D14] p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.2)] ring-1 ring-black/10 flex items-center justify-center mb-3.5">
              <img
                src="/proxima-icon.jpg"
                alt="Proxima by Yugam"
                className="w-full h-full rounded-[18px] object-cover"
              />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">PROXIMA</h2>
            <p className="text-[11px] font-semibold text-slate-400 tracking-[0.25em] uppercase mt-1">
              by Yugam
            </p>
          </div>

          {/* Narrative Paragraph */}
          <div className="ios-glass p-5 rounded-[28px] border border-white/90 shadow-xs text-left space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Named after <strong className="text-slate-900 font-semibold">Proxima Centauri</strong>—the closest star to our Solar System—and the Latin word for &ldquo;nearest neighbor&rdquo;.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              In business networking, trust is built faster in person. Deals happen sooner and relationships grow stronger when you know which chapter members are working nearby.
            </p>
          </div>

          {/* 3 Pillars */}
          <div className="grid grid-cols-1 gap-3 text-left">
            {/* Pillar 1 */}
            <div className="p-4 bg-white rounded-2xl border border-black/[0.04] flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0071E3] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Find Members Nearby</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                  See chapter members working near your current location or meeting spot, making it easy to schedule 1-to-1 meetings on your way.
                </p>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-4 bg-white rounded-2xl border border-black/[0.04] flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#8B5CF6] flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Color-Coded Neighborhoods</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                  Pins are color-coded by area so you can easily spot clusters of members across your city at a glance.
                </p>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-4 bg-white rounded-2xl border border-black/[0.04] flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Private Chapter Access</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                  Each chapter has its own private link. Only your members can view your chapter map, and your data is never shared or tracked.
                </p>
              </div>
            </div>
          </div>

          {/* Action button */}
          <button
            type="button"
            onClick={onClose}
            className="ios-press w-full py-3.5 rounded-full bg-[#1D1D1F] hover:bg-black text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Explore Chapter Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <p className="text-[11px] text-slate-400 text-center font-medium pt-1">
            Proudly built from the house of{' '}
            <a
              href="https://www.oruyugam.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#0F172A] hover:text-[#0071E3] underline decoration-slate-300 transition-colors"
            >
              Yugam Consulting
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
