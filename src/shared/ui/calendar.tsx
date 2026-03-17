import { useState, useCallback } from 'react'
import {
  format,
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  addMonths, subMonths,
  isSameDay, isSameMonth,
  isAfter, isBefore,
  isToday,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/utils'

// ─── Thai locale constants ────────────────────────────────────────────────────

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

const DAY_HEADERS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildWeeks(viewDate: Date): Date[][] {
  const monthStart = startOfMonth(viewDate)
  const monthEnd   = endOfMonth(viewDate)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd    = endOfWeek(monthEnd,   { weekStartsOn: 1 })
  const weeks: Date[][] = []
  const cursor = new Date(gridStart)
  while (cursor <= gridEnd) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarProps {
  /** Currently selected start date (null = nothing selected) */
  pendingStart: Date | null
  /** Currently selected end date (null = awaiting second click) */
  pendingEnd: Date | null
  /** Hovered date for range preview while user is mid-selection */
  hoveredDate: Date | null
  onDayClick: (date: Date) => void
  onDayHover: (date: Date | null) => void
  /** Override the month shown on first render */
  initialViewDate?: Date
  /** Optional className on the root element */
  className?: string
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export function Calendar({
  pendingStart,
  pendingEnd,
  hoveredDate,
  onDayClick,
  onDayHover,
  initialViewDate,
  className,
}: CalendarProps) {
  const [viewDate, setViewDate] = useState(() => initialViewDate ?? new Date())
  const weeks = buildWeeks(viewDate)

  const prevMonth = useCallback(() => setViewDate(v => subMonths(v, 1)), [])
  const nextMonth = useCallback(() => setViewDate(v => addMonths(v, 1)), [])

  // While user has only clicked start, preview the range to hover target
  const previewEnd =
    pendingEnd ??
    (pendingStart && hoveredDate && !isBefore(hoveredDate, pendingStart)
      ? hoveredDate
      : null)

  const hasRange = !!(
    pendingStart && previewEnd && !isSameDay(pendingStart, previewEnd)
  )

  return (
    <div className={cn('select-none w-full', className)}>

      {/* ── Month navigation ─────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          aria-label="เดือนก่อนหน้า"
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center radius-badge
                     text-muted-foreground hover:text-foreground hover:bg-accent
                     transition-colors duration-150"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-body font-semibold text-foreground tracking-tight">
          {THAI_MONTHS[viewDate.getMonth()]} {viewDate.getFullYear() + 543}
        </span>

        <button
          type="button"
          aria-label="เดือนถัดไป"
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center radius-badge
                     text-muted-foreground hover:text-foreground hover:bg-accent
                     transition-colors duration-150"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Day-of-week headers ───────────────────────────────── */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map(label => (
          <div
            key={label}
            className="text-center text-[11px] font-medium text-muted-foreground py-1.5"
          >
            {label}
          </div>
        ))}
      </div>

      {/* ── Day grid ─────────────────────────────────────────── */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day, di) => {
            const inMonth  = isSameMonth(day, viewDate)
            const isStart  = pendingStart ? isSameDay(day, pendingStart) : false
            const isEnd    = previewEnd   ? isSameDay(day, previewEnd)   : false
            const inRange  =
              hasRange &&
              isAfter(day, pendingStart!) &&
              isBefore(day, previewEnd!)
            const dayToday = isToday(day)
            const selected = isStart || isEnd

            // Range band: continuous highlight strip behind cells
            const showBand = hasRange && inMonth && (isStart || isEnd || inRange)

            return (
              <div
                key={di}
                className={cn(
                  'relative flex items-center justify-center',
                  // Range band background — stretches full cell width
                  showBand && !selected && 'bg-primary/8',
                  // Start: only right half has band
                  showBand && isStart && !isEnd && 'bg-transparent',
                  // End: only left half has band
                  showBand && isEnd && !isStart && 'bg-transparent',
                  // Both start+end on same day: no band
                  isStart && isEnd && 'bg-transparent',
                )}
              >
                {/* Half-fill pseudo band for start/end */}
                {showBand && isStart && !isEnd && (
                  <div className="absolute inset-y-0 right-0 w-1/2 bg-primary/8" />
                )}
                {showBand && isEnd && !isStart && (
                  <div className="absolute inset-y-0 left-0 w-1/2 bg-primary/8" />
                )}

                <button
                  type="button"
                  disabled={!inMonth}
                  onClick={() => onDayClick(day)}
                  onMouseEnter={() => onDayHover(day)}
                  onMouseLeave={() => onDayHover(null)}
                  className={cn(
                    // Base
                    'relative z-10 w-9 h-9 flex items-center justify-center text-sm rounded-full',
                    'transition-all duration-100',
                    // Out-of-month
                    !inMonth && 'opacity-0 pointer-events-none',
                    // In-month defaults
                    inMonth && !selected && 'text-foreground',
                    // Today indicator (not selected)
                    inMonth && !selected && dayToday &&
                      'font-semibold text-primary ring-1 ring-primary/40',
                    // In-range text
                    inRange && !selected && 'text-foreground',
                    // Hover (not selected, not in-range)
                    inMonth && !selected && !inRange && 'hover:bg-accent',
                    // Selected circle
                    selected && 'date-selected font-semibold',
                  )}
                >
                  {format(day, 'd')}
                </button>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
