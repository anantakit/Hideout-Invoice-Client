import { useState, useCallback, useRef, useLayoutEffect, useEffect, useMemo } from 'react'
import { addDays, subDays, startOfDay, format } from 'date-fns'
import { TIMELINE_ROOM_COL_PX, getCellWidthPx } from './tokens'

// ─── Constants ─────────────────────────────────────────────────────────────────

/** Days rendered on each side beyond the visible viewport. */
const BUFFER_DAYS = 14

/** Total days rendered in the sliding buffer. */
const TOTAL_DAYS = 42

/** Trigger buffer shift when scroll is within this many days of the edge. */
const THRESHOLD_DAYS = 5

/** How many days to shift the buffer when extending. */
const SHIFT_DAYS = 7

// ─── Hook ──────────────────────────────────────────────────────────────────────

interface UseInfiniteTimelineOptions {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  /** Set to true when the scroll container is mounted in the DOM. */
  ready?: boolean
}

export function useInfiniteTimeline({
  scrollContainerRef,
  ready = true,
}: UseInfiniteTimelineOptions) {
  // bufferStart: first date rendered in the DOM
  const [bufferStart, setBufferStart] = useState<Date>(() =>
    subDays(startOfDay(new Date()), BUFFER_DAYS),
  )

  const bufferEnd = useMemo(() => addDays(bufferStart, TOTAL_DAYS), [bufferStart])
  const fromStr   = useMemo(() => format(bufferStart, 'yyyy-MM-dd'), [bufferStart])
  const toStr     = useMemo(() => format(bufferEnd, 'yyyy-MM-dd'), [bufferEnd])

  const days = useMemo(
    () => Array.from({ length: TOTAL_DAYS }, (_, i) => addDays(bufferStart, i)),
    [bufferStart],
  )

  // ── Visible range tracking (for toolbar display) ────────────────────────
  const [visibleStartDate, setVisibleStartDate] = useState<Date>(startOfDay(new Date()))
  const [visibleDays, setVisibleDays] = useState(7)
  const lastVisibleDayOffset = useRef(-1)

  // ── Scroll position correction ──────────────────────────────────────────
  const jumpScrollTarget = useRef<number | null>(null)
  const pendingCorrection = useRef(0)
  const needsInitialScroll = useRef(true)

  // Apply scroll corrections after DOM commits.
  // `ready` signals that timeline content (not just the skeleton) is in the DOM,
  // so scrollLeft won't be clamped to 0 by the browser.
  useLayoutEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return

    const cellW = getCellWidthPx()

    // Wait until content is ready before initial scroll — the skeleton
    // doesn't have enough scroll width, so setting scrollLeft during
    // loading would be clamped to 0 by the browser.
    if (needsInitialScroll.current) {
      if (!ready) return            // content not mounted yet, wait
      needsInitialScroll.current = false
      el.scrollLeft = BUFFER_DAYS * cellW
      return
    }

    if (jumpScrollTarget.current !== null) {
      el.scrollLeft = jumpScrollTarget.current
      jumpScrollTarget.current = null
      pendingCorrection.current = 0
      return
    }

    if (pendingCorrection.current !== 0) {
      el.scrollLeft += pendingCorrection.current
      pendingCorrection.current = 0
    }
  }, [bufferStart, ready])

  // ── Scroll listener ─────────────────────────────────────────────────────
  const isShiftingRef = useRef(false)

  const bufferStartRef = useRef(bufferStart)
  bufferStartRef.current = bufferStart

  const handleScroll = useCallback(() => {
    if (isShiftingRef.current) return
    const el = scrollContainerRef.current
    if (!el) return

    const cellW = getCellWidthPx()
    const scrollLeft = el.scrollLeft
    const viewportWidth = el.clientWidth
    const totalWidth = TOTAL_DAYS * cellW

    // Update visible range for toolbar display (throttled by day change)
    const dayOffset = Math.round(scrollLeft / cellW)
    if (dayOffset !== lastVisibleDayOffset.current) {
      lastVisibleDayOffset.current = dayOffset
      setVisibleStartDate(addDays(bufferStartRef.current, dayOffset))
      const vpDays = Math.ceil((viewportWidth - TIMELINE_ROOM_COL_PX) / cellW)
      setVisibleDays(vpDays)
    }

    // Check if we need to extend the buffer
    const rightRemaining = totalWidth - scrollLeft - viewportWidth + TIMELINE_ROOM_COL_PX
    const leftRemaining = scrollLeft
    const thresholdPx = THRESHOLD_DAYS * cellW

    if (rightRemaining < thresholdPx) {
      isShiftingRef.current = true
      pendingCorrection.current = -(SHIFT_DAYS * cellW)
      setBufferStart(prev => addDays(prev, SHIFT_DAYS))
      requestAnimationFrame(() => { isShiftingRef.current = false })
    } else if (leftRemaining < thresholdPx) {
      isShiftingRef.current = true
      pendingCorrection.current = SHIFT_DAYS * cellW
      setBufferStart(prev => subDays(prev, SHIFT_DAYS))
      requestAnimationFrame(() => { isShiftingRef.current = false })
    }
  }, [])

  // Re-attach scroll listener whenever `ready` changes (element mounts/unmounts)
  const scrollHandlerRef = useRef(handleScroll)
  scrollHandlerRef.current = handleScroll

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const handler = () => scrollHandlerRef.current()
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [ready])

  // ── Navigation ──────────────────────────────────────────────────────────

  const jumpToDate = useCallback((date: Date) => {
    const cellW = getCellWidthPx()
    const targetStart = subDays(startOfDay(date), BUFFER_DAYS)
    jumpScrollTarget.current = BUFFER_DAYS * cellW
    setBufferStart(targetStart)
  }, [])

  const jumpToToday = useCallback(() => jumpToDate(new Date()), [jumpToDate])

  const shiftBy = useCallback((numDays: number) => {
    const el = scrollContainerRef.current
    if (!el) return
    const cellW = getCellWidthPx()
    el.scrollBy({ left: numDays * cellW, behavior: 'smooth' })
  }, [])

  const visibleCenterDate = useMemo(
    () => addDays(visibleStartDate, Math.floor(visibleDays / 2)),
    [visibleStartDate, visibleDays],
  )

  return {
    bufferStart,
    bufferEnd,
    totalDays: TOTAL_DAYS,
    days,
    fromStr,
    toStr,
    visibleStartDate,
    visibleDays,
    visibleCenterDate,
    jumpToDate,
    jumpToToday,
    shiftBy,
  }
}
