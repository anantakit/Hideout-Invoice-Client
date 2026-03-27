import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { cn, THAI_MONTHS_SHORT, todayISO } from '@/shared/utils'
import DatePickerContent from './DatePickerContent'

// ─── Helpers ────────────────────────────────────────────────────────────────

const EN_MONTHS_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
]

function fmtHeaderDate(d: Date): string {
  return `${d.getDate()} ${EN_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface DateNavigationProps {
  visibleStartDate: Date
  mobileSelectedDate?: Date
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onJumpToDate: (date: Date) => void
}

// ─── Shared styles ──────────────────────────────────────────────────────────

const NAV_BTN = 'w-8 h-8 flex items-center justify-center rounded-lg text-tl-text-dim hover:text-tl-text hover:bg-accent transition-colors'

// ─── Component ──────────────────────────────────────────────────────────────

const DateNavigation = React.memo(function DateNavigation({
  visibleStartDate,
  mobileSelectedDate,
  onPrev,
  onNext,
  onToday,
  onJumpToDate,
}: DateNavigationProps) {
  // ── Mobile detection ────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  const displayDate = (isMobile && mobileSelectedDate) ? mobileSelectedDate : visibleStartDate

  // ── Date picker ─────────────────────────────────────────────────────────
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const handleJumpToDate = useCallback(
    (date: Date) => {
      onJumpToDate(date)
      setDatePickerOpen(false)
    },
    [onJumpToDate],
  )

  // ── Month jump options ──────────────────────────────────────────────────
  const monthOptions = useMemo(() => {
    const now = new Date()
    const currentKey = `${now.getFullYear()}-${now.getMonth()}`
    const result: { value: string; label: string; isCurrent: boolean }[] = []
    for (let i = -2; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      result.push({
        value: format(d, 'yyyy-MM-dd'),
        label: `${THAI_MONTHS_SHORT[d.getMonth()]} ${(d.getFullYear() + 543) % 100}`,
        isCurrent: `${d.getFullYear()}-${d.getMonth()}` === currentKey,
      })
    }
    return result
  }, [])

  const handleMonthJump = useCallback(
    (isoDate: string) => {
      const [y, m] = isoDate.split('-').map(Number)
      const target = new Date(y, m - 1, 1)
      onJumpToDate(target)
      setDatePickerOpen(false)
    },
    [onJumpToDate],
  )

  // ── Check if start date is today ────────────────────────────────────────
  const isToday = useMemo(
    () => format(displayDate, 'yyyy-MM-dd') === todayISO(),
    [displayDate],
  )

  return (
    <div className="flex items-center gap-2 md:gap-4 min-w-0">

      {/* Today pill */}
      <button
        type="button"
        onClick={onToday}
        className={cn(
          'shrink-0 h-8 px-3.5 radius-badge text-body font-medium transition-colors',
          'border border-tl-border',
          isToday
            ? 'bg-tl-accent/10 text-tl-accent border-tl-accent/30'
            : 'text-tl-text-dim hover:text-tl-text hover:bg-accent',
        )}
      >
        วันนี้
      </button>

      {/* Date navigation group */}
      <div className="flex items-center">
        <button type="button" onClick={onPrev} className={NAV_BTN} aria-label="Previous">
          <ChevronLeft size={18} />
        </button>

        {isMobile ? (
          <div>
            <button
              type="button"
              onClick={() => setDatePickerOpen(true)}
              className={cn(
                'h-9 px-3 flex items-center gap-2 radius-button transition-colors',
                'hover:bg-accent',
                datePickerOpen && 'bg-accent',
              )}
            >
              <CalendarIcon size={16} className="text-tl-text-dim shrink-0" />
              <span className="text-lg font-semibold text-tl-text tabular-nums whitespace-nowrap">
                {fmtHeaderDate(displayDate)}
              </span>
            </button>
            <Sheet open={datePickerOpen} onOpenChange={(v) => { if (!v) setDatePickerOpen(false) }}>
              <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-0 flex flex-col sheet-mobile">
                <SheetHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
                  <SheetTitle className="text-base font-semibold tracking-tight text-left">
                    เลือกวันที่
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    เลือกวันที่จากปฏิทินเพื่อข้ามไปยังวันนั้น
                  </SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
                  <DatePickerContent
                    displayDate={displayDate}
                    monthOptions={monthOptions}
                    onDayClick={handleJumpToDate}
                    onMonthJump={handleMonthJump}
                    mobile
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        ) : (
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'h-9 px-3 flex items-center gap-2 radius-button transition-colors',
                  'hover:bg-accent',
                  datePickerOpen && 'bg-accent',
                )}
              >
                <CalendarIcon size={16} className="text-tl-text-dim shrink-0" />
                <span className="text-lg font-semibold text-tl-text tabular-nums whitespace-nowrap">
                  {fmtHeaderDate(displayDate)}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
              <DatePickerContent
                displayDate={displayDate}
                monthOptions={monthOptions}
                onDayClick={handleJumpToDate}
                onMonthJump={handleMonthJump}
              />
            </PopoverContent>
          </Popover>
        )}

        <button type="button" onClick={onNext} className={NAV_BTN} aria-label="Next">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
})

export default DateNavigation
