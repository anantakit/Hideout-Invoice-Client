import React, { useRef, useCallback, useSyncExternalStore } from 'react'
import { TooltipProvider } from '@/shared/ui/tooltip'
import TimelineToolbar from '../timeline/components/TimelineToolbar'
import BookingBottomSheet from '../timeline/components/BookingBottomSheet'
import BookingContextMenu from '../timeline/components/BookingContextMenu'
import { MobileSection } from '../timeline/components/MobileSection'
import { TimelineContent } from '../timeline/components/TimelineContent'
import {
  KeyboardHelpDialog,
  CancelConfirmDialog,
  CheckInConfirmDialog,
  CheckOutConfirmDialog,
} from '../timeline/components/TimelineConfirmDialogs'
import { useTimelineState } from '../timeline/hooks/useTimelineState'
import { useTimelineKeyboard } from '../timeline/hooks/useTimelineKeyboard'

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const s = useTimelineState(scrollContainerRef)

  // Keyboard shortcut: `?` toggles help dialog
  const toggleKeyboardHelp = useCallback(
    () => s.setShowKeyboardHelp((v) => !v),
    [s.setShowKeyboardHelp],
  )
  useTimelineKeyboard(toggleKeyboardHelp)

  return (
    <TooltipProvider>
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
          kpiTotals={s.kpiTotals}
          arrivalsDepartures={s.arrivalsDepartures}
          availLoading={s.availLoading}
          onToggleOpsDrawer={s.handleToggleOpsDrawer}
          drawerMode={s.drawerMode}
          todayPendingCheckinCount={s.todayPendingCheckinCount}
        />

        {/* ── Mobile: date strip + list (< md) ───────────────────── */}
        {!s.isLoading && !s.isError && !s.forceSkeleton && (
          <MobileSection
            mobileDays={s.mobileDays}
            mobileDayOffset={s.mobileDayOffset}
            todayStr={s.todayStr}
            mobileStripRef={s.mobileStripRef}
            onMobileDaySelect={s.handleMobileDaySelect}
            rooms={s.filteredRooms}
            selectedDateStr={s.mobileSelectedDateStr}
            bookingColorMap={s.bookingColorMap}
            roomTypeNameMap={s.roomTypeNameByRoomId}
            roomTypeIdMap={s.roomTypeIdByRoomId}
            unassignedStays={s.unassignedStays}
            onSelectBooking={s.handleSelectBooking}
          />
        )}

        {/* ── Desktop: timeline grid + drawer (>= md) ────────────── */}
        <TimelineContent
          isLoading={s.isLoading}
          isError={s.isError}
          isFetching={s.isFetching}
          forceSkeleton={s.forceSkeleton}
          scrollContainerRef={scrollContainerRef}
          days={s.days}
          windowStart={s.windowStart}
          windowEnd={s.windowEnd}
          zoomDays={s.zoomDays}
          selectedRoomTypeId={s.selectedRoomTypeId}
          filteredRooms={s.filteredRooms}
          roomTypeNameByRoomId={s.roomTypeNameByRoomId}
          bookingColorMap={s.bookingColorMap}
          bookingRoomCountMap={s.bookingRoomCountMap}
          rowVirtualizer={s.rowVirtualizer}
          gridContainerRef={s.gridContainerRef}
          dragState={s.dragState}
          previewPos={s.previewPos}
          isDragging={s.isDragging}
          onDragStart={s.handleDragStart}
          onKeyboardMove={s.handleKeyboardMove}
          onKeyboardResize={s.handleKeyboardResize}
          drawPreview={s.drawPreview}
          onDrawStart={s.handleDrawStart}
          onSelectBooking={s.handleSelectBooking}
          onDoubleClickBooking={s.handleDoubleClickBooking}
          onContextMenu={s.handleOpenContextMenu}
          drawerMode={s.drawerMode}
          onCloseDrawer={s.handleCloseDrawer}
          selectedBooking={s.selectedBooking}
          onDrawerCheckIn={s.handleDrawerCheckIn}
          onDirectCheckOut={s.handleDirectCheckOut}
          createBookingPrefill={s.createBookingPrefill}
          onBookingCreated={s.handleBookingCreated}
          allRooms={s.allRooms}
          todayStr={s.todayStr}
          roomTypeNameMap={s.roomTypeNameByRoomId}
          unassignedStays={s.unassignedStays}
        />

        {/* ── Bottom sheet (mobile only) ──────────────────────────── */}
        <MobileOnly>
          <BookingBottomSheet selected={s.selectedBooking} onClose={s.handleCloseSheet} />
        </MobileOnly>

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
    </TooltipProvider>
  )
}
