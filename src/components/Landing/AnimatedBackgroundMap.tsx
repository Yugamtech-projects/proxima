import React from 'react'
import { ParticleGlobe } from './ParticleGlobe'

export const AnimatedBackgroundMap: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* 1. Luminous Ambient Gradient Lighting */}
      <div 
        className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[85vw] h-[500px] max-w-[1100px] rounded-full pointer-events-none opacity-60"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(59, 130, 246, 0.14) 0%, rgba(147, 197, 253, 0.05) 50%, transparent 75%)',
          filter: 'blur(80px)',
        }}
      />

      <div 
        className="absolute top-[30%] -left-[10%] w-[450px] h-[450px] rounded-full pointer-events-none opacity-35"
        style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 70%)',
          filter: 'blur(90px)',
        }}
      />

      <div 
        className="absolute top-[35%] -right-[10%] w-[500px] h-[500px] rounded-full pointer-events-none opacity-35"
        style={{
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
          filter: 'blur(90px)',
        }}
      />

      {/* 2. Sleek Architectural Micro-Grid (Ultra-Subtle) */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #0F172A 1px, transparent 1px),
            linear-gradient(to bottom, #0F172A 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* 3. Colossal Planetary 3D Particle Globe Centerpiece */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[840px] h-[840px] sm:w-[1100px] sm:h-[1100px] lg:w-[1380px] lg:h-[1380px] xl:w-[1600px] xl:h-[1600px] flex items-center justify-center pointer-events-none opacity-60">
        {/* Subtle Concentric Orbital Rings */}
        <div className="absolute w-[103%] h-[103%] rounded-full border border-blue-400/15 pointer-events-none" />
        <div className="absolute w-[114%] h-[114%] rounded-full border border-dashed border-slate-300/25 pointer-events-none" />
        <div className="absolute w-[124%] h-[124%] rounded-full border border-black/[0.02] pointer-events-none" />

        {/* Globe Canvas */}
        <ParticleGlobe className="w-full h-full" />
      </div>

      {/* 4. Center Diffusion Mask (Softly fades globe behind text for 100% typography legibility) */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(251, 251, 252, 0.72) 0%, rgba(251, 251, 252, 0.35) 55%, rgba(251, 251, 252, 0.85) 88%, #FBFBFC 100%)',
        }}
      />
    </div>
  )
}
