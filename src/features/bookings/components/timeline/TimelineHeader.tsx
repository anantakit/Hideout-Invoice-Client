import React from 'react'
import { isToday } from 'date-fns'
import { cn } from '@/shared/utils'

const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

interface TimelineHeaderProps {
  /** Memoized array of 7 Date objects for the current window. */
  days: Date[]
}

/**
 * Sticky header row showing 7 date columns aligned with the booking grid.
 *
 * Mirrors the two-column layout of RoomRow:
 *  - Left: room-label spacer (sticky, same width as room column)
 *  - Right: 7 date cells (one per day)
 *
 * Uses design-system typography tokens only (text-xs, text-foreground, etc.)
 * No hardcoded font sizes or colors.
 */
const TimelineHeader = React.memo(function TimelineHeader({ days }: TimelineHeaderProps) {
  return (
    <div className="flex sticky top-0 z-30 bg-card border-b border-border shadow-card">
      {/* Room-label column spacer — matches RoomRow's sticky column width */}
      <div
        className="sticky left-0 z-40 bg-card border-r border-border flex-shrink-0"
        style={{ width: 'var(--timeline-room-col-width)', minWidth: 'var(--timeline-room-col-width)' }}
      />

      {/* Date columns */}
      {days.map((day) => {
        const today = isToday(day)
        return (
          <div
            key={day.toISOString()}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-shrink-0 border-r border-border/50 py-1.5',
              today && 'bg-accent',
            )}
            style={{ width: 'var(--timeline-cell-width)' }}
          >
            {/* Day of week */}
            <span
              className={cn(
                'text-xs font-medium leading-none',
                today ? 'text-accent-foreground' : 'text-muted-foreground',
              )}
            >
              {THAI_DAYS_SHORT[day.getDay()]}
            </span>
            {/* Day number */}
            <span
              className={cn(
                'text-sm font-semibold leading-none',
                today ? 'text-foreground' : 'text-foreground/70',
              )}
            >
              {day.getDate()}
            </span>
            {/* "วันนี้" indicator */}
            {today && (
              <span className="text-[8px] font-medium text-accent-foreground/70 leading-none">
                วันนี้
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
})

export default TimelineHeader
