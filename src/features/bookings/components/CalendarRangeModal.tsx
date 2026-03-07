/**
 * CalendarRangeModal
 *
 * Reusable check-in / check-out date picker with availability visualisation.
 *
 * Mobile  → fullscreen bottom Sheet (slides up from bottom)
 * Desktop → centred Dialog (zoom-in modal)
 *
 * Architecture is built around a ViewType registry so future views
 * (week, heatmap, timeline) can be plugged in without touching this file.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  format,
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  addMonths, subMonths,
  isSameDay, isSameMonth,
  isAfter, isBefore,
  isToday, isValid,
} from 'date-fns'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/shared/utils'
import { Button } from '../../../shared/ui/button'
import { Dialog, DialogPortal, DialogOverlay } from '../../../shared/ui/dialog'
import { Sheet, SheetPortal, SheetOverlay } from '../../../shared/ui/sheet'
import type { DateRange } from './DateRangePicker'

// ─── Public types ─────────────────────────────────────────────────────────────

export type AvailabilityStatus = 'available' | 'limited' | 'full'

/** Map of ISO dates to their availability status.
 *  Dates absent from the map are treated as 'available'. */
export type AvailabilityMap = Record<string, AvailabilityStatus>

/**
 * Supported calendar view types.
 * Only 'month' is currently implemented — extend VIEW_REGISTRY to add more.
 */
export type ViewType = 'month' | 'week' | 'heatmap' | 'timeline'

/**
 * Props contract every calendar view component must satisfy.
 * Implement this interface to build a WeekView, HeatmapView, TimelineView, etc.
 */
export interface CalendarViewProps {
  /** The month currently shown in the grid. */
  month: Date
  /** The externally-controlled selected date range. */
  selectedRange: DateRange
  /** First click anchored; awaiting second click (null when idle). */
  selectionStart: Date | null
  /** Live cursor position — drives range preview highlight. */
  hoveredDate: Date | null
  availabilityMap: AvailabilityMap
  onDayClick: (day: Date) => void
  onDayHover: (day: Date | null) => void
  onMonthChange: (month: Date) => void
}

export interface CalendarRangeModalProps {
  open: boolean
  onClose: () => void
  /** Passed through to let the caller know which room type is being browsed. */
  roomTypeId: string
  selectedRange: DateRange
  onSelectRange: (range: DateRange) => void
  month: Date
  onMonthChange: (month: Date) => void
  availabilityMap: AvailabilityMap
}

// ─── View registry ────────────────────────────────────────────────────────────

/**
 * Register a view component by adding it to this object.
 *
 * Steps to add a new view:
 *   1. Create a component that implements `CalendarViewProps`.
 *   2. Import it and add it here, e.g. `week: WeekView`.
 *   3. Add its label to VIEW_LABELS below.
 *   4. Expose a view-switcher UI in CalendarRangeContent when needed.
 */
const VIEW_REGISTRY: Partial<Record<ViewType, React.ComponentType<CalendarViewProps>>> = {
  month: MonthGridView,
  // week:     WeekView,      // future
  // heatmap:  HeatmapView,   // future
  // timeline: TimelineView,  // future
}

// ─── Thai locale constants ────────────────────────────────────────────────────

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

const DAY_HEADERS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseISO(iso: string): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  return isValid(date) ? date : null
}

function formatShort(iso: string): string {
  const d = parseISO(iso)
  if (!d) return ''
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`
}

function buildWeeks(viewDate: Date): Date[][] {
  const monthStart = startOfMonth(viewDate)
  const monthEnd   = endOfMonth(viewDate)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd    = endOfWeek(monthEnd,     { weekStartsOn: 1 })
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

// ─── DayCell ──────────────────────────────────────────────────────────────────

interface DayCellProps {
  day: Date
  inMonth: boolean
  availability: AvailabilityStatus | undefined
  isStart: boolean
  isEnd: boolean
  /** Day sits between start and end (exclusive). */
  inBand: boolean
  dayToday: boolean
  onDayClick: (day: Date) => void
  onDayHover: (day: Date | null) => void
}

function DayCell({
  day,
  inMonth,
  availability,
  isStart,
  isEnd,
  inBand,
  dayToday,
  onDayClick,
  onDayHover,
}: DayCellProps) {
  const isFull    = inMonth && availability === 'full'
  const isLimited = inMonth && availability === 'limited'
  const selected  = isStart || isEnd
  const disabled  = !inMonth || isFull

  // Range band: the coloured strip that fills the cell horizontally.
  // Start cell fills only the right half; end cell fills only the left half;
  // middle cells fill full width — creates a continuous pill appearance.
  const showBand  = inBand || (selected && (isStart || isEnd))
  const bandFull  = inBand && !isStart && !isEnd
  const bandRight = isStart && !isEnd    // start: band goes right
  const bandLeft  = isEnd   && !isStart  // end:   band goes left

  return (
    // This div IS the grid cell — do not add an extra wrapper in MonthGridView.
    <div className="relative h-12 flex items-center justify-center">

      {/* ── Range band (behind the circle) ─────────────────────────────── */}
      {showBand && (
        <div
          aria-hidden
          className={cn(
            'absolute top-1 bottom-1 bg-primary/10',
            bandFull  && 'inset-x-0',
            bandRight && 'left-1/2 right-0',
            bandLeft  && 'left-0 right-1/2',
            selected  && !inBand && 'hidden', // single selected day: no band
          )}
        />
      )}

      {/* ── Full-cell click target ──────────────────────────────────────── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onDayClick(day)}
        onMouseEnter={() => onDayHover(day)}
        onMouseLeave={() => onDayHover(null)}
        aria-label={format(day, 'd MMMM yyyy')}
        aria-pressed={selected}
        className="absolute inset-0 flex items-center justify-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        {/* Visual circle */}
        <span
          className={cn(
            'w-10 h-10 radius-badge flex items-center justify-center text-sm select-none relative z-10 transition-colors',
            // Out-of-month
            !inMonth && 'opacity-30 text-muted-foreground',
            // Full: dimmed + line-through
            isFull && 'opacity-40 text-muted-foreground',
            // Normal available in-month
            inMonth && !selected && !isFull && 'text-foreground',
            // Today ring (only when not selected)
            inMonth && !selected && !isFull && dayToday && 'ring-2 ring-ring ring-offset-1',
            // Hover (only available + not selected)
            inMonth && !selected && !isFull && 'group-hover:bg-muted',
            // Selected
            selected && 'date-selected shadow-card',
          )}
        >
          <span className={cn(isFull && 'line-through')}>
            {format(day, 'd')}
          </span>
        </span>
      </button>

      {/* ── Availability dot ────────────────────────────────────────────── */}
      {/* Only 'limited' gets a dot. 'available' = no dot. 'full' = dimmed cell. */}
      {inMonth && isLimited && (
        <span
          aria-hidden
          className={cn(
            'absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400 z-20 pointer-events-none',
            selected && 'opacity-0',  // hide when day is selected
          )}
        />
      )}
    </div>
  )
}

// ─── MonthGridView ────────────────────────────────────────────────────────────

/**
 * Standard month-grid view.
 * Supports swipe gestures on mobile for month navigation.
 */
function MonthGridView({
  month,
  selectedRange,
  selectionStart,
  hoveredDate,
  availabilityMap,
  onDayClick,
  onDayHover,
  onMonthChange,
}: CalendarViewProps) {
  const weeks = buildWeeks(month)

  const parsedCheckIn  = parseISO(selectedRange.checkIn)
  const parsedCheckOut = parseISO(selectedRange.checkOut)

  // Active range for highlighting:
  // — while selecting: from selectionStart to hovered day
  // — otherwise: from the confirmed checkIn to checkOut
  const activeStart = selectionStart ?? parsedCheckIn
  const activeEnd   = selectionStart
    ? (hoveredDate && isAfter(hoveredDate, selectionStart) ? hoveredDate : null)
    : parsedCheckOut

  const hasActiveRange = !!(activeStart && activeEnd && !isSameDay(activeStart, activeEnd))

  // ── Swipe gesture (horizontal swipe → prev/next month) ─────────────────────
  const touchStartX = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta > 50)       onMonthChange(subMonths(month, 1))
    else if (delta < -50) onMonthChange(addMonths(month, 1))
  }

  return (
    <div
      className="select-none w-full touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((label) => (
          <div key={label} className="text-center text-xs font-medium text-muted-foreground py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day, di) => {
            const inMonth  = isSameMonth(day, month)
            const isoStr   = toISO(day)
            const avail    = inMonth ? (availabilityMap[isoStr] ?? 'available') : undefined
            const isStart  = activeStart ? isSameDay(day, activeStart)  : false
            const isEnd    = activeEnd   ? isSameDay(day, activeEnd)    : false
            const inBand   = hasActiveRange
              && isAfter(day, activeStart!)
              && isBefore(day, activeEnd!)
            const dayToday = isToday(day)

            return (
              <DayCell
                key={di}
                day={day}
                inMonth={inMonth}
                availability={avail}
                isStart={isStart}
                isEnd={isEnd}
                inBand={inBand}
                dayToday={dayToday}
                onDayClick={onDayClick}
                onDayHover={onDayHover}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── ModalHeader ──────────────────────────────────────────────────────────────

function ModalHeader({
  month,
  onMonthChange,
}: {
  month: Date
  onMonthChange: (m: Date) => void
}) {
  return (
    <div className="flex items-center gap-1 px-3 py-3 border-b border-border shrink-0">
      <button
        type="button"
        onClick={() => onMonthChange(subMonths(month, 1))}
        className="p-2 radius-badge hover:bg-muted transition-colors"
        aria-label="เดือนก่อนหน้า"
      >
        <ChevronLeft className="w-4 h-4 text-muted-foreground" />
      </button>

      <span className="flex-1 text-center text-sm font-semibold text-foreground">
        {THAI_MONTHS[month.getMonth()]} {month.getFullYear() + 543}
      </span>

      <button
        type="button"
        onClick={() => onMonthChange(addMonths(month, 1))}
        className="p-2 radius-badge hover:bg-muted transition-colors"
        aria-label="เดือนถัดไป"
      >
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Radix close — fires onOpenChange(false) in both Sheet and Dialog contexts */}
      <DialogPrimitive.Close asChild>
        <button
          type="button"
          className="p-2 radius-badge hover:bg-muted transition-colors ml-1"
          aria-label="ปิด"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </DialogPrimitive.Close>
    </div>
  )
}

// ─── ModalLegend ──────────────────────────────────────────────────────────────

function ModalLegend() {
  return (
    <div className="flex items-center justify-center gap-5 px-5 py-3 border-t border-border shrink-0">
      <LegendItem color="bg-emerald-400" label="ว่าง" />
      <LegendItem color="bg-amber-400"   label="เหลือน้อย" />
      <LegendItem color="bg-muted-foreground/30" label="เต็ม" muted />
    </div>
  )
}

function LegendItem({
  color,
  label,
  muted,
}: {
  color: string
  label: string
  muted?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('w-2 h-2 rounded-full shrink-0', color)} />
      <span className={cn('text-xs', muted ? 'text-muted-foreground/60 line-through' : 'text-muted-foreground')}>
        {label}
      </span>
    </div>
  )
}

// ─── ModalFooter ──────────────────────────────────────────────────────────────

function ModalFooter({
  selectedRange,
  selectionStart,
  onClear,
  onConfirm,
}: {
  selectedRange: DateRange
  selectionStart: Date | null
  onClear: () => void
  onConfirm: () => void
}) {
  const hasCheckIn = Boolean(selectedRange.checkIn)
  const hasRange   = hasCheckIn && Boolean(selectedRange.checkOut)
  const isMidSelect = Boolean(selectionStart)

  let hint: string
  if (isMidSelect)        hint = 'คลิกเพื่อเลือกวันเช็คเอาท์'
  else if (hasRange)      hint = `${formatShort(selectedRange.checkIn)} → ${formatShort(selectedRange.checkOut)}`
  else                    hint = 'คลิกเพื่อเลือกวันเช็คอิน'

  return (
    <div className="flex items-center gap-3 px-4 py-4 border-t border-border shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <p className="flex-1 text-helper truncate">{hint}</p>
      <div className="flex items-center gap-2 shrink-0">
        {(hasCheckIn || isMidSelect) && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            ล้าง
          </Button>
        )}
        <Button type="button" size="sm" disabled={!hasRange} onClick={onConfirm}>
          ยืนยัน
        </Button>
      </div>
    </div>
  )
}

// ─── CalendarRangeContent ─────────────────────────────────────────────────────

/**
 * The inner content tree: header + view + legend + footer.
 * Placed inside either the mobile Sheet or desktop Dialog shell.
 */
function CalendarRangeContent({
  month,
  selectedRange,
  selectionStart,
  hoveredDate,
  availabilityMap,
  activeView,
  onDayClick,
  onDayHover,
  onMonthChange,
  onClear,
  onConfirm,
}: {
  month: Date
  selectedRange: DateRange
  selectionStart: Date | null
  hoveredDate: Date | null
  availabilityMap: AvailabilityMap
  activeView: ViewType
  onDayClick: (day: Date) => void
  onDayHover: (day: Date | null) => void
  onMonthChange: (month: Date) => void
  onClear: () => void
  onConfirm: () => void
}) {
  // Visually-hidden title for screen-reader accessibility (Radix requires it).
  const ViewComponent = VIEW_REGISTRY[activeView] ?? MonthGridView

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Accessible title — hidden visually, required by Radix */}
      <DialogPrimitive.Title className="sr-only">
        เลือกช่วงวันที่พัก
      </DialogPrimitive.Title>

      <ModalHeader month={month} onMonthChange={onMonthChange} />

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <ViewComponent
          month={month}
          selectedRange={selectedRange}
          selectionStart={selectionStart}
          hoveredDate={hoveredDate}
          availabilityMap={availabilityMap}
          onDayClick={onDayClick}
          onDayHover={onDayHover}
          onMonthChange={onMonthChange}
        />
      </div>

      <ModalLegend />

      <ModalFooter
        selectedRange={selectedRange}
        selectionStart={selectionStart}
        onClear={onClear}
        onConfirm={onConfirm}
      />
    </div>
  )
}

// ─── CalendarRangeModal ───────────────────────────────────────────────────────

export function CalendarRangeModal({
  open,
  onClose,
  selectedRange,
  onSelectRange,
  month,
  onMonthChange,
  availabilityMap,
}: CalendarRangeModalProps) {
  // ── Selection phase state ──────────────────────────────────────────────────
  // 'idle'          → waiting for the first click  (checkIn)
  // 'selecting-end' → first click done, waiting for second click (checkOut)
  const [phase, setPhase]               = useState<'idle' | 'selecting-end'>('idle')
  const [selectionStart, setStart]      = useState<Date | null>(null)
  const [hoveredDate, setHoveredDate]   = useState<Date | null>(null)

  // Active view — 'month' only for now, extensible via VIEW_REGISTRY.
  const [activeView] = useState<ViewType>('month')

  // ── Responsive breakpoint ─────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const check = () => setIsMobile(mq.matches)
    check()
    mq.addEventListener('change', check)
    return () => mq.removeEventListener('change', check)
  }, [])

  // ── Reset on close ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setPhase('idle')
      setStart(null)
      setHoveredDate(null)
    }
  }, [open])

  // ── Day click handler ─────────────────────────────────────────────────────
  const handleDayClick = useCallback(
    (day: Date) => {
      // Full dates are non-clickable (handled by DayCell's disabled state,
      // but guard here too for keyboard / programmatic calls).
      const avail = availabilityMap[toISO(day)]
      if (avail === 'full') return

      if (phase === 'idle') {
        // First click: anchor check-in and propagate partial range.
        setStart(day)
        setPhase('selecting-end')
        onSelectRange({ checkIn: toISO(day), checkOut: '' })
      } else {
        if (!selectionStart) return

        if (isSameDay(day, selectionStart) || isBefore(day, selectionStart)) {
          // Clicked same day or before start → restart from this day.
          setStart(day)
          onSelectRange({ checkIn: toISO(day), checkOut: '' })
          return
        }

        // Valid second click → complete the range.
        onSelectRange({ checkIn: toISO(selectionStart), checkOut: toISO(day) })
        setStart(null)
        setPhase('idle')
      }
    },
    [phase, selectionStart, availabilityMap, onSelectRange],
  )

  const handleClear = useCallback(() => {
    onSelectRange({ checkIn: '', checkOut: '' })
    setPhase('idle')
    setStart(null)
    setHoveredDate(null)
  }, [onSelectRange])

  const handleConfirm = useCallback(() => {
    onClose()
  }, [onClose])

  // ── Shared content props ──────────────────────────────────────────────────
  const contentProps = {
    month,
    selectedRange,
    selectionStart,
    hoveredDate,
    availabilityMap,
    activeView,
    onDayClick: handleDayClick,
    onDayHover: setHoveredDate,
    onMonthChange,
    onClear: handleClear,
    onConfirm: handleConfirm,
  }

  const onOpenChange = (v: boolean) => { if (!v) onClose() }

  // ─────────────────────────────────────────────────────────────────────────
  // Mobile: fullscreen bottom Sheet (slides up from bottom, rounded top)
  // Uses SheetPortal + SheetOverlay + raw DialogPrimitive.Content to avoid
  // the built-in duplicate close button from SheetContent.
  // ─────────────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetPortal>
          <SheetOverlay />
          <DialogPrimitive.Content
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 flex flex-col bg-card shadow-xl rounded-t-2xl',
              'h-screen max-h-screen',
              'focus:outline-none',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
              'data-[state=open]:duration-300 data-[state=closed]:duration-200',
            )}
          >
            <CalendarRangeContent {...contentProps} />
          </DialogPrimitive.Content>
        </SheetPortal>
      </Sheet>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Desktop: centred Dialog (zoom + fade animation)
  // Uses DialogPortal + DialogOverlay + raw DialogPrimitive.Content to avoid
  // the built-in duplicate close button from DialogContent.
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-sm flex flex-col bg-card shadow-xl rounded-2xl overflow-hidden',
            'max-h-[90vh]',
            'focus:outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          )}
        >
          <CalendarRangeContent {...contentProps} />
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
