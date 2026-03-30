import React, { useMemo } from 'react'
import { isToday, isSaturday, isSunday } from 'date-fns'
import { cn, THAI_MONTHS_SHORT, THAI_DAYS as THAI_DAYS_SHORT } from '@/shared/utils'

interface MonthSpan {
  key: string
  label: string
  colSpan: number
}

interface TimelineHeaderProps {
  /** Memoized array of Date objects for the current buffer. */
  days: Date[]
}

const TimelineHeader = React.memo(function TimelineHeader({ days }: TimelineHeaderProps) {
  // Group consecutive days by month for the top row
  const monthSpans = useMemo<MonthSpan[]>(() => {
    const spans: MonthSpan[] = []
    for (const day of days) {
      const key = `${day.getFullYear()}-${day.getMonth()}`
      const label = `${THAI_MONTHS_SHORT[day.getMonth()]} ${day.getFullYear() + 543}`
      const last = spans[spans.length - 1]
      if (last?.key === key) {
        last.colSpan++
      } else {
        spans.push({ key, label, colSpan: 1 })
      }
    }
    return spans
  }, [days])

  return (
    <div className="sticky top-0 z-30 bg-sidebar border-b border-border-soft shadow-card">
      {/* ── Month grouping row (compact 20px) ─────────────────────────── */}
      <div className="flex" style={{ height: '20px' }}>
        {/* Room-label spacer */}
        <div
          className="sticky left-0 z-40 bg-sidebar border-r border-border-soft shrink-0"
          style={{
            width: 'var(--timeline-room-col-width)',
            minWidth: 'var(--timeline-room-col-width)',
          }}
        />
        {monthSpans.map((span) => (
          <div
            key={span.key}
            className="flex items-center px-2 border-r border-timeline-grid/30 shrink-0 overflow-hidden"
            style={{ width: `calc(${span.colSpan} * var(--timeline-cell-width))` }}
          >
            <span className="text-[10px] font-medium text-muted-foreground/70 truncate leading-none">
              {span.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Day columns row (36px) ────────────────────────────────────── */}
      <div className="flex" style={{ height: '36px' }}>
        {/* Room-label column spacer */}
        <div
          className="sticky left-0 z-40 bg-sidebar border-r border-border-soft shrink-0"
          style={{
            width: 'var(--timeline-room-col-width)',
            minWidth: 'var(--timeline-room-col-width)',
          }}
        />

        {/* Date columns */}
        {days.map((day) => {
          const today = isToday(day)
          const isWeekend = isSaturday(day) || isSunday(day)
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'flex flex-col items-center justify-center gap-0 shrink-0 border-r border-timeline-grid/40',
                today
                  ? 'bg-timeline-today/12 border-b-2 border-b-timeline-today/60'
                  : isWeekend && 'bg-muted/30',
              )}
              style={{ width: 'var(--timeline-cell-width)' }}
            >
              {/* Day of week */}
              <span
                className={cn(
                  'text-[10px] font-medium leading-none',
                  today
                    ? 'text-accent-foreground'
                    : isWeekend
                      ? 'text-muted-foreground/80'
                      : 'text-muted-foreground',
                )}
              >
                {THAI_DAYS_SHORT[day.getDay()]}
              </span>
              {/* Day number */}
              <span
                className={cn(
                  'text-sm font-semibold leading-tight',
                  today ? 'text-foreground' : 'text-foreground/70',
                )}
              >
                {day.getDate()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default TimelineHeader
