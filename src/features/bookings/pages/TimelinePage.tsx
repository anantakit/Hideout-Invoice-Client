import { useState, useMemo, useCallback, useRef } from 'react'
import { addDays, subDays, format, startOfDay } from 'date-fns'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { useTimeline, useAvailabilityGrouped } from '../hooks'
import type { TimelineBooking } from '../types'
import type { SelectedBookingContext } from '../components/timeline/BookingBottomSheet'
import TimelineHeader from '../components/timeline/TimelineHeader'
import RoomRow from '../components/timeline/RoomRow'
import BookingBottomSheet from '../components/timeline/BookingBottomSheet'
import { AvailabilitySummary } from '../components/timeline/AvailabilitySummary'
import type { RoomAvailability } from '../components/timeline/AvailabilitySummary'
import { PendingAssignmentsPanel } from '../components/timeline/PendingAssignmentsPanel'
import { MobileTimelineList } from '../components/timeline/MobileTimelineList'
import {
  TIMELINE_ROW_HEIGHT_PX,
  TIMELINE_WINDOW_DAYS,
  TIMELINE_OVERSCAN_ROWS,
} from '../components/timeline/tokens'

// ─── Booking color utilities ──────────────────────────────────────────────────

const BOOKING_COLOR_PALETTE: readonly string[] = [
  'bg-primary/20 text-primary',
  'bg-info-muted text-info-muted-foreground',
  'bg-success-muted text-success-muted-foreground',
  'bg-warning-muted text-warning-muted-foreground',
  'bg-secondary text-secondary-foreground',
  'bg-accent text-accent-foreground',
]

function hashBookingId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) & 0x7fff_ffff
  }
  return h
}

function getBookingColorClass(bookingId: string): string {
  return BOOKING_COLOR_PALETTE[hashBookingId(bookingId) % BOOKING_COLOR_PALETTE.length]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  // ── Window state ─────────────────────────────────────────────────────────
  const [windowStart, setWindowStart] = useState<Date>(() =>
    subDays(startOfDay(new Date()), 3),
  )

  // ── Filter state ──────────────────────────────────────────────────────────
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string | null>(null)

  // ── Bottom-sheet state ────────────────────────────────────────────────────
  const [selectedBooking, setSelectedBooking] = useState<SelectedBookingContext | null>(null)

  // ── Hover-highlight state ─────────────────────────────────────────────────
  const [hoveredBookingId, setHoveredBookingId] = useState<string | null>(null)

  // ── Mobile single-day offset (0–6 within window) ──────────────────────────
  const [mobileDayOffset, setMobileDayOffset] = useState(3) // start on "today"

  // ── Derived date strings ──────────────────────────────────────────────────
  const windowEnd = useMemo(
    () => addDays(windowStart, TIMELINE_WINDOW_DAYS),
    [windowStart],
  )

  const fromStr = useMemo(() => format(windowStart, 'yyyy-MM-dd'), [windowStart])
  const toStr   = useMemo(() => format(windowEnd,   'yyyy-MM-dd'), [windowEnd])

  const availTo = useMemo(
    () => format(addDays(windowStart, 1), 'yyyy-MM-dd'),
    [windowStart],
  )

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: timelineData, isLoading, isError } = useTimeline(fromStr, toStr)

  const { data: availData, isLoading: availLoading } =
    useAvailabilityGrouped(fromStr, availTo)

  // ── Derived data ──────────────────────────────────────────────────────────
  const allRooms        = timelineData?.rooms           ?? []
  const unassignedStays = timelineData?.unassigned_stays ?? []
  const availRoomTypes  = availData?.room_types          ?? []

  const roomAvailability = useMemo<RoomAvailability[]>(
    () =>
      availRoomTypes.map((rt) => ({
        room_type_id:    rt.room_type_id,
        room_type_name:  rt.room_type_name,
        total_rooms:     rt.rooms.length,
        available_rooms: rt.rooms.filter((r) => r.available).length,
        occupied_rooms:  rt.rooms.filter((r) => !r.available).length,
      })),
    [availRoomTypes],
  )

  const roomTypeIdByRoomId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const rt of availRoomTypes) {
      for (const r of rt.rooms) map[r.room_id] = rt.room_type_id
    }
    return map
  }, [availRoomTypes])

  /** roomId → room type name for display in room labels. */
  const roomTypeNameByRoomId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const rt of availRoomTypes) {
      for (const r of rt.rooms) map[r.room_id] = rt.room_type_name
    }
    return map
  }, [availRoomTypes])

  const filteredRooms = useMemo(() => {
    if (!selectedRoomTypeId) return allRooms
    return allRooms.filter((r) => roomTypeIdByRoomId[r.id] === selectedRoomTypeId)
  }, [allRooms, selectedRoomTypeId, roomTypeIdByRoomId])

  const bookingRoomCountMap = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {}
    for (const room of allRooms) {
      for (const b of room.bookings) {
        counts[b.booking_id] = (counts[b.booking_id] ?? 0) + 1
      }
    }
    return counts
  }, [allRooms])

  const bookingColorMap = useMemo<Record<string, string>>(() => {
    const colors: Record<string, string> = {}
    for (const room of allRooms) {
      for (const b of room.bookings) {
        if (!colors[b.booking_id]) {
          colors[b.booking_id] = getBookingColorClass(b.booking_id)
        }
      }
    }
    return colors
  }, [allRooms])

  const days = useMemo(
    () => Array.from({ length: TIMELINE_WINDOW_DAYS }, (_, i) => addDays(windowStart, i)),
    [windowStart],
  )

  const mobileSelectedDateStr = useMemo(
    () => format(addDays(windowStart, mobileDayOffset), 'yyyy-MM-dd'),
    [windowStart, mobileDayOffset],
  )

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePrev = useCallback(() => {
    setWindowStart((d) => subDays(d, TIMELINE_WINDOW_DAYS))
    setMobileDayOffset(3)
  }, [])
  const handleNext = useCallback(() => {
    setWindowStart((d) => addDays(d, TIMELINE_WINDOW_DAYS))
    setMobileDayOffset(3)
  }, [])
  const handleToday = useCallback(() => {
    setWindowStart(subDays(startOfDay(new Date()), 3))
    setMobileDayOffset(3)
  }, [])

  const handleRoomTypeSelect     = useCallback((id: string | null) => setSelectedRoomTypeId(id), [])
  const handleSelectBooking      = useCallback((b: TimelineBooking, roomNumbers?: string[]) => {
    // Collect all room numbers for this booking from allRooms if not provided
    const rooms = roomNumbers ?? allRooms
      .filter((r) => r.bookings.some((bk) => bk.booking_id === b.booking_id))
      .map((r) => r.room_number)
    setSelectedBooking({ booking: b, roomNumbers: rooms })
  }, [allRooms])
  const handleCloseSheet         = useCallback(() => setSelectedBooking(null as SelectedBookingContext | null), [])
  const handleBookingHoverStart  = useCallback((id: string) => setHoveredBookingId(id), [])
  const handleBookingHoverEnd    = useCallback(() => setHoveredBookingId(null), [])

  // ── Virtualisation ────────────────────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count:            filteredRooms.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize:     () => TIMELINE_ROW_HEIGHT_PX,
    overscan:         TIMELINE_OVERSCAN_ROWS,
  })

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="flex flex-col h-full overflow-hidden bg-background">

        {/* ── Section 1: Header ─────────────────────────────────────────── */}
        <div className="shrink-0 bg-card border-b border-border px-4 py-2.5">
          <div className="grid grid-cols-3 items-center">
            <h1 className="text-sm font-semibold text-foreground">Timeline</h1>

            <div className="flex justify-center">
              <span className="text-xs font-medium text-foreground tabular-nums">
                {format(windowStart, 'MMM d')}
                {' — '}
                {format(subDays(windowEnd, 1), 'MMM d, yyyy')}
              </span>
            </div>

            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrev}
                className="h-7 w-7"
                aria-label="สัปดาห์ก่อนหน้า"
              >
                <ChevronLeft size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="h-7 w-7"
                aria-label="สัปดาห์ถัดไป"
              >
                <ChevronRight size={14} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="h-6 px-2 text-[11px] ml-1"
              >
                วันนี้
              </Button>
            </div>
          </div>
        </div>

        {/* ── Section 2: Availability summary (desktop only — mobile has inline KPI) */}
        <div className="hidden md:block">
          <AvailabilitySummary
            date={windowStart}
            roomTypes={roomAvailability}
            selectedRoomTypeId={selectedRoomTypeId}
            onSelect={handleRoomTypeSelect}
            isLoading={availLoading}
          />
        </div>

        {/* ── Loading state ──────────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* ── Error state ────────────────────────────────────────────────── */}
        {isError && !isLoading && (
          <div className="flex-1 flex items-center justify-center px-6">
            <p className="text-sm text-destructive text-center">
              โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่
            </p>
          </div>
        )}

        {/* ── Main content ───────────────────────────────────────────────── */}
        {!isLoading && !isError && (
          <>
            {/* Pending assignments */}
            <PendingAssignmentsPanel stays={unassignedStays} />

            {/* ── Mobile day selector + card list (< md) ─────────────────── */}
            <div className="md:hidden flex flex-col flex-1 overflow-hidden">
              {/* Day picker */}
              <div className="shrink-0 flex border-b border-border bg-card overflow-x-auto">
                {days.map((day, i) => {
                  const isActive = i === mobileDayOffset
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setMobileDayOffset(i)}
                      className={`flex-1 min-w-[3rem] flex flex-col items-center py-2 gap-0.5 text-center transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <span className="text-[10px] font-medium leading-none">
                        {['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'][day.getDay()]}
                      </span>
                      <span className="text-sm font-semibold leading-none">
                        {format(day, 'd')}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Mobile card list */}
              <MobileTimelineList
                rooms={filteredRooms}
                selectedDateStr={mobileSelectedDateStr}
                bookingColorMap={bookingColorMap}
                roomTypeNameMap={roomTypeNameByRoomId}
                unassignedStays={unassignedStays}
                onSelectBooking={handleSelectBooking}
              />
            </div>

            {/* ── Desktop timeline grid (>= md) ─────────────────────────── */}
            <div ref={scrollContainerRef} className="hidden md:block flex-1 overflow-auto">
              <div
                style={{
                  minWidth:
                    'calc(var(--timeline-room-col-width) + 7 * var(--timeline-cell-width))',
                }}
              >
                <TimelineHeader days={days} />

                {filteredRooms.length === 0 && (
                  <div className="flex items-center justify-center py-16">
                    <p className="text-sm text-muted-foreground">
                      {selectedRoomTypeId ? 'ไม่พบห้องสำหรับประเภทนี้' : 'ไม่พบห้องพัก'}
                    </p>
                  </div>
                )}

                {filteredRooms.length > 0 && (
                  <div
                    style={{
                      height:   rowVirtualizer.getTotalSize(),
                      position: 'relative',
                    }}
                  >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const room = filteredRooms[virtualRow.index]
                      return (
                        <div
                          key={room.id}
                          style={{
                            position: 'absolute',
                            top:    virtualRow.start,
                            left:   0,
                            right:  0,
                            height: virtualRow.size,
                          }}
                        >
                          <RoomRow
                            room={room}
                            roomTypeName={roomTypeNameByRoomId[room.id]}
                            windowStart={windowStart}
                            windowEnd={windowEnd}
                            onSelectBooking={handleSelectBooking}
                            isEven={virtualRow.index % 2 === 0}
                            bookingColorMap={bookingColorMap}
                            bookingRoomCountMap={bookingRoomCountMap}
                            hoveredBookingId={hoveredBookingId}
                            onBookingHoverStart={handleBookingHoverStart}
                            onBookingHoverEnd={handleBookingHoverEnd}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Booking detail bottom sheet */}
        <BookingBottomSheet selected={selectedBooking} onClose={handleCloseSheet} />
      </div>
    </TooltipProvider>
  )
}
