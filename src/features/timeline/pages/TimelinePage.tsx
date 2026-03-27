import { useRef, useCallback, useMemo } from 'react'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import TimelineToolbar from '../components/TimelineToolbar'
import BookingBottomSheet from '../components/BookingBottomSheet'
import BookingContextMenu from '../components/BookingContextMenu'
import { MobileDateStrip } from '../components/MobileDateStrip'
import { MobileTimelineList } from '../components/MobileTimelineList'
import { TimelineContent } from '../components/TimelineContent'
import {
  KeyboardHelpDialog,
  CancelConfirmDialog,
  CheckInConfirmDialog,
  CheckOutConfirmDialog,
} from '../components/TimelineConfirmDialogs'
import { useTimelineState } from '../hooks/useTimelineState'
import { useTimelineKeyboard } from '../hooks/useTimelineKeyboard'
import { TimelineProvider, type TimelineContextValue } from '../context/TimelineContext'
import { TimelineCallbackProvider, type TimelineCallbackContextValue } from '../context/TimelineCallbackContext'
import { DrawerProvider, type DrawerContextValue } from '../context/DrawerContext'
import { DragStateProvider, type DragStateContextValue } from '../context/DragStateContext'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const isMobile = useIsMobile()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const s = useTimelineState(scrollContainerRef)

  // Keyboard shortcut: `?` toggles help dialog
  const toggleKeyboardHelp = useCallback(
    () => s.setShowKeyboardHelp((v) => !v),
    [s.setShowKeyboardHelp],
  )
  useTimelineKeyboard(toggleKeyboardHelp)

  // ── Context values (memoized to avoid unnecessary re-renders) ───────────
  const dataCtx = useMemo<TimelineContextValue>(() => ({
    bookingColorMap: s.bookingColorMap,
    bookingRoomCountMap: s.bookingRoomCountMap,
    roomTypeNameMap: s.roomTypeNameByRoomId,
    todayStr: s.todayStr,
    windowStart: s.windowStart,
    windowEnd: s.windowEnd,
    zoomDays: s.zoomDays,
    days: s.days,
    allRooms: s.allRooms,
    unassignedStays: s.unassignedStays,
  }), [
    s.bookingColorMap, s.bookingRoomCountMap, s.roomTypeNameByRoomId,
    s.todayStr, s.windowStart, s.windowEnd, s.zoomDays, s.days,
    s.allRooms, s.unassignedStays,
  ])

  const callbackCtx = useMemo<TimelineCallbackContextValue>(() => ({
    onSelectBooking: s.handleSelectBooking,
    onDoubleClickBooking: s.handleDoubleClickBooking,
    onContextMenu: s.handleOpenContextMenu,
    onDragStart: s.handleDragStart,
    onKeyboardMove: s.handleKeyboardMove,
    onKeyboardResize: s.handleKeyboardResize,
    onDrawStart: s.handleDrawStart,
    onDrawerCheckIn: s.handleDrawerCheckIn,
    onDirectCheckOut: s.handleDirectCheckOut,
  }), [
    s.handleSelectBooking, s.handleDoubleClickBooking, s.handleOpenContextMenu,
    s.handleDragStart, s.handleKeyboardMove, s.handleKeyboardResize,
    s.handleDrawStart, s.handleDrawerCheckIn, s.handleDirectCheckOut,
  ])

  const drawerCtx = useMemo<DrawerContextValue>(() => ({
    drawerMode: s.drawerMode,
    onCloseDrawer: s.handleCloseDrawer,
    selectedBooking: s.selectedBooking,
    createBookingPrefill: s.createBookingPrefill,
    onBookingCreated: s.handleBookingCreated,
  }), [
    s.drawerMode, s.handleCloseDrawer, s.selectedBooking,
    s.createBookingPrefill, s.handleBookingCreated,
  ])

  const dragCtx = useMemo<DragStateContextValue>(() => ({
    dragState: s.dragState,
    previewPos: s.previewPos,
    isDragging: s.isDragging,
    drawPreview: s.drawPreview,
  }), [s.dragState, s.previewPos, s.isDragging, s.drawPreview])

  return (
    <TooltipProvider>
      <TimelineProvider value={dataCtx}>
        <TimelineCallbackProvider value={callbackCtx}>
          <DrawerProvider value={drawerCtx}>
            <DragStateProvider value={dragCtx}>
          <div className="flex flex-col h-full overflow-hidden bg-background">

            {/* ── Toolbar ─────────────────────────────────────────────── */}
            <TimelineToolbar
              visibleStartDate={s.visibleStartDate}
              zoomLevel={s.zoomLevel}
              onZoomChange={s.handleZoomChange}
              onPrev={s.handlePrev}
              onNext={s.handleNext}
              onToday={s.handleToday}
              onJumpToDate={s.handleJumpToDate}
              mobileSelectedDate={s.mobileSelectedDate}
              selectedRoomTypeId={s.selectedRoomTypeId}
              onRoomTypeSelect={s.handleRoomTypeSelect}
              roomAvailability={s.roomAvailability}
              kpiProps={{ kpiTotals: s.kpiTotals, arrivalsDepartures: s.arrivalsDepartures, availLoading: s.availLoading }}
              opsDrawerProps={{ onToggleOpsDrawer: s.handleToggleOpsDrawer, drawerMode: s.drawerMode, todayPendingCheckinCount: s.todayPendingCheckinCount }}
            />

            {/* ── Mobile: date strip + list (< md) ───────────────────── */}
            {!s.isLoading && !s.isError && !s.forceSkeleton && (
              <div className="md:hidden flex flex-col flex-1 overflow-hidden">
                <MobileDateStrip
                  days={s.mobileDays}
                  selectedIndex={s.mobileDayOffset}
                  todayStr={s.todayStr}
                  stripRef={s.mobileStripRef}
                  onSelectDay={s.handleMobileDaySelect}
                />
                <MobileTimelineList
                  rooms={s.filteredRooms}
                  selectedDateStr={s.mobileSelectedDateStr}
                  roomTypeIdMap={s.roomTypeIdByRoomId}
                />
              </div>
            )}

            {/* ── Desktop: timeline grid + drawer (>= md) ────────────── */}
            <TimelineContent
              isLoading={s.isLoading}
              isError={s.isError}
              isFetching={s.isFetching}
              forceSkeleton={s.forceSkeleton}
              scrollContainerRef={scrollContainerRef}
              selectedRoomTypeId={s.selectedRoomTypeId}
              filteredRooms={s.filteredRooms}
              rowVirtualizer={s.rowVirtualizer}
              gridContainerRef={s.gridContainerRef}
            />

            {/* ── Bottom sheet (mobile only) ──────────────────────────── */}
            {isMobile && (
              <BookingBottomSheet selected={s.selectedBooking} onClose={s.handleCloseSheet} />
            )}

            {/* ── Context menu (portal) ───────────────────────────────── */}
            {s.contextMenu && (
              <BookingContextMenu
                state={s.contextMenu}
                onClose={s.handleCloseContextMenu}
                onCheckIn={s.handleQuickCheckIn}
                onCheckOut={s.handleQuickCheckOut}
                onEarlyCheckout={s.handleContextOpenDetail}
                onOpenDetail={s.handleContextOpenDetail}
                onCancel={s.handleContextCancel}
                onTransfer={s.handleContextTransfer}
              />
            )}

            {/* ── Dialogs ─────────────────────────────────────────────── */}
            <KeyboardHelpDialog open={s.showKeyboardHelp} onOpenChange={s.setShowKeyboardHelp} />
            <CancelConfirmDialog target={s.cancelTarget} onClose={() => s.setCancelTarget(null)} onConfirm={s.handleConfirmCancel} />
            <CheckInConfirmDialog target={s.checkInTarget} onClose={() => s.setCheckInTarget(null)} onConfirm={s.handleConfirmCheckIn} />
            <CheckOutConfirmDialog target={s.checkOutTarget} onClose={() => s.setCheckOutTarget(null)} onConfirm={s.handleConfirmCheckOut} />
          </div>
            </DragStateProvider>
          </DrawerProvider>
        </TimelineCallbackProvider>
      </TimelineProvider>
    </TooltipProvider>
  )
}
