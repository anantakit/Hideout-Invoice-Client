import type { DailyOccupancyEntry } from '../types'

interface Props {
  data: DailyOccupancyEntry[]
  totalRooms: number
}

/**
 * A tiny inline sparkline showing 14-day occupancy trend.
 * Renders as SVG — no external chart library needed.
 */
export function OccupancySparkline({ data, totalRooms }: Props) {
  if (data.length === 0 || totalRooms === 0) return null

  const width = 100
  const height = 24
  const padding = 1

  const rates = data.map((d) => d.occupied / totalRooms)
  const max = Math.max(...rates, 0.01) // avoid division by zero
  const step = (width - padding * 2) / (rates.length - 1 || 1)

  const points = rates.map((r, i) => {
    const x = padding + i * step
    const y = height - padding - (r / max) * (height - padding * 2)
    return `${x},${y}`
  })

  const polyline = points.join(' ')

  // Fill area under the line
  const fillPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${padding + (rates.length - 1) * step},${height - padding}`,
  ].join(' ')

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-6 mt-1"
      preserveAspectRatio="none"
    >
      <polygon
        points={fillPoints}
        fill="hsl(var(--primary))"
        opacity={0.15}
      />
      <polyline
        points={polyline}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot on last point */}
      {rates.length > 0 && (
        <circle
          cx={padding + (rates.length - 1) * step}
          cy={height - padding - (rates[rates.length - 1] / max) * (height - padding * 2)}
          r={2}
          fill="hsl(var(--primary))"
        />
      )}
    </svg>
  )
}
