import React from 'react'
import { cn } from '@/shared/utils'
import { ZOOM_CONFIG, type ZoomLevel } from '../utils/timelineConstants'

// ─── Props ──────────────────────────────────────────────────────────────────

interface ZoomControlProps {
  zoomLevel: ZoomLevel
  onZoomChange: (level: ZoomLevel) => void
}

// ─── Component ──────────────────────────────────────────────────────────────

const LEVELS: ZoomLevel[] = ['3d', '7d', '14d']

const ZoomControl = React.memo(function ZoomControl({
  zoomLevel,
  onZoomChange,
}: ZoomControlProps) {
  return (
    <div className="flex items-center h-9 bg-accent/50 rounded-lg p-0.5 gap-0.5">
      {LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => onZoomChange(level)}
          className={cn(
            'px-3.5 h-8 rounded-md text-sm font-medium transition-all',
            zoomLevel === level
              ? 'bg-tl-accent text-white shadow-sm'
              : 'text-tl-text-dim hover:text-tl-text',
          )}
        >
          {ZOOM_CONFIG[level].label}
        </button>
      ))}
    </div>
  )
})

export default ZoomControl
