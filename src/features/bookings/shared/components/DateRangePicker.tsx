import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { isValid, isBefore, isSameDay, differenceInDays } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '../../../../shared/ui/calendar'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../../../shared/ui/sheet'
import { cn, THAI_MONTHS_SHORT } from '@/shared/utils'

// ─── Thai display helpers ─────────────────────────────────────────────────────

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

function formatThai(iso: string): string {
  const d = parseISO(iso)
  if (!d) return ''
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${(d.getFullYear() + 543) % 100}`
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
  // Future calendar integration props (wired but not yet implemented)
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
  placeholder = 'วันเช็คอิน → เช็คเอาท์',
  className,
  onOpenCalendar,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'selecting-end'>('idle')
  const [selectionStart, setSelectionStart] = useState<Date | null>(null)
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, openUp: false })

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const check = () => setIsMobile(mq.matches)
    check()
    mq.addEventListener('change', check)
    return () => mq.removeEventListener('change', check)
  }, [])

  // Position the desktop calendar panel via portal
  const PANEL_H = 420 // approximate calendar panel height
  useLayoutEffect(() => {
    if (!open || isMobile || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const openUp = spaceBelow < PANEL_H && rect.top > spaceBelow
    setPanelPos({
      top: openUp ? rect.top - 8 : rect.bottom + 8,
      left: rect.left,
      openUp,
    })
  }, [open, isMobile, phase])

  // Close desktop panel on outside click.
  useEffect(() => {
    if (!open || isMobile) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        panelRef.current && !panelRef.current.contains(target)
      ) {
        handleClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, isMobile])

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
      // First click: anchor the start.
      setSelectionStart(day)
      setPhase('selecting-end')
    } else {
      if (!selectionStart) {
        setSelectionStart(day)
        return
      }
      if (isSameDay(day, selectionStart) || isBefore(day, selectionStart)) {
        // Invalid end: restart from this day.
        setSelectionStart(day)
        return
      }
      // Valid: complete the range.
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

  // ── Trigger label ────────────────────────────────────────────────────────────

  const hasRange = Boolean(value.checkIn && value.checkOut)

  // Compute nights for the hint
  const nights = hasRange && parsedCheckIn && parsedCheckOut
    ? differenceInDays(parsedCheckOut, parsedCheckIn)
    : null

  let displayLabel: string | undefined
  if (phase === 'selecting-end' && selectionStart) {
    displayLabel = `${formatThai(toISO(selectionStart))} → เลือกวันออก…`
  } else if (hasRange) {
    displayLabel = `${formatThai(value.checkIn)} → ${formatThai(value.checkOut)}`
  }

  const triggerEl = (
    <button
      ref={triggerRef}
      type="button"
      disabled={disabled}
      onClick={() => (open ? handleClose() : handleOpen())}
      className={cn(
        'flex h-11 w-full items-center gap-2 radius-button border border-input bg-background px-3 text-body',
        'text-left transition-colors hover:border-ring/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        open && 'ring-2 ring-ring ring-offset-2',
        !displayLabel && 'text-muted-foreground',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="flex-1 truncate">{displayLabel ?? placeholder}</span>
      {phase === 'selecting-end' && (
        <span className="text-xs text-primary font-medium shrink-0">เลือกวันออก</span>
      )}
      {nights != null && nights > 0 && phase === 'idle' && (
        <span className="text-xs text-muted-foreground font-medium shrink-0">
          {nights} คืน
        </span>
      )}
    </button>
  )

  const calendarEl = (
    <Calendar
      pendingStart={calPendingStart}
      pendingEnd={calPendingEnd}
      hoveredDate={calHoveredDate}
      onDayClick={handleDayClick}
      onDayHover={setHoveredDate}
      initialViewDate={calInitialView}
    />
  )

  // ── Mobile: bottom Sheet ─────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <div>
        {triggerEl}
        <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
          <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-0 flex flex-col max-h-[85vh]">
            <SheetHeader className="px-5 pt-5 pb-3 pr-14 border-b border-border shrink-0">
              <SheetTitle className="text-base font-semibold tracking-tight text-left">
                {phase === 'selecting-end' ? 'เลือกวันเช็คเอาท์' : 'เลือกวันเช็คอิน'}
              </SheetTitle>
              <SheetDescription className="sr-only">
                เลือกช่วงวันเข้าพักจากปฏิทิน
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
              {calendarEl}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  // ── Desktop: portal dropdown ─────────────────────────────────────────────────

  return (
    <div ref={containerRef}>
      {triggerEl}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[9999] w-80 bg-card border border-border rounded-2xl shadow-popover p-4"
            style={{
              left: panelPos.left,
              ...(panelPos.openUp
                ? { bottom: window.innerHeight - panelPos.top }
                : { top: panelPos.top }),
            }}
          >
            <p className="text-xs font-medium text-muted-foreground mb-3">
              {phase === 'selecting-end' ? 'เลือกวันเช็คเอาท์' : 'เลือกวันเช็คอิน'}
            </p>
            {calendarEl}
          </div>,
          document.body,
        )}
    </div>
  )
}
