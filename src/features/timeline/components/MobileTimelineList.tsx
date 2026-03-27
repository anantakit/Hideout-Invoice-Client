import React, { useMemo, useCallback } from 'react'
import { parseISO, isToday, addDays, format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, BedDouble, LogOut } from 'lucide-react'
import { cn, fmtShort, todayISO as todayISOUtil } from '@/shared/utils'
import { Badge } from '@/shared/ui/badge'
import { ROUTES } from '@/app/routes'
import type { TimelineRoom } from '@/features/bookings/types'
import { computeDateKPI } from '../utils/computeDateKPI'
import { StayAvailabilityCard } from './StayAvailabilityCard'
import CheckInBottomSheet from './AssignRoomBottomSheet'
import { computeDateOps } from '../utils/computeDateOps'
import { classifyRooms, type RoomEntry } from '../utils/classifyRooms'
import { RoomCard } from './RoomCard'
import { PendingCheckinCard, DoneCheckinCard } from './MobileCheckinCards'
import { PendingCheckoutCard, DoneCheckoutCard } from './MobileCheckoutCards'
import CheckOutBottomSheet from './CheckOutBottomSheet'
import { useTimelineContext } from '../context/TimelineContext'
import { useTimelineCallbacks } from '../context/TimelineCallbackContext'
import { useMobileTimelineFilters } from '../hooks/useMobileTimelineFilters'
import { MobileRoomCard } from './MobileRoomCard'
import { MobileBookingItem, computePendingBookings } from './MobileBookingItem'
import { MobileFilterBar } from './MobileFilterBar'

// ── Props ─────────────────────────────────────────────────────────────────────

interface MobileTimelineListProps {
  rooms: TimelineRoom[]
  selectedDateStr: string
  roomTypeIdMap: Record<string, string>
}

// ── Main Component ────────────────────────────────────────────────────────────

export const MobileTimelineList = React.memo(function MobileTimelineList({
  rooms,
  selectedDateStr,
  roomTypeIdMap,
}: MobileTimelineListProps) {
  const { roomTypeNameMap, unassignedStays } = useTimelineContext()
  const { onSelectBooking } = useTimelineCallbacks()
  const navigate = useNavigate()

  // ── Computed data ───────────────────────────────────────────────────────
  const kpi = useMemo(
    () => computeDateKPI(rooms, unassignedStays, selectedDateStr, roomTypeNameMap),
    [rooms, unassignedStays, selectedDateStr, roomTypeNameMap],
  )

  const dateOps = useMemo(
    () => computeDateOps(rooms, unassignedStays, selectedDateStr, roomTypeNameMap),
    [rooms, unassignedStays, selectedDateStr, roomTypeNameMap],
  )

  const { entries, counts } = useMemo(
    () => classifyRooms(rooms, selectedDateStr, roomTypeNameMap),
    [rooms, selectedDateStr, roomTypeNameMap],
  )

  // ── Filter state ────────────────────────────────────────────────────────
  const hasCheckins = dateOps.checkins.length > 0 || dateOps.doneCheckins.length > 0
  const hasCheckouts = dateOps.checkouts.length > 0 || dateOps.doneCheckouts.length > 0
  const checkinAllDone = hasCheckins && dateOps.checkins.length === 0
  const checkoutAllDone = hasCheckouts && dateOps.checkouts.length === 0

  const { state, dispatch, stayRangeValid, filtered, total, chipList, chipCounts, unassignedForDate } =
    useMobileTimelineFilters(selectedDateStr, checkinAllDone, checkoutAllDone, entries, counts, unassignedStays)

  // ── Pending assignments (today & overdue) ───────────────────────────────
  const todayISO = todayISOUtil()
  const pendingBookings = useMemo(
    () => computePendingBookings(unassignedStays, todayISO),
    [unassignedStays, todayISO],
  )

  const pendingTotalStays = pendingBookings.reduce((sum, b) => sum + b.totalRooms, 0)

  // ── Callbacks ───────────────────────────────────────────────────────────
  const selectedDate = parseISO(selectedDateStr)
  const viewingToday = isToday(selectedDate)

  const handleNavigateToBooking = useCallback(
    (bookingId: string) => navigate(`/bookings/${bookingId}`),
    [navigate],
  )

  const handleTap = useCallback(
    (entry: RoomEntry) => {
      if (entry.status === 'available') {
        const nextDay = format(addDays(parseISO(selectedDateStr), 1), 'yyyy-MM-dd')
        const rtId = roomTypeIdMap[entry.room.id] ?? ''
        const params = new URLSearchParams({ check_in: selectedDateStr, check_out: nextDay })
        if (rtId) params.set('room_type_id', rtId)
        params.set('room_id', entry.room.id)
        navigate(`${ROUTES.bookings.new}?${params}`)
        return
      }
      if (entry.status === 'range_available' || entry.status === 'range_occupied') return
      if (entry.status === 'turnover' && entry.checkoutBooking) {
        onSelectBooking(entry.checkoutBooking)
        return
      }
      if (entry.booking) onSelectBooking(entry.booking)
    },
    [onSelectBooking, navigate, selectedDateStr, roomTypeIdMap],
  )

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-auto pb-6">
      {/* Section 1: สถานะโรงแรม */}
      <MobileRoomCard kpi={kpi} rooms={rooms} selectedDateStr={selectedDateStr} dateOps={dateOps} />

      {/* Section 2A: เช็คอิน */}
      {hasCheckins && (
        <div className="px-4 space-section space-y-2">
          <button
            type="button"
            className="text-label text-primary flex items-center space-inline w-full cursor-pointer"
            onClick={() => dispatch({ type: 'TOGGLE_CHECKIN' })}
          >
            เช็คอิน{viewingToday ? 'วันนี้' : ` ${fmtShort(selectedDate)}`}
            <Badge variant="default" className="tabular-nums ml-0.5 text-micro px-1.5 py-0">
              {kpi.checkinDone}/{kpi.checkinTotal}
            </Badge>
            <ChevronDown className={cn(
              'w-3.5 h-3.5 ml-auto text-muted-foreground transition-transform',
              state.checkinExpanded && 'rotate-180',
            )} />
          </button>
          {state.checkinExpanded && (
            <>
              {dateOps.checkins.map((ci) => (
                <PendingCheckinCard key={ci.bookingId} ci={ci} onAssign={(id) => dispatch({ type: 'OPEN_ASSIGN_SHEET', bookingId: id })} />
              ))}
              {dateOps.doneCheckins.map((ci) => (
                <DoneCheckinCard key={ci.bookingId} ci={ci} onNavigate={handleNavigateToBooking} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Section 2B: เช็คเอาท์ */}
      {hasCheckouts && (
        <div className="px-4 space-section space-y-2">
          <button
            type="button"
            className="text-label text-warning flex items-center space-inline w-full cursor-pointer"
            onClick={() => dispatch({ type: 'TOGGLE_CHECKOUT' })}
          >
            <LogOut className="w-3 h-3" />
            เช็คเอาท์{viewingToday ? 'วันนี้' : ` ${fmtShort(selectedDate)}`}
            <Badge variant="amber" className="tabular-nums ml-0.5 text-micro px-1.5 py-0">
              {kpi.checkoutDone}/{kpi.checkoutTotal}
            </Badge>
            <ChevronDown className={cn(
              'w-3.5 h-3.5 ml-auto text-muted-foreground transition-transform',
              state.checkoutExpanded && 'rotate-180',
            )} />
          </button>
          {state.checkoutExpanded && (
            <>
              {dateOps.checkouts.map((co) => (
                <PendingCheckoutCard key={co.bookingId} co={co} onOpen={(id) => dispatch({ type: 'OPEN_CHECKOUT_SHEET', bookingId: id })} />
              ))}
              {dateOps.doneCheckouts.map((co) => (
                <DoneCheckoutCard key={co.bookingId} co={co} onNavigate={handleNavigateToBooking} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Section 2.5: รอมอบหมายห้อง */}
      {pendingTotalStays > 0 && (
        <div className="px-4 space-section space-y-2">
          <div className="text-label text-muted-foreground flex items-center space-inline">
            <BedDouble className="w-3 h-3" />
            รอมอบหมายห้อง
            <Badge variant="amber" className="tabular-nums ml-0.5 text-micro px-1.5 py-0">{pendingTotalStays}</Badge>
          </div>
          {pendingBookings.map((booking) => (
            <MobileBookingItem
              key={booking.bookingId}
              booking={booking}
              onAssign={(id) => dispatch({ type: 'OPEN_ASSIGN_SHEET', bookingId: id })}
            />
          ))}
        </div>
      )}

      {/* Section 3: ตรวจสอบห้องว่าง */}
      <div className="px-4 space-section">
        <StayAvailabilityCard
          range={state.stayRange}
          onRangeChange={(v) => dispatch({ type: 'SET_STAY_RANGE', value: v })}
        />
      </div>

      {/* Section 4: รายการห้องพัก */}
      <div className="space-section">
        <MobileFilterBar
          filter={state.filter}
          freeRoomMode={state.freeRoomMode}
          stayRangeValid={stayRangeValid}
          total={total}
          chipList={chipList}
          chipCounts={chipCounts}
          unassignedForDate={unassignedForDate}
          onModeChange={(mode) => dispatch({ type: 'SWITCH_MODE', mode })}
          onFilterChange={(value) => dispatch({ type: 'SET_FILTER', value })}
        />

        <div className="px-4 pt-2 space-list">
          {filtered.length === 0 ? (
            <p className="text-body text-muted-foreground text-center py-8">ไม่พบห้อง</p>
          ) : (
            filtered.map((entry) => (
              <RoomCard key={entry.room.id} entry={entry} onTap={handleTap} />
            ))
          )}
        </div>
      </div>

      {/* Bottom Sheets */}
      <CheckInBottomSheet
        bookingId={state.assignSheetBookingId}
        onClose={() => dispatch({ type: 'CLOSE_ASSIGN_SHEET' })}
      />
      <CheckOutBottomSheet
        bookingId={state.checkoutSheetBookingId}
        onClose={() => dispatch({ type: 'CLOSE_CHECKOUT_SHEET' })}
      />
    </div>
  )
})
