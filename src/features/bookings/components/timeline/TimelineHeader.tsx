import React from 'react'
import { isToday, isSaturday, isSunday } from 'date-fns'
import { cn } from '@/shared/utils'

const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

interface TimelineHeaderProps {
  /** Memoized array of 7 Date objects for the current window. */
  days: Date[]
}

const TimelineHeader = React.memo(function TimelineHeader({ days }: TimelineHeaderProps) {
  return (
    <div className="flex sticky top-0 z-30 bg-sidebar border-b border-border-soft shadow-card">
      {/* Room-label column spacer — matches RoomRow's sticky column width */}
      <div
        className="sticky left-0 z-40 bg-sidebar border-r border-border-soft flex-shrink-0"
        style={{
          width: 'var(--timeline-room-col-width)',
          minWidth: 'var(--timeline-room-col-width)',
          height: 'var(--timeline-row-height)',
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
              'flex flex-col items-center justify-center gap-0.5 flex-shrink-0 border-r border-timeline-grid/40',
              today ? 'bg-primary/10 border-b-2 border-b-timeline-today/50' : isWeekend && 'bg-muted/30',
            )}
            style={{
              width: 'var(--timeline-cell-width)',
              height: 'var(--timeline-row-height)',
            }}
          >
            {/* Day of week */}
            <span
              className={cn(
                'text-xs font-medium leading-none',
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
