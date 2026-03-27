import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { ROUTES } from '@/app/routes'
import type { Virtualizer } from '@tanstack/react-virtual'
import type { TimelineRoom, TimelineBooking } from '../../types'
import type { SelectedBookingContext } from './BookingBottomSheet'
import type { DrawerMode, CreateBookingPrefill } from './OperationsDrawer'
import type { DrawPreviewPosition } from '../hooks/useTimelineDraw'
import type { DragState, DragMode, DragPreviewPosition } from '../hooks/useTimelineDrag'
import TimelineHeader from './TimelineHeader'
import TimelineSkeleton from './TimelineSkeleton'
import ErrorPanel from '@/shared/components/ErrorPanel'
import RoomRow from './RoomRow'
import DragPreview from './DragPreview'
import { OperationsDrawer } from './OperationsDrawer'
import type { UnassignedStay } from '../../types'

interface TimelineContentProps {
  // Loading/error
  isLoading: boolean
  isError: boolean
  isFetching: boolean
  forceSkeleton: boolean | '' | undefined

  // Scroll container ref (ALWAYS mounted for infinite scroll hook)
  scrollContainerRef: React.RefObject<HTMLDivElement>

  // Timeline data
  days: Date[]
  windowStart: Date
  windowEnd: Date
  zoomDays: number
  selectedRoomTypeId: string | null
  filteredRooms: TimelineRoom[]

  // Maps
  roomTypeNameByRoomId: Record<string, string>
  bookingColorMap: Record<string, string>
  bookingRoomCountMap: Record<string, number>

  // Virtualizer
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>
  gridContainerRef: React.RefObject<HTMLDivElement>

  // Drag
  dragState: DragState | null
  previewPos: DragPreviewPosition | null
  isDragging: boolean
  onDragStart: (e: React.PointerEvent | PointerEvent, booking: TimelineBooking, roomId: string, mode: DragMode) => void
  onKeyboardMove: (booking: TimelineBooking, roomId: string, direction: 'left' | 'right' | 'up' | 'down') => void
  onKeyboardResize: (booking: TimelineBooking, roomId: string, edge: 'extend' | 'shrink') => void

  // Draw
  drawPreview: DrawPreviewPosition | null
  onDrawStart: (e: React.PointerEvent, roomId: string) => void

  // Booking actions
  onSelectBooking: (b: TimelineBooking, roomNumbers?: string[]) => void
  onDoubleClickBooking: (b: TimelineBooking) => void
  onContextMenu: (booking: TimelineBooking, roomId: string, roomNumber: string, x: number, y: number) => void

  // Drawer
  drawerMode: DrawerMode
  onCloseDrawer: () => void
  selectedBooking: SelectedBookingContext | null
  onDrawerCheckIn: (b: TimelineBooking) => void
  onDirectCheckOut: (b: TimelineBooking) => void
  createBookingPrefill: CreateBookingPrefill | null
  onBookingCreated: (bookingId: string) => void
  allRooms: TimelineRoom[]
  todayStr: string
  roomTypeNameMap: Record<string, string>
  unassignedStays: UnassignedStay[]
}

export function TimelineContent({
  isLoading,
  isError,
  isFetching,
  forceSkeleton,
  scrollContainerRef,
  days,
  windowStart,
  windowEnd,
  zoomDays,
  selectedRoomTypeId,
  filteredRooms,
  roomTypeNameByRoomId,
  bookingColorMap,
  bookingRoomCountMap,
  rowVirtualizer,
  gridContainerRef,
  dragState,
  previewPos,
  isDragging,
  onDragStart,
  onKeyboardMove,
  onKeyboardResize,
  drawPreview,
  onDrawStart,
  onSelectBooking,
  onDoubleClickBooking,
  onContextMenu,
  drawerMode,
  onCloseDrawer,
  selectedBooking,
  onDrawerCheckIn,
  onDirectCheckOut,
  createBookingPrefill,
  onBookingCreated,
  allRooms,
  todayStr,
  roomTypeNameMap,
  unassignedStays,
}: TimelineContentProps) {
  const navigate = useNavigate()

  return (
    <div className="hidden md:flex flex-1 overflow-hidden">
      {/* Timeline area — click on empty space to dismiss drawer */}
      <div
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
        onClick={
          drawerMode
            ? (e: React.MouseEvent) => {
                const target = e.target as HTMLElement
                if (
                  target.closest('.tl-booking-block') ||
                  target.closest('button')
                )
                  return
                onCloseDrawer()
              }
            : undefined
        }
      >
        {/* Timeline grid — ALWAYS mounted for infinite scroll hook */}
        <div
          ref={scrollContainerRef}
          className={`flex-1 overflow-auto transition-opacity duration-150 ${
            isFetching && !isLoading ? 'opacity-60' : ''
          }`}
        >
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
                minWidth: `calc(var(--timeline-room-col-width) + ${zoomDays} * var(--timeline-cell-width))`,
              }}
            >
              <TimelineHeader days={days} />

              {filteredRooms.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <p className="text-body text-muted-foreground">
                    {selectedRoomTypeId
                      ? 'ไม่พบห้องสำหรับประเภทนี้'
                      : 'ไม่มีการจองในช่วงเวลานี้'}
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
                  aria-label="ตารางห้องพัก"
                  style={{
                    height: rowVirtualizer.getTotalSize(),
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
                          top: virtualRow.start,
                          left: 0,
                          right: 0,
                          height: virtualRow.size,
                        }}
                      >
                        <RoomRow
                          room={room}
                          roomTypeName={roomTypeNameByRoomId[room.id]}
                          windowStart={windowStart}
                          windowEnd={windowEnd}
                          rowHeight={virtualRow.size}
                          onSelectBooking={onSelectBooking}
                          isEven={virtualRow.index % 2 === 0}
                          bookingColorMap={bookingColorMap}
                          bookingRoomCountMap={bookingRoomCountMap}
                          onDragStart={onDragStart}
                          dragState={dragState}
                          onContextMenu={onContextMenu}
                          windowDays={zoomDays}
                          onKeyboardMove={onKeyboardMove}
                          onKeyboardResize={onKeyboardResize}
                          onDoubleClickBooking={onDoubleClickBooking}
                          onDrawStart={onDrawStart}
                        />
                      </div>
                    )
                  })}

                  {isDragging && dragState && previewPos && (
                    <DragPreview dragState={dragState} position={previewPos} />
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

      {/* ── Right Push Drawer ─────────────────────────────────────── */}
      <OperationsDrawer
        mode={drawerMode}
        onClose={onCloseDrawer}
        selectedBooking={selectedBooking}
        onQuickCheckIn={onDrawerCheckIn}
        onDirectCheckOut={onDirectCheckOut}
        onOpenDetail={onDoubleClickBooking}
        createBookingPrefill={createBookingPrefill}
        onBookingCreated={onBookingCreated}
        rooms={allRooms}
        todayStr={todayStr}
        roomTypeNameMap={roomTypeNameMap}
        unassignedStays={unassignedStays}
      />
    </div>
  )
}
