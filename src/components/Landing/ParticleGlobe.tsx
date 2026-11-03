import React, { useEffect, useRef, useState } from 'react'
import createGlobe from 'cobe'

interface ParticleGlobeProps {
  className?: string
}

export const ParticleGlobe: React.FC<ParticleGlobeProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mousePos = useRef({ x: 0, y: 0 })
  const targetPhi = useRef(0)
  const currentPhi = useRef(0)
  const currentTheta = useRef(0.18)
  const [hasWebGL, setHasWebGL] = useState(true)

  useEffect(() => {
    let width = 0
    const canvas = canvasRef.current
    if (!canvas) return

    const onResize = () => {
      if (canvas) {
        width = canvas.offsetWidth
      }
    }
    window.addEventListener('resize', onResize)
    onResize()

    // Smooth mouse position listener across the whole window
    const handleMouseMove = (e: MouseEvent) => {
      // Normalized coordinates: -1 (left/top) to +1 (right/bottom)
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = (e.clientY / window.innerHeight) * 2 - 1
      mousePos.current = { x: nx, y: ny }
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    let globe: ReturnType<typeof createGlobe> | null = null

    try {
      // Colossal planetary 3D particle globe
      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width: Math.min(Math.max(width || 1100, 1000) * 2, 2800),
        height: Math.min(Math.max(width || 1100, 1000) * 2, 2800),
        phi: 0,
        theta: 0.18,
        dark: 0,
        diffuse: 1.3,
        scale: 1.08,
        mapSamples: 32000,
        mapBrightness: 5.5,
        baseColor: [0.72, 0.79, 0.89],
        markerColor: [0.72, 0.79, 0.89],
        glowColor: [1.0, 1.0, 1.0],
        opacity: 0.4,
        offset: [0, 0],
        markers: [],
        arcs: [],
      })
    } catch (err) {
      console.warn('Particle globe WebGL init skipped:', err)
      setHasWebGL(false)
      return
    }

    let animId: number
    const animate = () => {
      // 1. Smooth, majestic celestial planetary rotation
      targetPhi.current += 0.0022

      // 2. Mouse pointer gentle influence (orbital camera panning & subtle tilt)
      const targetP = targetPhi.current + mousePos.current.x * 0.32
      const targetT = 0.18 + mousePos.current.y * 0.1

      // 3. Silky smooth physical inertia lerp (heavy celestial body damping)
      currentPhi.current += (targetP - currentPhi.current) * 0.035
      currentTheta.current += (targetT - currentTheta.current) * 0.035

      globe?.update({
        phi: currentPhi.current,
        theta: currentTheta.current,
      })

      animId = requestAnimationFrame(animate)
    }
    animId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', handleMouseMove)
      globe?.destroy()
    }
  }, [])

  if (!hasWebGL) {
    return null
  }

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full pointer-events-none transition-opacity duration-1000"
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          aspectRatio: '1',
          contain: 'layout paint size',
        }}
      />
      {/* Multi-Tonal Chromatic Prism Filter: Sapphire -> Soft Indigo -> Warm Champagne */}
      <div 
        className="absolute inset-0 rounded-full pointer-events-none mix-blend-color opacity-75"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.9) 0%, rgba(99, 102, 241, 0.75) 50%, rgba(245, 158, 11, 0.65) 92%)',
        }}
      />
    </div>
  )
}
