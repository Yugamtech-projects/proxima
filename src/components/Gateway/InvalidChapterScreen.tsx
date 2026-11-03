import React from 'react'
import { ShieldAlert, Lock, AlertTriangle, ArrowLeft, KeyRound } from 'lucide-react'

interface InvalidChapterScreenProps {
  attemptedToken: string
  onOpenAdmin: () => void
  onReset: () => void
}

export const InvalidChapterScreen: React.FC<InvalidChapterScreenProps> = ({
  attemptedToken,
  onOpenAdmin,
  onReset,
}) => {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex items-center justify-center p-4 bg-[#F5F5F7] select-none">
      {/* Decorative Warning Backdrop Glow */}
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Security Rejection Modal Card */}
      <div className="relative w-full max-w-md ios-glass p-7 sm:p-9 rounded-[36px] shadow-[0_25px_70px_rgba(0,0,0,0.15)] border border-red-200/60 space-y-6 text-center">
        {/* Security Shield Icon */}
        <div className="w-16 h-16 rounded-[24px] bg-red-50 border border-red-200/80 text-red-600 flex items-center justify-center mx-auto shadow-sm ring-8 ring-red-50/50">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100/80 text-red-800 text-[10px] font-bold uppercase tracking-wider mb-2">
            <Lock className="w-3 h-3 text-red-700" />
            <span>Chapter Not Found</span>
          </div>
          <h2 className="text-lg font-black text-[#1D1D1F] tracking-tight">
            Invalid Chapter Link
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
            This chapter link is invalid or expired. Please check the link or ask your chapter coordinator for a new invite.
          </p>
        </div>

        {/* Invalid Link Details */}
        <div className="p-3 bg-red-50/60 rounded-2xl border border-red-200/70 text-left space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-red-800 uppercase tracking-wider">
            <span>Attempted Link:</span>
            <span className="text-red-500">Not Found</span>
          </div>
          <p className="font-mono text-xs text-red-900 truncate bg-white/70 px-2 py-1 rounded-lg border border-red-200/50">
            {attemptedToken ? `?c=${attemptedToken}` : 'No link provided'}
          </p>
        </div>

        {/* Security Notice */}
        <div className="p-3 bg-white/80 rounded-2xl border border-black/[0.04] text-[11px] text-slate-600 text-left flex items-start gap-2.5 leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p>
            Each chapter has its own private link. Please use the exact link shared by your chapter coordinator.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onReset}
            className="ios-press w-full py-3 rounded-full bg-[#1D1D1F] hover:bg-black text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to Home Page</span>
          </button>

          <button
            type="button"
            onClick={onOpenAdmin}
            className="ios-press w-full py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-500" />
            <span>Login</span>
          </button>
        </div>
      </div>
    </div>
  )
}
