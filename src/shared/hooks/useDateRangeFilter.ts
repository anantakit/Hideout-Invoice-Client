import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { calculateDayClick } from '@/shared/domain/dateRange'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toApiDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function fromApiDate(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export { toApiDate, fromApiDate }

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseDateRangeFilterOptions {
  startDate: string
  endDate: string
  onRangeChange: (start: string, end: string) => void
}

export function useDateRangeFilter({ startDate, endDate, onRangeChange }: UseDateRangeFilterOptions) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const isMobile = useIsMobile()
  const [pendingStart, setPendingStart] = useState<Date | null>(null)
  const [pendingEnd,   setPendingEnd]   = useState<Date | null>(null)
  const [hoveredDate,  setHoveredDate]  = useState<Date | null>(null)

  // Close picker when crossing mobile / desktop boundary
  useEffect(() => {
    if (pickerOpen) setPickerOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile])

  // Body scroll lock while mobile sheet is open
  useEffect(() => {
    if (isMobile && pickerOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isMobile, pickerOpen])

  const openPicker = useCallback(() => {
    setPendingStart(fromApiDate(startDate))
    setPendingEnd(fromApiDate(endDate))
    setHoveredDate(null)
    setPickerOpen(true)
  }, [startDate, endDate])

  const handleConfirm = useCallback(() => {
    if (pendingStart) {
      onRangeChange(toApiDate(pendingStart), toApiDate(pendingEnd ?? pendingStart))
    }
    setPickerOpen(false)
  }, [pendingStart, pendingEnd, onRangeChange])

  const handleCancel = useCallback(() => setPickerOpen(false), [])

  const handleDayClick = useCallback((day: Date) => {
    const result = calculateDayClick(pendingStart, pendingEnd, day)
    setPendingStart(result.start)
    setPendingEnd(result.end)
  }, [pendingStart, pendingEnd])

  return {
    pickerOpen,
    setPickerOpen,
    isMobile,
    pendingStart,
    pendingEnd,
    hoveredDate,
    setHoveredDate,
    openPicker,
    handleConfirm,
    handleCancel,
    handleDayClick,
  }
}
