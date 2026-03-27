import React, { useCallback } from 'react'
import { Calendar } from '@/shared/ui/calendar'
import { cn } from '@/shared/utils'

const noop = () => {}

// ─── Props ──────────────────────────────────────────────────────────────────

interface DatePickerContentProps {
  displayDate: Date
  monthOptions: { label: string; value: string; isCurrent: boolean }[]
  onDayClick: (date: Date) => void
  onMonthJump: (value: string) => void
  mobile?: boolean
}

// ─── Component ──────────────────────────────────────────────────────────────

function DatePickerContent({
  displayDate,
  monthOptions,
  onDayClick,
  onMonthJump,
  mobile,
}: DatePickerContentProps) {
  const labelCls = mobile
    ? 'text-caption text-muted-foreground mb-2 uppercase tracking-wider'
    : 'text-caption text-tl-text-dim mb-1.5 uppercase tracking-wider'
  const separatorCls = mobile ? 'mt-4 pt-3 border-t border-border' : 'border-t border-tl-border px-3 pb-2.5 pt-2'

  const handleMonthClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const value = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-month]')?.dataset.month
    if (value) onMonthJump(value)
  }, [onMonthJump])

  return (
    <>
      <div className={mobile ? undefined : 'p-3 w-72'}>
        <Calendar
          pendingStart={displayDate}
          pendingEnd={null}
          hoveredDate={null}
          onDayClick={onDayClick}
          onDayHover={noop}
          initialViewDate={displayDate}
        />
      </div>
      <div className={separatorCls}>
        <p className={labelCls}>ข้ามไปเดือน</p>
        <div className={mobile ? 'grid grid-cols-3 gap-1.5' : 'grid grid-cols-3 gap-1'} onClick={handleMonthClick}>
          {monthOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              data-month={opt.value}
              className={cn(
                'text-caption rounded-lg transition-colors text-center',
                mobile
                  ? 'px-2 py-2.5 touch-target hover:bg-accent'
                  : 'px-1.5 py-1.5 hover:bg-accent',
                opt.isCurrent
                  ? mobile
                    ? 'bg-primary/15 text-primary font-semibold'
                    : 'bg-tl-accent/15 text-tl-accent font-semibold'
                  : mobile
                    ? 'text-muted-foreground hover:text-foreground'
                    : 'text-tl-text-dim hover:text-tl-text',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

export default DatePickerContent
