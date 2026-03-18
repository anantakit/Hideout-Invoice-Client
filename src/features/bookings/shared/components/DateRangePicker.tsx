import { useState, useEffect, useMemo } from 'react'
import { isValid, isBefore, isSameDay, differenceInDays } from 'date-fns'
import { CalendarIcon, ArrowRight, Moon } from 'lucide-react'
import { Calendar, ScrollableCalendar } from '../../../../shared/ui/calendar'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../../../shared/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../../shared/ui/dialog'
import { cn, fmtShortBE, fmtLongBE } from '@/shared/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseISO(iso: string): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  return isValid(date) ? date : null
}

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DateRange {
  checkIn: string   // YYYY-MM-DD
  checkOut: string  // YYYY-MM-DD
}

export interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  onOpenCalendar?: () => void
  onMonthChange?: (date: Date) => void
  blockedDates?: Date[]
  highlightedDates?: Date[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DateRangePicker({
  value,
  onChange,
  disabled = false,
  placeholder = 'เลือกวันเข้าพัก',
  className,
  onOpenCalendar,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'selecting-end'>('idle')
  const [selectionStart, setSelectionStart] = useState<Date | null>(null)
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const check = () => setIsMobile(mq.matches)
    check()
    mq.addEventListener('change', check)
    return () => mq.removeEventListener('change', check)
  }, [])

  const handleOpen = () => {
    if (disabled) return
    setOpen(true)
    onOpenCalendar?.()
  }

  const handleClose = () => {
    setOpen(false)
    setPhase('idle')
    setSelectionStart(null)
    setHoveredDate(null)
  }

  const handleDayClick = (day: Date) => {
    if (phase === 'idle') {
      setSelectionStart(day)
      setPhase('selecting-end')
    } else {
      if (!selectionStart) {
        setSelectionStart(day)
        return
      }
      if (isSameDay(day, selectionStart) || isBefore(day, selectionStart)) {
        setSelectionStart(day)
        return
      }
      onChange({ checkIn: toISO(selectionStart), checkOut: toISO(day) })
      handleClose()
    }
  }

  // ── Calendar render props ────────────────────────────────────────────────────

  const parsedCheckIn  = parseISO(value.checkIn)
  const parsedCheckOut = parseISO(value.checkOut)

  const calPendingStart = phase === 'selecting-end' ? selectionStart : parsedCheckIn
  const calPendingEnd   = phase === 'selecting-end' ? null : parsedCheckOut
  const calHoveredDate  = phase === 'selecting-end' ? hoveredDate : null
  const calInitialView  = parsedCheckIn ?? undefined

  // ── Computed values ────────────────────────────────────────────────────────

  const hasRange = Boolean(value.checkIn && value.checkOut)

  const nights = useMemo(() => {
    if (!hasRange || !parsedCheckIn || !parsedCheckOut) return null
    return differenceInDays(parsedCheckOut, parsedCheckIn)
  }, [hasRange, parsedCheckIn, parsedCheckOut])

  // Hover preview nights
  const previewNights = useMemo(() => {
    if (phase !== 'selecting-end' || !selectionStart || !hoveredDate) return null
    if (isBefore(hoveredDate, selectionStart) || isSameDay(hoveredDate, selectionStart)) return null
    return differenceInDays(hoveredDate, selectionStart)
  }, [phase, selectionStart, hoveredDate])

  const phaseLabel = phase === 'selecting-end' ? 'เลือกวันเช็คเอาท์' : 'เลือกวันเช็คอิน'

  // ── Trigger ────────────────────────────────────────────────────────────────

  const triggerEl = (
    <button
      type="button"
      aria-label={placeholder}
      disabled={disabled}
      onClick={() => (open ? handleClose() : handleOpen())}
      className={cn(
        'flex w-full items-center radius-button border border-input bg-background',
        'text-left transition-all duration-150',
        'hover:border-primary/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        open && 'border-primary ring-1 ring-primary/20',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      {hasRange ? (
        // ── Filled state — structured layout ──
        <div className="flex items-center w-full px-3 py-2 gap-2">
          <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-body font-medium text-foreground truncate">
              {fmtShortBE(value.checkIn)}
            </span>
            <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-body font-medium text-foreground truncate">
              {fmtShortBE(value.checkOut)}
            </span>
          </div>
          {nights != null && nights > 0 && (
            <span className="flex items-center gap-1 text-caption text-muted-foreground shrink-0 tabular-nums">
              <Moon className="w-3 h-3" />
              {nights}
            </span>
          )}
        </div>
      ) : (
        // ── Empty state ──
        <div className="flex items-center w-full px-3 h-10 gap-2">
          <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-body text-muted-foreground flex-1">{placeholder}</span>
        </div>
      )}
    </button>
  )

  // ── Phase indicator chip ───────────────────────────────────────────────────

  const phaseChip = (
    <div className="flex items-center gap-2 px-1">
      {/* Check-in */}
      <div className={cn(
        'flex-1 text-center py-1.5 rounded-md transition-colors text-caption',
        phase === 'idle'
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-muted-foreground',
      )}>
        {selectionStart && phase === 'selecting-end'
          ? fmtLongBE(toISO(selectionStart))
          : hasRange ? fmtLongBE(value.checkIn) : 'วันเช็คอิน'
        }
      </div>

      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

      {/* Check-out */}
      <div className={cn(
        'flex-1 text-center py-1.5 rounded-md transition-colors text-caption',
        phase === 'selecting-end'
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-muted-foreground',
      )}>
        {previewNights != null
          ? `${previewNights} คืน`
          : hasRange && phase === 'idle'
            ? fmtLongBE(value.checkOut)
            : 'วันเช็คเอาท์'
        }
      </div>
    </div>
  )

  // ── Mobile: bottom Sheet with scrollable months ────────────────────────────

  if (isMobile) {
    return (
      <div>
        {triggerEl}
        <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
          <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-0 flex flex-col sheet-mobile">
            <SheetHeader className="px-5 pt-4 pb-0 shrink-0">
              <SheetTitle className="text-body font-semibold tracking-tight text-left">
                {phaseLabel}
              </SheetTitle>
              <SheetDescription className="sr-only">
                เลือกช่วงวันเข้าพักจากปฏิทิน
              </SheetDescription>
            </SheetHeader>

            {/* Phase indicator */}
            <div className="px-5 pt-2 pb-3 border-b border-border shrink-0">
              {phaseChip}
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-8">
              <ScrollableCalendar
                pendingStart={calPendingStart}
                pendingEnd={calPendingEnd}
                hoveredDate={calHoveredDate}
                onDayClick={handleDayClick}
                onDayHover={setHoveredDate}
                initialViewDate={calInitialView}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  // ── Desktop: centered Dialog with dual-month calendar ──────────────────────

  return (
    <div>
      {triggerEl}
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <DialogContent
          className="max-w-fit p-0 gap-0"
          aria-describedby="date-range-dialog-desc"
        >
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-body font-semibold tracking-tight">
              {phaseLabel}
            </DialogTitle>
            <DialogDescription id="date-range-dialog-desc" className="sr-only">
              เลือกช่วงวันเข้าพักจากปฏิทิน
            </DialogDescription>
          </DialogHeader>

          {/* Phase indicator */}
          <div className="px-6 pt-2 pb-3 border-b border-border-soft">
            {phaseChip}
          </div>

          {/* Dual-month calendar */}
          <div className="px-6 pt-4 pb-5">
            <Calendar
              pendingStart={calPendingStart}
              pendingEnd={calPendingEnd}
              hoveredDate={calHoveredDate}
              onDayClick={handleDayClick}
              onDayHover={setHoveredDate}
              initialViewDate={calInitialView}
              numberOfMonths={2}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
