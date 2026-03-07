import { useState, useRef, useEffect } from 'react'
import { isValid } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from './calendar'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './sheet'
import { cn } from '@/shared/utils'

// ─── Thai display helpers ─────────────────────────────────────────────────────

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

/** Parse a YYYY-MM-DD string as a local date (no timezone shift). */
function parseISO(iso: string): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  return isValid(date) ? date : null
}

/** Serialise a Date back to YYYY-MM-DD. */
function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Format a YYYY-MM-DD string for display in Thai Buddhist Era. */
function formatThai(iso: string): string {
  const d = parseISO(iso)
  if (!d) return ''
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface DatePickerProps {
  /** Controlled value as YYYY-MM-DD string (empty string = no selection). */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'เลือกวันที่',
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Track mobile breakpoint (md = 768px).
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const check = () => setIsMobile(mq.matches)
    check()
    mq.addEventListener('change', check)
    return () => mq.removeEventListener('change', check)
  }, [])

  // Close desktop panel on outside click.
  useEffect(() => {
    if (!open || isMobile) return
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, isMobile])

  const selectedDate = parseISO(value)

  const handleDayClick = (day: Date) => {
    onChange(toISO(day))
    setOpen(false)
  }

  const triggerEl = (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className={cn(
        'flex h-11 w-full items-center gap-2 radius-button border border-input bg-background px-3 text-sm',
        'text-left transition-colors hover:border-ring/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        open && 'ring-2 ring-ring ring-offset-2',
        !value && 'text-muted-foreground',
        className,
      )}
    >
      <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="flex-1 truncate">
        {value ? formatThai(value) : placeholder}
      </span>
    </button>
  )

  // ── Mobile: bottom Sheet ───────────────────────────────────────────────────

  if (isMobile) {
    return (
      <div>
        {triggerEl}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="rounded-t-xl px-0 pb-0 flex flex-col max-h-[85vh]"
          >
            <SheetHeader className="px-5 pt-5 pb-3 pr-14 border-b border-border shrink-0">
              <SheetTitle className="text-base font-semibold tracking-tight text-left">
                เลือกวันที่
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
              <Calendar
                pendingStart={selectedDate}
                pendingEnd={null}
                hoveredDate={null}
                onDayClick={handleDayClick}
                onDayHover={() => {}}
                initialViewDate={selectedDate ?? undefined}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  // ── Desktop: absolute dropdown ─────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative">
      {triggerEl}
      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-72 bg-card border border-border radius-card shadow-popover p-4">
          <Calendar
            pendingStart={selectedDate}
            pendingEnd={null}
            hoveredDate={null}
            onDayClick={handleDayClick}
            onDayHover={() => {}}
            initialViewDate={selectedDate ?? undefined}
          />
        </div>
      )}
    </div>
  )
}
