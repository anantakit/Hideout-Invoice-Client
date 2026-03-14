import React, { useState, useMemo, useCallback, useRef, useEffect, useSyncExternalStore } from 'react'
import { addDays, subDays, format, startOfDay } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/app/routes'
import { useVirtualizer } from '@tanstack/react-virtual'
import { CalendarPlus, Keyboard } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog'
import toast from 'react-hot-toast'
import { cn } from '@/shared/utils'
import ErrorPanel from '@/shared/components/ErrorPanel'
import TimelineSkeleton from '../components/timeline/TimelineSkeleton'
import { useTimeline, useAvailabilityGrouped, useMoveStay } from '../hooks'
import type { TimelineBooking } from '../types'
import TimelineHeader from '../components/timeline/TimelineHeader'
import RoomRow from '../components/timeline/RoomRow'
import BookingBottomSheet from '../components/timeline/BookingBottomSheet'
import type { SelectedBookingContext } from '../components/timeline/BookingBottomSheet'
import DragPreview from '../components/timeline/DragPreview'
import type { RoomAvailability } from '../components/timeline/AvailabilitySummary'
import TimelineToolbar, { type ZoomLevel, ZOOM_CONFIG } from '../components/timeline/TimelineToolbar'
import { OperationsDrawer, type DrawerMode, type CreateBookingPrefill } from '../components/timeline/OperationsDrawer'
import { MobileTimelineList } from '../components/timeline/MobileTimelineList'
import {
  TIMELINE_ROW_HEIGHT_PX,
  TIMELINE_OVERSCAN_ROWS,
  computeRowHeight,
  getCellWidthPx,
} from '../components/timeline/tokens'
import { computeRoomLayout } from '../components/timeline/bookingLayout'
import { useInfiniteTimeline } from '../components/timeline/useInfiniteTimeline'
import { useTimelineDrag } from '../components/timeline/useTimelineDrag'
import { useTimelineDraw } from '../components/timeline/useTimelineDraw'
import { useTimelineActions } from '../components/timeline/useTimelineActions'
import BookingContextMenu, { type ContextMenuState } from '../components/timeline/BookingContextMenu'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/shared/ui/alert-dialog'

// ─── MobileOnly — renders children only below md (768px) ─────────────────────

const mdQuery = '(min-width: 768px)'
const subscribe = (cb: () => void) => {
  const mql = window.matchMedia(mdQuery)
  mql.addEventListener('change', cb)
  return () => mql.removeEventListener('change', cb)
}
const getSnapshot = () => !window.matchMedia(mdQuery).matches
const getServerSnapshot = () => true

function MobileOnly({ children }: { children: React.ReactNode }) {
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  if (!isMobile) return null
  return <>{children}</>
}

// ─── Status-based booking colors ──────────────────────────────────────────────

const STATUS_COLOR_MAP: Record<string, string> = {
  CONFIRMED:             'bg-bk-reserved text-bk-reserved-foreground',
  RESERVED:              'bg-bk-reserved text-bk-reserved-foreground',
  ASSIGNED:              'bg-bk-reserved text-bk-reserved-foreground',
  PARTIALLY_CHECKED_IN:  'bg-bk-reserved text-bk-reserved-foreground',
  CHECKED_IN:            'bg-bk-checked-in text-bk-checked-in-foreground',
  CHECKED_OUT:           'bg-bk-checked-out text-bk-checked-out-foreground',
  NO_SHOW:               'bg-bk-no-show text-bk-no-show-foreground',
  CANCELLED:             'bg-bk-cancelled/30 text-bk-cancelled-foreground',
}

const FALLBACK_STATUS_COLOR = 'bg-secondary text-secondary-foreground'

function getStatusColorClass(status: string): string {
  return STATUS_COLOR_MAP[status] ?? FALLBACK_STATUS_COLOR
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

const MOBILE_STRIP_DAYS = 21
const MOBILE_CENTER = 10 // anchor is at index 10

// ─── MobileDateStrip ──────────────────────────────────────────────────────────

const MobileDateStrip = React.memo(function MobileDateStrip({
  days,
  selectedIndex,
  todayStr,
  stripRef,
  onSelectDay,
}: {
  days: Date[]
  selectedIndex: number
  todayStr: string
  stripRef: React.RefObject<HTMLDivElement>
  onSelectDay: (index: number) => void
}) {
  return (
    <div
      ref={stripRef}
      className="shrink-0 flex border-b border-border-soft bg-sidebar overflow-x-auto scrollbar-hide snap-x snap-mandatory"
    >
      {days.map((day, i) => {
        const isActive = i === selectedIndex
        const isToday = format(day, 'yyyy-MM-dd') === todayStr
        const dayOfWeek = day.getDay()
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelectDay(i)}
            className={cn(
              'flex-shrink-0 w-12 snap-center flex flex-col items-center py-1.5 gap-0.5 text-center transition-colors',
              isActive
                ? 'bg-primary/15 text-foreground'
                : isWeekend
                  ? 'text-muted-foreground/70'
                  : 'text-muted-foreground hover:bg-muted',
            )}
          >
            <span className={cn(
              'text-[10px] font-medium leading-none',
              isActive && 'text-primary',
            )}>
              {THAI_DAYS_SHORT[dayOfWeek]}
            </span>
            <span className={cn(
              'text-sm font-semibold leading-none',
              isActive && 'text-primary',
            )}>
              {day.getDate()}
            </span>
            {isToday && (
              <span className="w-1 h-1 rounded-full bg-primary" />
            )}
            {day.getDate() === 1 && (
              <span className="text-[8px] text-muted-foreground/60 leading-none">
                {THAI_MONTHS_SHORT[day.getMonth()]}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
})

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const navigate = useNavigate()

  // ── Dev: force skeleton with ?skeleton in URL ──────────────────────────
  const forceSkeleton = import.meta.env.DEV && new URLSearchParams(window.location.search).has('skeleton')

  // ── Virtualisation ──────────────────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // ── Content-ready flag (true once timeline data has loaded at least once) ──
  // Breaks the circular dep: hook needs ready, but ready depends on data that
  // depends on hook output.  We flip once and never go back.
  const [contentReady, setContentReady] = useState(false)

  // ── Infinite timeline (replaces fixed window) ──────────────────────────
  const {
    bufferStart,
    bufferEnd,
    totalDays,
    days,
    fromStr,
    toStr,
    visibleStartDate,
    jumpToDate,
    jumpToToday,
    shiftBy,
  } = useInfiniteTimeline({ scrollContainerRef, ready: contentReady })

  // ── Filter state ──────────────────────────────────────────────────────────
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string | null>(null)

  // ── Zoom level ─────────────────────────────────────────────────────────
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('7d')

  // ── Operations drawer state ─────────────────────────────────────────────
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null)
  const [createBookingPrefill, setCreateBookingPrefill] = useState<CreateBookingPrefill | null>(null)

  // ── Bottom-sheet state ────────────────────────────────────────────────────
  const [selectedBooking, setSelectedBooking] = useState<SelectedBookingContext | null>(null)

  // ── Context menu + cancel dialog + keyboard help state ──────────────────
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [cancelTarget, setCancelTarget] = useState<TimelineBooking | null>(null)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

  // ── Mobile date strip: anchor date (center of the 21-day strip) ─────────
  const [mobileAnchor, setMobileAnchor] = useState<Date>(() => startOfDay(new Date()))
  const [mobileDayOffset, setMobileDayOffset] = useState(10) // 10 = center

  // ── Derived date strings ──────────────────────────────────────────────────
  // These alias the infinite timeline's buffer for backwards compat
  const windowStart = bufferStart
  const windowEnd   = bufferEnd
  const zoomDays    = totalDays

  // ── KPIs are reactive to the visible start date (= date shown in header) ──
  const availFrom = useMemo(() => format(startOfDay(visibleStartDate), 'yyyy-MM-dd'), [visibleStartDate])
  const availTo   = useMemo(() => format(addDays(startOfDay(visibleStartDate), 1), 'yyyy-MM-dd'), [visibleStartDate])

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: timelineData, isLoading, isError } = useTimeline(fromStr, toStr)

  const { data: availData, isLoading: availLoading } =
    useAvailabilityGrouped(availFrom, availTo)

  // Flip contentReady once timeline data arrives (never resets to false)
  useEffect(() => {
    if (!contentReady && !isLoading && !isError && timelineData) {
      setContentReady(true)
    }
  }, [contentReady, isLoading, isError, timelineData])

  // Pre-scroll skeleton to "today" position so the transition to real content
  // has no visible jump. BUFFER_DAYS = 14 matches useInfiniteTimeline.
  useEffect(() => {
    if (isLoading && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 14 * getCellWidthPx()
    }
  }, [isLoading])

  // ── Move stay mutation ──────────────────────────────────────────────────
  const moveStayMutation = useMoveStay()

  // ── Timeline quick actions (check-in / check-out / cancel) ────────────
  const timelineActions = useTimelineActions()

  // ── Derived data ──────────────────────────────────────────────────────────
  const allRooms        = timelineData?.rooms           ?? []
  const allRoomsRef     = useRef(allRooms)
  allRoomsRef.current   = allRooms
  const unassignedStays = timelineData?.unassigned_stays ?? []
  const availRoomTypes  = availData?.room_types          ?? []

  // Sync selectedBooking with fresh timeline data after mutations (e.g. move/extend).
  // Without this, the detail panel shows stale balance_amount until manual refresh.
  useEffect(() => {
    if (!selectedBooking) return
    const stayId = selectedBooking.booking.room_stay_id
    for (const room of allRooms) {
      const fresh = room.bookings.find((b) => b.room_stay_id === stayId)
      if (fresh) {
        const rooms = allRooms
          .filter((r) => r.bookings.some((bk) => bk.booking_id === fresh.booking_id))
          .map((r) => r.room_number)
        setSelectedBooking({ booking: { ...fresh }, roomNumbers: rooms })
        return
      }
    }
  }, [allRooms]) // eslint-disable-line react-hooks/exhaustive-deps

  const roomAvailability = useMemo<RoomAvailability[]>(
    () =>
      availRoomTypes.map((rt) => {
        const physicallyAvailable = rt.rooms.filter((r) => r.available).length
        // Subtract unassigned reservations — they consume capacity even without
        // a specific room assigned yet.
        const effectiveAvailable = Math.max(0, physicallyAvailable - (rt.unassigned_count ?? 0))
        return {
          room_type_id:    rt.room_type_id,
          room_type_name:  rt.room_type_name,
          total_rooms:     rt.rooms.length,
          available_rooms: effectiveAvailable,
          occupied_rooms:  rt.rooms.length - effectiveAvailable,
        }
      }),
    [availRoomTypes],
  )

  const roomTypeIdByRoomId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const rt of availRoomTypes) {
      for (const r of rt.rooms) map[r.room_id] = rt.room_type_id
    }
    return map
  }, [availRoomTypes])
  const roomTypeIdByRoomIdRef = useRef(roomTypeIdByRoomId)
  roomTypeIdByRoomIdRef.current = roomTypeIdByRoomId

  const roomTypeNameByRoomId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const rt of availRoomTypes) {
      for (const r of rt.rooms) map[r.room_id] = rt.room_type_name
    }
    return map
  }, [availRoomTypes])
  const roomTypeNameByRoomIdRef = useRef(roomTypeNameByRoomId)
  roomTypeNameByRoomIdRef.current = roomTypeNameByRoomId

  const priceByRoomTypeId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const rt of availRoomTypes) map[rt.room_type_id] = rt.price_per_night
    return map
  }, [availRoomTypes])
  const priceByRoomTypeIdRef = useRef(priceByRoomTypeId)
  priceByRoomTypeIdRef.current = priceByRoomTypeId

  const filteredRooms = useMemo(() => {
    if (!selectedRoomTypeId) return allRooms
    return allRooms.filter((r) => roomTypeIdByRoomId[r.id] === selectedRoomTypeId)
  }, [allRooms, selectedRoomTypeId, roomTypeIdByRoomId])

  const bookingRoomCountMap = useMemo<Record<string, number>>(() => {
    // Count unique physical rooms per booking (not stays — transfers create
    // multiple stays on the same room which shouldn't inflate the count).
    const roomSets: Record<string, Set<string>> = {}
    for (const room of allRooms) {
      for (const b of room.bookings) {
        if (!roomSets[b.booking_id]) roomSets[b.booking_id] = new Set()
        roomSets[b.booking_id].add(room.id)
      }
    }
    const counts: Record<string, number> = {}
    for (const [bid, s] of Object.entries(roomSets)) counts[bid] = s.size
    return counts
  }, [allRooms])

  const bookingColorMap = useMemo<Record<string, string>>(() => {
    const colors: Record<string, string> = {}
    for (const room of allRooms) {
      for (const b of room.bookings) {
        colors[b.room_stay_id] = getStatusColorClass(b.status)
      }
    }
    return colors
  }, [allRooms])

  const roomLayerCountMap = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const room of allRooms) {
      if (room.bookings.length <= 1) {
        map[room.id] = room.bookings.length
      } else {
        const layout = computeRoomLayout(room.bookings, fromStr, toStr)
        map[room.id] = layout.totalLayers
      }
    }
    return map
  }, [allRooms, fromStr, toStr])

  // Mobile scrollable date strip — 21 days centered on mobileAnchor
  const mobileStripStart = useMemo(
    () => subDays(mobileAnchor, MOBILE_CENTER),
    [mobileAnchor],
  )
  const mobileDays = useMemo(
    () => Array.from({ length: MOBILE_STRIP_DAYS }, (_, i) => addDays(mobileStripStart, i)),
    [mobileStripStart],
  )
  const mobileSelectedDate = useMemo(
    () => addDays(mobileStripStart, mobileDayOffset),
    [mobileStripStart, mobileDayOffset],
  )
  const mobileSelectedDateStr = useMemo(
    () => format(mobileSelectedDate, 'yyyy-MM-dd'),
    [mobileSelectedDate],
  )
  const mobileStripRef = useRef<HTMLDivElement>(null)

  // Auto-scroll the mobile date strip to center the selected day.
  // `isLoading` is in deps so the effect re-runs when loading finishes
  // and the strip element first mounts in the DOM.
  const mobileStripInitial = useRef(true)
  useEffect(() => {
    const el = mobileStripRef.current
    if (!el) return
    const btnWidth = 48 // w-12 = 3rem = 48px
    const scrollTarget = mobileDayOffset * btnWidth - (el.clientWidth / 2) + (btnWidth / 2)
    el.scrollTo({ left: scrollTarget, behavior: mobileStripInitial.current ? 'instant' : 'smooth' })
    mobileStripInitial.current = false
  }, [mobileDayOffset, mobileAnchor, isLoading])

  const handleMobileDaySelect = useCallback((i: number) => {
    setMobileDayOffset(i)
    if (i <= 2 || i >= MOBILE_STRIP_DAYS - 3) {
      const tappedDate = addDays(mobileStripStart, i)
      setMobileAnchor(tappedDate)
      setMobileDayOffset(MOBILE_CENTER)
    }
  }, [mobileStripStart])

  const todayStr = useMemo(() => format(startOfDay(new Date()), 'yyyy-MM-dd'), [])

  // ── Keyboard help: `?` key opens shortcut help dialog ────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        setShowKeyboardHelp((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Count pending check-in tasks for today (unassigned + assigned but not yet checked in)
  const todayPendingCheckinCount = useMemo(() => {
    let count = 0
    // Unassigned stays checking in today
    count += unassignedStays.filter(
      (s) => s.check_in.slice(0, 10) === todayStr && s.status !== 'CANCELLED' && s.status !== 'CHECKED_OUT',
    ).length
    // Assigned stays checking in today but not yet checked in
    for (const room of allRooms) {
      for (const b of room.bookings) {
        if (b.check_in.slice(0, 10) === todayStr && (b.status === 'RESERVED' || b.status === 'ASSIGNED')) {
          count++
        }
      }
    }
    return count
  }, [unassignedStays, allRooms, todayStr])

  // ── KPI totals (memoized) ──────────────────────────────────────────────
  const kpiTotals = useMemo(() => {
    const total     = roomAvailability.reduce((s, r) => s + r.total_rooms, 0)
    const occupied  = roomAvailability.reduce((s, r) => s + r.occupied_rooms, 0)
    const available = roomAvailability.reduce((s, r) => s + r.available_rooms, 0)
    const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0
    return { total, occupied, available, occupancyPct }
  }, [roomAvailability])

  // ── KPI: Arrivals / Departures for visible center date ────────────────────
  const centerDateStr = availFrom
  const arrivalsDepartures = useMemo(() => {
    let arrivals = 0
    let departures = 0
    for (const room of allRooms) {
      for (const b of room.bookings) {
        if (b.status === 'CANCELLED') continue
        if (b.check_in.slice(0, 10) === centerDateStr && b.status !== 'CHECKED_OUT') arrivals++
        const coDate = b.status === 'CHECKED_OUT' && b.checked_out_at
          ? b.checked_out_at.slice(0, 10)
          : b.check_out.slice(0, 10)
        if (coDate === centerDateStr) departures++
      }
    }
    return { arrivals, departures }
  }, [allRooms, centerDateStr])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePrev  = useCallback(() => {
    shiftBy(-7) // desktop: shift 7 days
    // mobile: shift 1 day
    const newDate = subDays(mobileSelectedDate, 1)
    setMobileAnchor(newDate)
    setMobileDayOffset(MOBILE_CENTER)
  }, [shiftBy, mobileSelectedDate])
  const handleNext  = useCallback(() => {
    shiftBy(7) // desktop: shift 7 days
    // mobile: shift 1 day
    const newDate = addDays(mobileSelectedDate, 1)
    setMobileAnchor(newDate)
    setMobileDayOffset(MOBILE_CENTER)
  }, [shiftBy, mobileSelectedDate])
  const handleToday = useCallback(() => {
    jumpToToday()
    // Re-center mobile strip on today
    setMobileAnchor(startOfDay(new Date()))
    setMobileDayOffset(MOBILE_CENTER)
  }, [jumpToToday])

  const handleJumpToDate = useCallback((date: Date) => {
    jumpToDate(date)
    // Re-center mobile strip on the picked date
    setMobileAnchor(startOfDay(date))
    setMobileDayOffset(MOBILE_CENTER)
  }, [jumpToDate])

  const handleZoomChange = useCallback((level: ZoomLevel) => {
    setZoomLevel(level)
    const cfg = ZOOM_CONFIG[level]
    document.documentElement.style.setProperty('--timeline-cell-width', cfg.cssWidth)
  }, [])

  const handleRoomTypeSelect     = useCallback((id: string | null) => setSelectedRoomTypeId(id), [])
  const handleSelectBooking      = useCallback((b: TimelineBooking, roomNumbers?: string[]) => {
    const rooms = roomNumbers ?? allRoomsRef.current
      .filter((r) => r.bookings.some((bk) => bk.booking_id === b.booking_id))
      .map((r) => r.room_number)
    // Force a fresh object reference so React.memo always sees the change
    setSelectedBooking({ booking: { ...b }, roomNumbers: rooms })
    // On desktop, open the push drawer in booking-detail mode
    setDrawerMode('booking-detail')
  }, [])
  const handleCloseSheet         = useCallback(() => {
    setSelectedBooking(null as SelectedBookingContext | null)
    // Close drawer if showing booking detail
    setDrawerMode((prev) => prev === 'booking-detail' ? null : prev)
  }, [])
  const handleCloseDrawer        = useCallback(() => {
    setDrawerMode(null)
    // Clear selected booking when drawer closes
    setSelectedBooking(null)
  }, [])
  const handleToggleOpsDrawer    = useCallback(() => {
    setDrawerMode((prev) => prev === 'ops' ? null : 'ops')
  }, [])
  // Drawer quick actions — find roomId from booking data
  const handleDrawerCheckIn = useCallback((b: TimelineBooking) => {
    const room = allRooms.find((r) => r.bookings.some((bk) => bk.room_stay_id === b.room_stay_id))
    if (!room) return
    timelineActions.checkIn({
      bookingId: b.booking_id,
      roomStayId: b.room_stay_id,
      roomId: room.id,
    })
    handleCloseDrawer()
  }, [allRooms, timelineActions, handleCloseDrawer])
  const handleDrawerCheckOut = useCallback((b: TimelineBooking) => {
    timelineActions.checkOut({
      bookingId: b.booking_id,
      roomStayId: b.room_stay_id,
    })
    handleCloseDrawer()
  }, [timelineActions, handleCloseDrawer])
  const handleDoubleClickBooking = useCallback((b: TimelineBooking) => {
    navigate(ROUTES.bookings.detail(b.booking_id))
  }, [navigate])
  // Empty cell click removed — draw-to-create replaces it (avoids accidental taps)

  // ── Context menu + quick actions ────────────────────────────────────────
  const handleOpenContextMenu = useCallback(
    (booking: TimelineBooking, roomId: string, roomNumber: string, x: number, y: number) => {
      setContextMenu({ booking, roomId, roomNumber, x, y })
    },
    [],
  )
  const handleCloseContextMenu = useCallback(() => setContextMenu(null), [])

  const handleQuickCheckIn = useCallback(
    (booking: TimelineBooking, roomId: string) => {
      timelineActions.checkIn({
        bookingId: booking.booking_id,
        roomStayId: booking.room_stay_id,
        roomId,
      })
    },
    [timelineActions],
  )

  const handleQuickCheckOut = useCallback(
    (booking: TimelineBooking) => {
      timelineActions.checkOut({
        bookingId: booking.booking_id,
        roomStayId: booking.room_stay_id,
      })
    },
    [timelineActions],
  )

  const handleContextOpenDetail = useCallback(
    (booking: TimelineBooking) => {
      navigate(ROUTES.bookings.detail(booking.booking_id))
    },
    [navigate],
  )

  const handleContextTransfer = useCallback(
    (booking: TimelineBooking, _roomId: string) => {
      navigate(ROUTES.bookings.detail(booking.booking_id))
    },
    [navigate],
  )

  const handleContextCancel = useCallback(
    (booking: TimelineBooking) => {
      setCancelTarget(booking)
    },
    [],
  )

  const handleConfirmCancel = useCallback(() => {
    if (!cancelTarget) return
    timelineActions.cancelStay({
      bookingId: cancelTarget.booking_id,
      stayId: cancelTarget.room_stay_id,
    })
    setCancelTarget(null)
  }, [cancelTarget, timelineActions])

  // ── Virtualisation ──────────────────────────────────────────────────────
  const getRowHeight = useCallback(
    (index: number) => {
      const room = filteredRooms[index]
      if (!room) return TIMELINE_ROW_HEIGHT_PX
      const layers = roomLayerCountMap[room.id] ?? 1
      return computeRowHeight(layers)
    },
    [filteredRooms, roomLayerCountMap],
  )

  const rowVirtualizer = useVirtualizer({
    count:            filteredRooms.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize:     getRowHeight,
    overscan:         TIMELINE_OVERSCAN_ROWS,
  })

  // Force virtualizer to recalculate row heights when layer counts change
  // (e.g. after early checkout + same-day walk-in creates overlapping layers).
  useEffect(() => {
    rowVirtualizer.measure()
  }, [rowVirtualizer, roomLayerCountMap])

  // ── Room position helpers for drag ────────────────────────────────────
  const gridContainerRef = useRef<HTMLDivElement>(null)

  const getRoomTop = useCallback(
    (roomId: string): number | undefined => {
      const idx = filteredRooms.findIndex((r) => r.id === roomId)
      if (idx === -1) return undefined
      let top = 0
      for (let i = 0; i < idx; i++) top += getRowHeight(i)
      return top
    },
    [filteredRooms, getRowHeight],
  )

  const getRoomHeight = useCallback(
    (roomId: string): number => {
      const layers = roomLayerCountMap[roomId] ?? 1
      return computeRowHeight(layers)
    },
    [roomLayerCountMap],
  )

  // ── Drag and drop ──────────────────────────────────────────────────────
  const handleMoveStay = useCallback(
    (payload: {
      bookingId: string
      stayId: string
      newRoomId: string
      newCheckIn: string
      newCheckOut: string
    }) => {
      const targetRoom = allRooms.find((r) => r.id === payload.newRoomId)
      const roomLabel = targetRoom ? `ห้อง ${targetRoom.room_number}` : 'ห้องที่เลือก'

      moveStayMutation.mutate(
        {
          bookingId: payload.bookingId,
          stayId: payload.stayId,
          payload: {
            room_id: payload.newRoomId,
            check_in: payload.newCheckIn,
            check_out: payload.newCheckOut,
          },
        },
        {
          onSuccess: () => {
            toast.success(`ย้ายไป${roomLabel} (${payload.newCheckIn} → ${payload.newCheckOut}) สำเร็จ`)
          },
          onError: (err: any) => {
            const serverMsg: string = err?.response?.data?.error ?? ''
            let msg: string

            if (serverMsg.includes('room type mismatch')) {
              msg = `ไม่สามารถย้ายข้ามประเภทห้องได้ — ${roomLabel}เป็นคนละประเภทกับห้องเดิม`
            } else if (serverMsg.includes('room unavailable')) {
              msg = `${roomLabel}ไม่ว่างในช่วง ${payload.newCheckIn} → ${payload.newCheckOut}`
            } else if (serverMsg.includes('room is not active')) {
              msg = `${roomLabel}ปิดใช้งานอยู่ ไม่สามารถย้ายเข้าได้`
            } else if (serverMsg.includes('room stay not found')) {
              msg = 'ไม่พบข้อมูลการเข้าพักนี้ อาจถูกยกเลิกไปแล้ว'
            } else if (serverMsg.includes('room not found')) {
              msg = `ไม่พบ${roomLabel}ในระบบ`
            } else if (serverMsg.includes('CHECKED_OUT') || serverMsg.includes('CANCELLED')) {
              msg = 'ไม่สามารถย้ายได้ — การจองนี้เช็คเอาท์หรือยกเลิกไปแล้ว'
            } else if (serverMsg.includes('check_out must be after check_in')) {
              msg = 'วันเช็คเอาท์ต้องอยู่หลังวันเช็คอิน'
            } else {
              msg = serverMsg || 'ไม่สามารถย้ายการจองได้ กรุณาลองใหม่'
            }

            toast.error(msg)
          },
        },
      )
    },
    [moveStayMutation, allRooms],
  )

  const {
    dragState,
    previewPos,
    isDragging,
    handleDragStart,
    handleKeyboardMove,
    handleKeyboardResize,
  } = useTimelineDrag({
    rooms: filteredRooms,
    windowStart,
    windowDays: zoomDays,
    scrollContainerRef,
    gridContainerRef,
    onMoveStay: handleMoveStay,
    getRoomTop,
    getRoomHeight,
  })

  // ── Draw to create ──────────────────────────────────────────────────────
  const handleBookingCreated = useCallback(
    (_bookingId: string) => {
      setCreateBookingPrefill(null)
      setDrawerMode(null)
    },
    [],
  )

  const { drawPreview, completedDraw, clearCompletedDraw, handleDrawStart } = useTimelineDraw({
    rooms: filteredRooms,
    windowStart,
    windowDays: zoomDays,
    scrollContainerRef,
    getRoomTop,
    getRoomHeight,
    isDragging,
  })

  // React to completed draw — open create-booking drawer
  useEffect(() => {
    if (!completedDraw) return
    const { roomId, checkIn, checkOut } = completedDraw
    const roomTypeId = roomTypeIdByRoomIdRef.current[roomId] ?? ''
    const room = allRoomsRef.current.find((r) => r.id === roomId)
    setCreateBookingPrefill({
      roomId,
      roomTypeId,
      roomNumber: room?.room_number ?? '',
      roomTypeName: roomTypeNameByRoomIdRef.current[roomId] ?? '',
      pricePerNight: priceByRoomTypeIdRef.current[roomTypeId] ?? 0,
      checkIn,
      checkOut,
    })
    setDrawerMode('create-booking')
    clearCompletedDraw()
  }, [completedDraw, clearCompletedDraw])

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="flex flex-col h-full overflow-hidden bg-background">

        {/* ════════════════════════════════════════════════════════════════
            PROFESSIONAL PMS TIMELINE HEADER — 64px dark SaaS control bar
            LEFT: Property | CENTER: Nav + Zoom + Filter | RIGHT: KPIs + Actions
            ════════════════════════════════════════════════════════════════ */}
        <TimelineToolbar
          visibleStartDate={visibleStartDate}
          zoomLevel={zoomLevel}
          onZoomChange={handleZoomChange}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          onJumpToDate={handleJumpToDate}
          mobileSelectedDate={mobileSelectedDate}
          selectedRoomTypeId={selectedRoomTypeId}
          onRoomTypeSelect={handleRoomTypeSelect}
          roomAvailability={roomAvailability}
          kpiTotals={kpiTotals}
          arrivalsDepartures={arrivalsDepartures}
          availLoading={availLoading}
          onNewBooking={() => navigate(ROUTES.bookings.new)}
          onToggleOpsDrawer={handleToggleOpsDrawer}
          drawerMode={drawerMode}
          todayPendingCheckinCount={todayPendingCheckinCount}
        />

        {/* ── Mobile: scrollable date strip + MobileTimelineList (< md) ── */}
        {!isLoading && !isError && !forceSkeleton && (
          <div className="md:hidden flex flex-col flex-1 overflow-hidden">
            <MobileDateStrip
              days={mobileDays}
              selectedIndex={mobileDayOffset}
              todayStr={todayStr}
              stripRef={mobileStripRef}
              onSelectDay={handleMobileDaySelect}
            />

            <MobileTimelineList
              rooms={filteredRooms}
              selectedDateStr={mobileSelectedDateStr}
              bookingColorMap={bookingColorMap}
              roomTypeNameMap={roomTypeNameByRoomId}
              unassignedStays={unassignedStays}
              onSelectBooking={handleSelectBooking}
              onQuickCheckOut={handleDrawerCheckOut}
            />
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            DESKTOP: Timeline + Push Drawer (>= md)
            The scroll container ALWAYS renders so useInfiniteTimeline
            can attach its scroll listener on mount.
            ════════════════════════════════════════════════════════════════ */}
        <div className="hidden md:flex flex-1 overflow-hidden">

          {/* Timeline area — click on empty space to dismiss drawer */}
          <div
            className="flex-1 flex flex-col min-w-0 overflow-hidden"
            onClick={drawerMode ? (e: React.MouseEvent) => {
              // Don't close if clicking a booking block or interactive element
              const target = e.target as HTMLElement
              if (target.closest('.tl-booking-block') || target.closest('button')) return
              handleCloseDrawer()
            } : undefined}
          >

            {/* Timeline grid — ALWAYS mounted for infinite scroll hook */}
            <div ref={scrollContainerRef} className="flex-1 overflow-auto">

              {/* Loading skeleton */}
              {(isLoading || forceSkeleton) && <TimelineSkeleton />}

              {/* Error state */}
              {isError && !isLoading && (
                <div className="flex items-center justify-center py-20 px-6">
                  <ErrorPanel
                    message="โหลดข้อมูลไทม์ไลน์ไม่สำเร็จ"
                    onRetry={() => window.location.reload()}
                  />
                </div>
              )}

              {/* Timeline content */}
              {!isLoading && !isError && !forceSkeleton && (
                <div
                  style={{
                    minWidth:
                      `calc(var(--timeline-room-col-width) + ${zoomDays} * var(--timeline-cell-width))`,
                  }}
                >
                  <TimelineHeader days={days} />

                  {filteredRooms.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <p className="text-body text-muted-foreground">
                        {selectedRoomTypeId ? 'ไม่พบห้องสำหรับประเภทนี้' : 'ไม่มีการจองในช่วงเวลานี้'}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(ROUTES.bookings.new)}
                        className="gap-1.5"
                      >
                        <CalendarPlus size={14} />
                        สร้างการจอง
                      </Button>
                    </div>
                  )}

                  {filteredRooms.length > 0 && (
                    <div
                      ref={gridContainerRef}
                      role="grid"
                      aria-label="Timeline ห้องพัก"
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
                              rowHeight={virtualRow.size}
                              onSelectBooking={handleSelectBooking}

                              isEven={virtualRow.index % 2 === 0}
                              bookingColorMap={bookingColorMap}
                              bookingRoomCountMap={bookingRoomCountMap}
                              onDragStart={handleDragStart}
                              dragState={dragState}
                              onContextMenu={handleOpenContextMenu}
                              windowDays={zoomDays}
                              onKeyboardMove={handleKeyboardMove}
                              onKeyboardResize={handleKeyboardResize}
                              onDoubleClickBooking={handleDoubleClickBooking}
                              onDrawStart={handleDrawStart}
                            />
                          </div>
                        )
                      })}

                      {isDragging && dragState && previewPos && (
                        <DragPreview
                          dragState={dragState}
                          position={previewPos}
                        />
                      )}

                      {drawPreview && (
                        <div
                          className="absolute pointer-events-none z-30 rounded-lg border-2 border-dashed border-primary/50 bg-primary/10 transition-[left,width] duration-75 ease-out"
                          style={{
                            left: `${drawPreview.left}px`,
                            top: `${drawPreview.top}px`,
                            width: `${drawPreview.width}px`,
                            height: `${drawPreview.height}px`,
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Push Drawer ─────────────────────────────────── */}
          <OperationsDrawer
            mode={drawerMode}
            onClose={handleCloseDrawer}
            selectedBooking={selectedBooking}
            onQuickCheckIn={handleDrawerCheckIn}
            onQuickCheckOut={handleDrawerCheckOut}
            onOpenDetail={handleDoubleClickBooking}
            createBookingPrefill={createBookingPrefill}
            onBookingCreated={handleBookingCreated}
            rooms={allRooms}
            todayStr={todayStr}
            roomTypeNameMap={roomTypeNameByRoomId}
            unassignedStays={unassignedStays}
          />
        </div>

        {/* Booking detail bottom sheet — mobile only (Sheet portals ignore CSS hiding) */}
        <MobileOnly>
          <BookingBottomSheet selected={selectedBooking} onClose={handleCloseSheet} />
        </MobileOnly>

        {/* Context menu (portal-rendered) */}
        {contextMenu && (
          <BookingContextMenu
            state={contextMenu}
            onClose={handleCloseContextMenu}
            onCheckIn={handleQuickCheckIn}
            onCheckOut={handleQuickCheckOut}
            onEarlyCheckout={handleContextOpenDetail}
            onOpenDetail={handleContextOpenDetail}
            onCancel={handleContextCancel}
            onTransfer={handleContextTransfer}
          />
        )}

        {/* Keyboard shortcuts help dialog */}
        <Dialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                คีย์ลัด Timeline
              </DialogTitle>
              <DialogDescription>ใช้คีย์ลัดเพื่อจัดการ booking บน timeline ได้เร็วขึ้น</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="space-y-2">
                <p className="text-label text-muted-foreground">การเลือก</p>
                <div className="flex justify-between"><span>เปิดรายละเอียด</span><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">Enter</kbd></div>
                <div className="flex justify-between"><span>เมนูคลิกขวา</span><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">Shift + F10</kbd></div>
              </div>
              <div className="border-t border-border-soft" />
              <div className="space-y-2">
                <p className="text-label text-muted-foreground">ย้าย Booking</p>
                <div className="flex justify-between"><span>ย้ายซ้าย/ขวา (±1 วัน)</span><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">← →</kbd></div>
                <div className="flex justify-between"><span>ย้ายห้อง (ขึ้น/ลง)</span><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">↑ ↓</kbd></div>
              </div>
              <div className="border-t border-border-soft" />
              <div className="space-y-2">
                <p className="text-label text-muted-foreground">ปรับระยะเวลา</p>
                <div className="flex justify-between"><span>ขยาย check-out +1 วัน</span><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">Shift + →</kbd></div>
                <div className="flex justify-between"><span>ลด check-out -1 วัน</span><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">Shift + ←</kbd></div>
              </div>
              <div className="border-t border-border-soft" />
              <p className="text-helper text-center">กด <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">?</kbd> เพื่อเปิด/ปิดหน้าต่างนี้</p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancel confirmation dialog */}
        <AlertDialog open={cancelTarget !== null} onOpenChange={(open) => !open && setCancelTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ยืนยันการยกเลิก</AlertDialogTitle>
              <AlertDialogDescription>
                ต้องการยกเลิกการจองของ <strong>{cancelTarget?.guest_name}</strong>{' '}
                ({cancelTarget?.check_in} → {cancelTarget?.check_out}) ใช่หรือไม่?
                การดำเนินการนี้ไม่สามารถย้อนกลับได้
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmCancel}>
                ยืนยัน ยกเลิกการจอง
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
