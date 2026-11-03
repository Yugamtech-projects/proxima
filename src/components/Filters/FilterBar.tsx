import React from 'react'
import type { DistanceRadius } from '../../types/member'

interface FilterBarProps {
  selectedRadius: DistanceRadius
  onSelectRadius: (radius: DistanceRadius) => void
  hasAnchorPoint: boolean
  matchCount: number
}

const RADIUS_OPTIONS: DistanceRadius[] = [3, 5, 10, 15, 25, 'ALL']

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedRadius,
  onSelectRadius,
  hasAnchorPoint,
  matchCount,
}) => {
  return (
    <div className="w-full flex items-center justify-between gap-2 pointer-events-auto">
      {/* iOS Segmented Control Bar for Radius */}
      <div className="ios-glass p-1 rounded-full flex items-center shadow-xs border border-white/95">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2.5 pr-2 font-mono-num">
          Radius
        </span>
        <div className="flex items-center bg-black/5 p-0.5 rounded-full">
          {RADIUS_OPTIONS.map((radius) => {
            const isSelected = selectedRadius === radius
            return (
              <button
                key={radius}
                onClick={() => onSelectRadius(radius)}
                title={hasAnchorPoint ? `Filter within ${radius}km` : 'Filter within radius'}
                className={`ios-press px-2.5 sm:px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer font-mono-num ${
                  isSelected
                    ? 'bg-white text-[#0071E3] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {radius === 'ALL' ? 'All' : `${radius}k`}
              </button>
            )
          })}
        </div>
      </div>

      {/* Live Executive Counter Badge */}
      <div className="ios-glass px-3.5 py-1.5 rounded-full text-[11px] font-bold text-slate-800 shadow-xs flex items-center gap-1.5 border border-white/95 flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-xs" />
        <span className="font-mono-num font-extrabold">{matchCount}</span>
        <span className="font-display tracking-tight text-slate-600">
          {matchCount === 1 ? 'Office' : 'Offices'}
        </span>
      </div>
    </div>
  )
}
