import React from 'react'
import { format } from 'date-fns'
import { cn, THAI_MONTHS_SHORT, THAI_DAYS as THAI_DAYS_SHORT } from '@/shared/utils'

export const MobileDateStrip = React.memo(function MobileDateStrip({
  days,
  selectedIndex,
  todayStr,
  stripRef,
  onSelectDay,
}: {
  days: Date[]
  selectedIndex: number
  todayStr: string
  stripRef: React.RefObject<HTMLDivElement | null>
  onSelectDay: (index: number) => void
}) {
  return (
    <div
      ref={stripRef}
      className="shrink-0 flex border-b border-border-soft bg-sidebar overflow-x-auto scrollbar-hide snap-x snap-mandatory"
    >
      {days.map((day, i) => {
        const isActive = i === selectedIndex
        const isToday = format(day, 'yyyy-MM-dd') === todayStr
        const dayOfWeek = day.getDay()
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelectDay(i)}
            className={cn(
              'flex-shrink-0 w-12 snap-center flex flex-col items-center py-1.5 gap-0.5 text-center transition-colors',
              isActive
                ? 'bg-primary/15 text-foreground'
                : isWeekend
                  ? 'text-muted-foreground/70'
                  : 'text-muted-foreground hover:bg-muted',
            )}
          >
            <span className={cn(
              'text-[10px] font-medium leading-none',
              isActive && 'text-primary',
            )}>
              {THAI_DAYS_SHORT[dayOfWeek]}
            </span>
            <span className={cn(
              'text-sm font-semibold leading-none',
              isActive && 'text-primary',
            )}>
              {day.getDate()}
            </span>
            {isToday && (
              <span className="w-1 h-1 rounded-full bg-primary" />
            )}
            {day.getDate() === 1 && (
              <span className="text-[8px] text-muted-foreground/60 leading-none">
                {THAI_MONTHS_SHORT[day.getMonth()]}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
})
