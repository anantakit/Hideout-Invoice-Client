import { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react'
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

function computePreviewEnd(
  pendingStart: Date | null,
  pendingEnd: Date | null,
  hoveredDate: Date | null,
): Date | null {
  return (
    pendingEnd ??
    (pendingStart && hoveredDate && !isBefore(hoveredDate, pendingStart)
      ? hoveredDate
      : null)
  )
}

// ─── Day-of-week header row ──────────────────────────────────────────────────

function DayHeaders({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-7', className)}>
      {DAY_HEADERS.map(label => (
        <div
          key={label}
          className="text-center text-micro-sm font-medium text-muted-foreground py-1.5"
        >
          {label}
        </div>
      ))}
    </div>
  )
}

// ─── MonthGrid (memoized) ────────────────────────────────────────────────────
// Renders the day grid for a single month. Used by both Calendar and
// ScrollableCalendar. React.memo prevents re-render unless range/hover changes.

interface MonthGridProps {
  viewDate: Date
  pendingStart: Date | null
  previewEnd: Date | null
  hasRange: boolean
  onDayClick: (date: Date) => void
  onDayHover: (date: Date | null) => void
  maxDate?: Date | null
}

const MonthGrid = memo(function MonthGrid({
  viewDate,
  pendingStart,
  previewEnd,
  hasRange,
  onDayClick,
  onDayHover,
  maxDate,
}: MonthGridProps) {
  const weeks = buildWeeks(viewDate)

  return (
    <>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day, di) => {
            const inMonth  = isSameMonth(day, viewDate)
            const beyondMax = !!(maxDate && isAfter(day, maxDate))
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
                  showBand && !selected && 'bg-primary/15',
                  showBand && isStart && !isEnd && 'bg-transparent',
                  showBand && isEnd && !isStart && 'bg-transparent',
                  isStart && isEnd && 'bg-transparent',
                )}
              >
                {/* Half-fill pseudo band for start/end */}
                {showBand && isStart && !isEnd && (
                  <div className="absolute inset-y-0 right-0 w-1/2 bg-primary/15" />
                )}
                {showBand && isEnd && !isStart && (
                  <div className="absolute inset-y-0 left-0 w-1/2 bg-primary/15" />
                )}

                <button
                  type="button"
                  disabled={!inMonth || beyondMax}
                  onClick={() => onDayClick(day)}
                  onMouseEnter={() => onDayHover(day)}
                  onMouseLeave={() => onDayHover(null)}
                  className={cn(
                    'relative z-10 w-9 h-9 flex items-center justify-center text-sm rounded-full',
                    'transition-all duration-100',
                    !inMonth && 'opacity-0 pointer-events-none',
                    beyondMax && inMonth && 'opacity-30 cursor-not-allowed',
                    inMonth && !beyondMax && !selected && 'text-foreground',
                    inMonth && !selected && dayToday &&
                      'font-semibold text-primary ring-1 ring-primary/40',
                    inRange && !selected && 'text-foreground',
                    inMonth && !selected && !inRange && 'hover:bg-accent',
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
    </>
  )
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarProps {
  pendingStart: Date | null
  pendingEnd: Date | null
  hoveredDate: Date | null
  onDayClick: (date: Date) => void
  onDayHover: (date: Date | null) => void
  initialViewDate?: Date
  /** Number of months to display (1 = single, 2 = side-by-side). Default 1. */
  numberOfMonths?: number
  /** Disable all dates after this date. */
  maxDate?: Date | null
  className?: string
}

// ─── Calendar (single or dual-month with nav) ───────────────────────────────

export function Calendar({
  pendingStart,
  pendingEnd,
  hoveredDate,
  onDayClick,
  onDayHover,
  initialViewDate,
  numberOfMonths = 1,
  maxDate,
  className,
}: CalendarProps) {
  const [viewDate, setViewDate] = useState(() => initialViewDate ?? new Date())

  const prevMonth = useCallback(() => setViewDate(v => subMonths(v, 1)), [])
  const nextMonth = useCallback(() => setViewDate(v => addMonths(v, 1)), [])

  const previewEnd = computePreviewEnd(pendingStart, pendingEnd, hoveredDate)
  const hasRange = !!(
    pendingStart && previewEnd && !isSameDay(pendingStart, previewEnd)
  )

  const months = useMemo(() => {
    const list: Date[] = []
    for (let i = 0; i < numberOfMonths; i++) {
      list.push(addMonths(viewDate, i))
    }
    return list
  }, [viewDate, numberOfMonths])

  const isDual = numberOfMonths >= 2

  return (
    <div className={cn('select-none w-full', className)}>

      {isDual ? (
        /* ── Dual-month: < Month1 · Month2 > on one row ── */
        <>
          <div className="grid grid-cols-2 gap-x-6 mb-3">
            {/* Left month: < + month name */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="เดือนก่อนหน้า"
                onClick={prevMonth}
                className="w-8 h-8 flex items-center justify-center radius-badge shrink-0
                           text-muted-foreground hover:text-foreground hover:bg-accent
                           transition-colors duration-150"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-body font-semibold text-foreground tracking-tight flex-1 text-center">
                {THAI_MONTHS[months[0].getMonth()]} {months[0].getFullYear() + 543}
              </span>
            </div>
            {/* Right month: month name + > */}
            <div className="flex items-center gap-1">
              <span className="text-body font-semibold text-foreground tracking-tight flex-1 text-center">
                {THAI_MONTHS[months[1].getMonth()]} {months[1].getFullYear() + 543}
              </span>
              <button
                type="button"
                aria-label="เดือนถัดไป"
                onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center radius-badge shrink-0
                           text-muted-foreground hover:text-foreground hover:bg-accent
                           transition-colors duration-150"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6">
            {months.map((m) => (
              <div key={m.getTime()}>
                <DayHeaders className="mb-1" />
                <MonthGrid
                  viewDate={m}
                  pendingStart={pendingStart}
                  previewEnd={previewEnd}
                  hasRange={hasRange}
                  onDayClick={onDayClick}
                  onDayHover={onDayHover}
                  maxDate={maxDate}
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        /* ── Single-month: classic layout ── */
        <>
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

          <DayHeaders className="mb-1" />
          <MonthGrid
            viewDate={viewDate}
            pendingStart={pendingStart}
            previewEnd={previewEnd}
            hasRange={hasRange}
            onDayClick={onDayClick}
            onDayHover={onDayHover}
            maxDate={maxDate}
          />
        </>
      )}
    </div>
  )
}

// ─── ScrollableCalendar (multi-month vertical scroll — used on mobile) ───────

const MONTHS_BEFORE = 1
const MONTHS_AFTER  = 12

export interface ScrollableCalendarProps {
  pendingStart: Date | null
  pendingEnd: Date | null
  hoveredDate: Date | null
  onDayClick: (date: Date) => void
  onDayHover: (date: Date | null) => void
  /** Which month to auto-scroll to on mount */
  initialViewDate?: Date
  className?: string
}

export function ScrollableCalendar({
  pendingStart,
  pendingEnd,
  hoveredDate,
  onDayClick,
  onDayHover,
  initialViewDate,
  className,
}: ScrollableCalendarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const initialMonthRef = useRef<HTMLDivElement>(null)

  const baseDate = initialViewDate ?? new Date()

  // Build month list once based on baseDate
  const months = useMemo(() => {
    const list: Date[] = []
    for (let i = -MONTHS_BEFORE; i <= MONTHS_AFTER; i++) {
      list.push(addMonths(startOfMonth(baseDate), i))
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // stable — baseDate only matters on mount

  // Index of the month to scroll to
  const initialIdx = useMemo(() => {
    const target = startOfMonth(baseDate)
    return months.findIndex(m => isSameMonth(m, target))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-scroll to initial month on mount
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM has painted
    requestAnimationFrame(() => {
      initialMonthRef.current?.scrollIntoView({ block: 'start' })
    })
  }, [])

  const previewEnd = computePreviewEnd(pendingStart, pendingEnd, hoveredDate)
  const hasRange = !!(
    pendingStart && previewEnd && !isSameDay(pendingStart, previewEnd)
  )

  return (
    <div ref={scrollRef} className={cn('select-none w-full', className)}>
      {/* Sticky day-of-week headers */}
      <div className="sticky top-0 z-20 bg-background pb-1">
        <DayHeaders />
      </div>

      {/* Month sections */}
      {months.map((monthDate, idx) => (
        <div
          key={monthDate.getTime()}
          ref={idx === initialIdx ? initialMonthRef : undefined}
        >
          {/* Month title */}
          <div className="text-caption font-semibold text-foreground tracking-tight pt-4 pb-2 pl-1">
            {THAI_MONTHS[monthDate.getMonth()]} {monthDate.getFullYear() + 543}
          </div>

          <MonthGrid
            viewDate={monthDate}
            pendingStart={pendingStart}
            previewEnd={previewEnd}
            hasRange={hasRange}
            onDayClick={onDayClick}
            onDayHover={onDayHover}
          />
        </div>
      ))}
    </div>
  )
}
