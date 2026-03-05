import { useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDays, subDays, format, startOfDay } from 'date-fns'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useTimeline } from '../hooks'
import type { TimelineBooking } from '../types'
import TimelineHeader from '../components/timeline/TimelineHeader'
import RoomRow from '../components/timeline/RoomRow'
import BookingBottomSheet from '../components/timeline/BookingBottomSheet'
import {
  TIMELINE_ROW_HEIGHT_PX,
  TIMELINE_WINDOW_DAYS,
  TIMELINE_OVERSCAN_ROWS,
} from '../components/timeline/tokens'
import { ROUTES } from '@/app/routes'

/**
 * MobileTimelinePage — 7-Day Rolling Timeline View.
 *
 * Architecture overview:
 *
 *  ┌─ TimelinePage (windowStart state, react-query, virtualizer) ────────┐
 *  │  ┌─ Navigation bar (prev/next 7-day shift) ──────────────────────┐  │
 *  │  │  [← Prev]   Mar 1 – Mar 7, 2026   [Next →]                   │  │
 *  │  └───────────────────────────────────────────────────────────────┘  │
 *  │  ┌─ Scroll container (overflow: auto) ───────────────────────────┐  │
 *  │  │  ┌─ TimelineHeader (sticky top, z-30) ─────────────────────┐  │  │
 *  │  │  │  [room col]  [Mon 1][Tue 2][Wed 3]…[Sun 7]              │  │  │
 *  │  │  └─────────────────────────────────────────────────────────┘  │  │
 *  │  │  ┌─ Virtualized body (react-virtual) ──────────────────────┐  │  │
 *  │  │  │  ┌─ RoomRow (per virtual item) ───────────────────────┐  │  │  │
 *  │  │  │  │  [sticky room col] [BookingBlock][BookingBlock]…   │  │  │  │
 *  │  │  │  └───────────────────────────────────────────────────┘  │  │  │
 *  │  │  └─────────────────────────────────────────────────────────┘  │  │
 *  │  └───────────────────────────────────────────────────────────────┘  │
 *  │  ┌─ BookingBottomSheet (portal, slide-up on tap) ────────────────┐  │
 *  │  └───────────────────────────────────────────────────────────────┘  │
 *  └─────────────────────────────────────────────────────────────────────┘
 *
 * Performance strategy:
 *
 *  1. Row virtualization via @tanstack/react-virtual — only visible rows
 *     (~10–15 on a typical mobile screen) are in the DOM. Handles 200+
 *     rooms without layout thrash.
 *
 *  2. RoomRow + BookingBlock are React.memo — re-renders are skipped
 *     unless their specific room/booking data changes. The TanStack Query
 *     cache object identity is preserved when data is unchanged.
 *
 *  3. The `days` array is useMemo-d on windowStart only; it does not
 *     change on query refetch. BookingBlock positions are computed inside
 *     RoomRow (also memoized), not in the parent.
 *
 *  4. Horizontal scroll does NOT trigger a React re-render — CSS handles
 *     the sticky positioning (sticky left-0 for room column, sticky top-0
 *     for header).
 *
 *  5. Window shifts by TIMELINE_WINDOW_DAYS (7) on prev/next — the query
 *     key changes and TanStack Query fetches the new window. Old windows
 *     are kept in cache for instant back-navigation.
 *
 * Scaling to 200 rooms:
 *   - Virtual list renders only ~15 rows regardless of total room count.
 *   - API returns all rooms for the window in a single query (no N+1).
 *   - Increasing room count has zero rendering cost beyond initial fetch size.
 */
export default function TimelinePage() {
  const navigate = useNavigate()

  // ── Window state ─────────────────────────────────────────────────────────
  // Default: today − 3 days so today appears near the center of the 7-day window.
  const [windowStart, setWindowStart] = useState<Date>(() =>
    subDays(startOfDay(new Date()), 3),
  )

  const windowEnd = useMemo(
    () => addDays(windowStart, TIMELINE_WINDOW_DAYS),
    [windowStart],
  )

  // ── Query ─────────────────────────────────────────────────────────────────
  const fromStr = useMemo(() => format(windowStart, 'yyyy-MM-dd'), [windowStart])
  const toStr   = useMemo(() => format(windowEnd,   'yyyy-MM-dd'), [windowEnd])

  const { data, isLoading, isError } = useTimeline(fromStr, toStr)
  const rooms = data?.rooms ?? []
  const unassignedStays = data?.unassigned_stays ?? []

  // ── Day labels (memoized — only changes when windowStart changes) ─────────
  const days = useMemo(
    () => Array.from({ length: TIMELINE_WINDOW_DAYS }, (_, i) => addDays(windowStart, i)),
    [windowStart],
  )

  // ── Selected booking (bottom sheet) ───────────────────────────────────────
  const [selectedBooking, setSelectedBooking] = useState<TimelineBooking | null>(null)

  const handleSelectBooking = useCallback((booking: TimelineBooking) => {
    setSelectedBooking(booking)
  }, [])

  const handleCloseSheet = useCallback(() => {
    setSelectedBooking(null)
  }, [])

  // ── Window navigation ─────────────────────────────────────────────────────
  const handlePrev = useCallback(
    () => setWindowStart((d) => subDays(d, TIMELINE_WINDOW_DAYS)),
    [],
  )
  const handleNext = useCallback(
    () => setWindowStart((d) => addDays(d, TIMELINE_WINDOW_DAYS)),
    [],
  )

  // ── Virtualization ────────────────────────────────────────────────────────
  // The scroll container is the element that virtualizer observes.
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: rooms.length,
    getScrollElement: () => scrollContainerRef.current,
    // Row height from token — matches --timeline-row-height in index.css.
    estimateSize: () => TIMELINE_ROW_HEIGHT_PX,
    overscan: TIMELINE_OVERSCAN_ROWS,
  })

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* ── Navigation bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="icon" onClick={handlePrev} aria-label="Previous week">
          <ChevronLeft size={20} />
        </Button>

        <span className="text-sm font-semibold text-foreground tabular-nums">
          {format(windowStart, 'MMM d')} – {format(subDays(windowEnd, 1), 'MMM d, yyyy')}
        </span>

        <Button variant="ghost" size="icon" onClick={handleNext} aria-label="Next week">
          <ChevronRight size={20} />
        </Button>
      </div>

      {/* ── Loading / error state ────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {isError && (
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-sm text-destructive text-center">
            Failed to load timeline. Please try again.
          </p>
        </div>
      )}

      {/* ── Timeline grid ────────────────────────────────────────────────── */}
      {!isLoading && !isError && (
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto"
        >
          {/*
           * Min-width ensures the full 7-day grid is always wider than the
           * viewport, triggering horizontal scroll. This is not a hardcoded
           * value — it uses CSS custom properties for both room-col and cell.
           */}
          <div
            style={{
              minWidth: 'calc(var(--timeline-room-col-width) + 7 * var(--timeline-cell-width))',
            }}
          >
            {/* Sticky header */}
            <TimelineHeader days={days} />

            {/* Empty state */}
            {rooms.length === 0 && (
              <div className="flex items-center justify-center py-16">
                <p className="text-sm text-muted-foreground">No rooms found.</p>
              </div>
            )}

            {/* Virtualized room rows */}
            {rooms.length > 0 && (
              <div
                style={{
                  height: rowVirtualizer.getTotalSize(),
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const room = rooms[virtualRow.index]
                  return (
                    <div
                      key={room.id}
                      style={{
                        position: 'absolute',
                        top: virtualRow.start,
                        left: 0,
                        right: 0,
                        height: virtualRow.size,
                      }}
                    >
                      <RoomRow
                        room={room}
                        windowStart={windowStart}
                        windowEnd={windowEnd}
                        onSelectBooking={handleSelectBooking}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Pending assignment section ───────────────────────────────────── */}
      {!isLoading && !isError && unassignedStays.length > 0 && (
        <div className="shrink-0 border-t border-border bg-card px-3 py-3 space-y-2 max-h-48 overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Pending Assignment ({unassignedStays.length})
          </p>
          {unassignedStays.map((stay, i) => (
            <button
              key={`${stay.booking_id}-${i}`}
              type="button"
              onClick={() => navigate(ROUTES.bookings.detail(stay.booking_id))}
              className="w-full text-left flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium text-foreground truncate mr-2">{stay.guest_name}</span>
              <span className="text-muted-foreground shrink-0">
                {stay.room_type_name} · {format(new Date(stay.check_in), 'MMM d')}–{format(new Date(stay.check_out), 'MMM d')}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Booking detail sheet ─────────────────────────────────────────── */}
      <BookingBottomSheet booking={selectedBooking} onClose={handleCloseSheet} />
    </div>
  )
}
