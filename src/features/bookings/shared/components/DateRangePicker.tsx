import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { isValid, isBefore, isSameDay, differenceInDays } from 'date-fns'
import { CalendarIcon, ArrowRight, Moon } from 'lucide-react'
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

function formatThaiLong(iso: string): string {
  const d = parseISO(iso)
  if (!d) return ''
  const MONTHS_LONG = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ]
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear() + 543}`
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
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 0, openUp: false })

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const check = () => setIsMobile(mq.matches)
    check()
    mq.addEventListener('change', check)
    return () => mq.removeEventListener('change', check)
  }, [])

  // Position the desktop calendar panel via portal
  const PANEL_H = 400
  useLayoutEffect(() => {
    if (!open || isMobile || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const openUp = spaceBelow < PANEL_H && rect.top > spaceBelow
    setPanelPos({
      top: openUp ? rect.top - 8 : rect.bottom + 8,
      left: rect.left,
      width: Math.max(rect.width, 320),
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
      ref={triggerRef}
      type="button"
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
              {formatThai(value.checkIn)}
            </span>
            <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-body font-medium text-foreground truncate">
              {formatThai(value.checkOut)}
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
          ? formatThaiLong(toISO(selectionStart))
          : hasRange ? formatThaiLong(value.checkIn) : 'วันเช็คอิน'
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
            ? formatThaiLong(value.checkOut)
            : 'วันเช็คเอาท์'
        }
      </div>
    </div>
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

            <div className="flex-1 overflow-y-auto px-5 pt-4 pb-8">
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
            className={cn(
              'fixed z-[9999] bg-card border border-border radius-card shadow-popover',
              'animate-in fade-in-0 zoom-in-[0.98] duration-150',
            )}
            style={{
              left: panelPos.left,
              width: panelPos.width,
              ...(panelPos.openUp
                ? { bottom: window.innerHeight - panelPos.top }
                : { top: panelPos.top }),
            }}
          >
            {/* Phase indicator */}
            <div className="px-4 pt-3 pb-2 border-b border-border-soft">
              {phaseChip}
            </div>

            {/* Calendar */}
            <div className="p-4">
              {calendarEl}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
