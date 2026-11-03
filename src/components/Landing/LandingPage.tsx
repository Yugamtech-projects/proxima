import React from 'react'
import {
  Compass,
  ShieldCheck,
  ArrowRight,
  Lock,
  Navigation,
  Layers,
  Plus,
} from 'lucide-react'
import { AnimatedBackgroundMap } from './AnimatedBackgroundMap'

interface LandingPageProps {
  onLaunchDemo: (accessKey?: string, cityName?: string) => void
  onOpenAdmin: () => void
  onOpenBrandStory: () => void
  onOpenCreateChapter?: () => void
  onOpenSecurity?: () => void
  onOpenPrivacy?: () => void
  onOpenTerms?: () => void
}

const SUPPORTED_NETWORKS = [
  'BNI®',
  'CNI',
  'Rotary',
  'TiE',
  'Yi (CII)',
  'Lions Club',
  'Round Table',
  'Private Business Forums',
]

const DEMO_CHAPTERS = [
  {
    name: 'Chennai - Demo',
    cityName: 'Chennai',
    accessKey: 'px_7b9f3e1a8d4c205e81d6f03a',
    area: 'Anna Nagar · Guindy · OMR',
  },
  {
    name: 'Bangalore Demo',
    cityName: 'Bengaluru',
    accessKey: 'px_3e71d80b5a942cf6a14e908b',
    area: 'Indiranagar · Whitefield · MG Road',
  },
  {
    name: 'Mumbai Demo',
    cityName: 'Mumbai',
    accessKey: 'px_80d4f17a9e25bc36e7192a54',
    area: 'BKC · Nariman Point · Andheri',
  },
]

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchDemo,
  onOpenAdmin,
  onOpenBrandStory,
  onOpenCreateChapter,
  onOpenSecurity,
  onOpenPrivacy,
  onOpenTerms,
}) => {
  return (
    <div className="h-screen max-h-screen w-full bg-[#FBFBFC] text-[#0F172A] select-none font-sans antialiased relative flex flex-col justify-between p-3 sm:p-4 lg:p-5 overflow-hidden">
      
      {/* 1. Subtle Cartographic Grid & Routes Background with 3D Globe */}
      <AnimatedBackgroundMap />

      {/* 2. Top Navigation Bar */}
      <header className="relative z-20 max-w-5xl mx-auto w-full flex-shrink-0">
        <div className="ios-glass px-4 sm:px-5 py-2 rounded-full border border-black/[0.06] shadow-[0_4px_20px_rgba(15,23,42,0.03)] flex items-center justify-between backdrop-blur-2xl bg-white/80">
          
          {/* Logo & Brand Identity */}
          <button
            type="button"
            onClick={onOpenBrandStory}
            className="ios-press flex items-center gap-2.5 text-left focus:outline-none cursor-pointer group"
            title="About Proxima by Yugam"
          >
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white p-0.5 shadow-2xs ring-1 ring-black/5 flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
              <img
                src="/proxima-icon.jpg"
                alt="Proxima Logo"
                className="w-full h-full rounded-[8px] object-cover"
              />
            </div>
            
            <div className="flex flex-col leading-none">
              <span className="font-display text-sm sm:text-[15px] font-bold tracking-tight text-[#0F172A] group-hover:text-[#0071E3] transition-colors">
                Proxima
              </span>
              <span className="text-[8px] sm:text-[9px] font-semibold text-slate-400 tracking-[0.2em] uppercase mt-0.5">
                by Yugam
              </span>
            </div>
          </button>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {onOpenCreateChapter && (
              <button
                type="button"
                onClick={onOpenCreateChapter}
                className="ios-press px-3.5 py-1.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_2px_10px_rgba(0,113,227,0.25)] cursor-pointer transition-all"
                title="Create a new chapter map"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Chapter</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenAdmin}
              className="ios-press px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-1.5 transition-all border border-black/10 shadow-2xs hover:border-[#0071E3]/40 cursor-pointer"
              title="Sign in to Chapter Admin Portal"
            >
              <Lock className="w-3.5 h-3.5 text-[#0071E3]" />
              <span>Login</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. Main Center Hero Core (Fits Effortlessly in Single Viewport) */}
      <main className="relative z-10 max-w-3xl mx-auto w-full flex-1 flex flex-col items-center justify-center text-center my-auto py-1 sm:py-2">
        
        {/* Emblem Squircle Housing */}
        <div className="relative mb-3 sm:mb-3.5">
          {/* Subtle Ambient Halo */}
          <div className="absolute -inset-2.5 bg-gradient-to-tr from-blue-500/15 via-amber-400/10 to-blue-500/10 rounded-[28px] blur-lg opacity-70 pointer-events-none" />
          
          {/* Squircle Icon */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] bg-white p-1 shadow-[0_12px_28px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.06] flex items-center justify-center">
            <img
              src="/proxima-icon.jpg"
              alt="Proxima by Yugam"
              className="w-full h-full rounded-[16px] object-cover"
            />
          </div>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="max-w-2xl space-y-1.5 mb-3.5 sm:mb-4">
          
          {/* Category Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-900/[0.04] border border-slate-900/[0.08] shadow-2xs text-[10px] sm:text-[11px] font-semibold text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="tracking-wide">Private Executive Chapter Networking</span>
          </div>

          {/* Master Headline */}
          <h1 className="font-display text-2xl sm:text-3xl lg:text-[40px] font-extrabold tracking-tight text-[#0F172A] leading-tight">
            <span className="block">Connect with chapter members</span>
            <span className="relative inline-block mt-1 sm:mt-1.5">
              <span className="animate-gradient-shimmer bg-[linear-gradient(90deg,#0071E3_0%,#3B82F6_22%,#7C3AED_48%,#06B6D4_75%,#0071E3_100%)] bg-[length:250%_auto] bg-clip-text text-transparent drop-shadow-[0_2px_14px_rgba(0,113,227,0.25)]">
                across your city.
              </span>
              {/* Subtle Glowing Gradient Accent Underline */}
              <svg
                className="absolute -bottom-1.5 left-0 w-full h-2 text-[#0071E3] opacity-85 overflow-visible pointer-events-none"
                viewBox="0 0 250 8"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 6C65 2 185 2 247 6"
                  stroke="url(#headline-city-gradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="headline-city-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0071E3" />
                    <stop offset="50%" stopColor="#7C3AED" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xs sm:text-[13px] text-slate-600 max-w-lg mx-auto leading-relaxed font-normal pt-0.5">
            Locate trusted business partners from your chapter near your office, client meetings, or commute routes. Private to your chapter with zero public directory leakage.
          </p>

          {/* Supported Business Networks (Unified Minimal Strip) */}
          <div className="flex items-center justify-center flex-wrap gap-1.5 pt-1 text-xs">
            <span className="text-slate-400 font-medium text-[10px] sm:text-[11px]">Used by chapters in:</span>
            <div className="inline-flex items-center flex-wrap justify-center gap-1.5 px-3 py-0.5 rounded-full bg-white/90 border border-slate-200/80 shadow-2xs">
              {SUPPORTED_NETWORKS.map((net, i) => (
                <React.Fragment key={net}>
                  <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px] tracking-tight">{net}</span>
                  {i < SUPPORTED_NETWORKS.length - 1 && <span className="text-slate-300 text-[9px]">·</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full max-w-md mb-6 sm:mb-8">
          <button
            type="button"
            onClick={() => onLaunchDemo(DEMO_CHAPTERS[0].accessKey, DEMO_CHAPTERS[0].cityName)}
            className="ios-press w-full sm:w-auto py-2.5 px-6 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs sm:text-[13px] font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-[0_6px_18px_rgba(0,113,227,0.28)] hover:shadow-[0_8px_22px_rgba(0,113,227,0.38)] transition-all hover:-translate-y-0.5"
          >
            <Compass className="w-4 h-4 text-amber-300" />
            <span className="tracking-tight">Open Demo Map</span>
            <ArrowRight className="w-3.5 h-3.5 text-white/90" />
          </button>

          {onOpenCreateChapter && (
            <button
              type="button"
              onClick={onOpenCreateChapter}
              className="ios-press w-full sm:w-auto py-2.5 px-5 rounded-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 text-xs sm:text-[13px] font-semibold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer hover:border-slate-300 transition-all hover:-translate-y-0.5"
              title="Register a chapter map"
            >
              <Plus className="w-3.5 h-3.5 text-[#0071E3]" />
              <span>Register Chapter</span>
            </button>
          )}
        </div>

        {/* Informational Feature Ribbon (Static Display - Zero Interaction / Private) */}
        <div className="w-full max-w-2xl mx-auto pointer-events-none select-none mt-1 sm:mt-2">
          <div className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.03),inset_0_1px_0_rgba(255,255,255,0.95)] flex flex-wrap items-center justify-around gap-y-2 gap-x-4 sm:gap-x-6 backdrop-blur-xl">
            
            {/* Metric 1: Precision Proximity */}
            <div className="flex items-center gap-2.5 text-left">
              <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200/60 text-[#0071E3] flex items-center justify-center flex-shrink-0 shadow-2xs">
                <Navigation className="w-3 h-3" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] sm:text-xs font-bold font-mono tracking-wider text-slate-900">
                  1 – 10 KM
                </span>
                <span className="text-[10px] font-medium text-slate-500">
                  Precision Radius
                </span>
              </div>
            </div>

            {/* Hairline Divider */}
            <div className="hidden sm:block w-[1px] h-5 bg-slate-200" />

            {/* Metric 2: Commercial Corridors */}
            <div className="flex items-center gap-2.5 text-left">
              <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-700 flex items-center justify-center flex-shrink-0 shadow-2xs">
                <Layers className="w-3 h-3" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] sm:text-xs font-bold font-mono tracking-wider text-slate-900">
                  ZONAL HUBS
                </span>
                <span className="text-[10px] font-medium text-slate-500">
                  CBD & Corridors
                </span>
              </div>
            </div>

            {/* Hairline Divider */}
            <div className="hidden sm:block w-[1px] h-5 bg-slate-200" />

            {/* Metric 3: Chapter Sovereignty */}
            <div className="flex items-center gap-2.5 text-left">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-700 flex items-center justify-center flex-shrink-0 shadow-2xs">
                <ShieldCheck className="w-3 h-3" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] sm:text-xs font-bold font-mono tracking-wider text-slate-900">
                  ZERO SCRAPING
                </span>
                <span className="text-[10px] font-medium text-slate-500">
                  Private Directory
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 4. Single-Screen Institutional Footer */}
      <footer className="relative z-20 max-w-5xl mx-auto w-full pt-2.5 pb-1 border-t border-black/[0.06] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 flex-shrink-0">
        
        {/* Core Attribution */}
        <div className="flex items-center gap-1.5 font-medium text-[12px] sm:text-[13px] text-slate-700">
          <span className="text-slate-500">Proudly built from the house of</span>
          <a
            href="https://www.oruyugam.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#0F172A] hover:text-[#0071E3] underline decoration-[#0F172A]/25 hover:decoration-[#0071E3] underline-offset-2 transition-colors cursor-pointer"
          >
            Yugam Consulting
          </a>
        </div>

        {/* Legal & Policy Links */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap text-[11px] text-slate-500">
          <button
            type="button"
            onClick={onOpenSecurity || onOpenPrivacy}
            className="hover:text-[#0071E3] transition-colors cursor-pointer font-medium"
          >
            Security Policy
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="hover:text-[#0071E3] transition-colors cursor-pointer font-medium"
          >
            Privacy Policy
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={onOpenTerms}
            className="hover:text-[#0071E3] transition-colors cursor-pointer font-medium"
          >
            Terms & Conditions
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={onOpenBrandStory}
            className="hover:text-[#0071E3] transition-colors cursor-pointer font-medium"
          >
            Brand Story
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="hover:text-[#0071E3] transition-colors cursor-pointer font-semibold text-slate-700"
          >
            Admin Login
          </button>
        </div>
      </footer>
    </div>
  )
}
