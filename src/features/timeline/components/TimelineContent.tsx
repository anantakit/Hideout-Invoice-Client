import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { ROUTES } from '@/app/routes'
import type { Virtualizer } from '@tanstack/react-virtual'
import type { TimelineRoom } from '@/features/bookings/types'
import TimelineHeader from './TimelineHeader'
import TimelineSkeleton from './TimelineSkeleton'
import ErrorPanel from '@/shared/components/ErrorPanel'
import RoomRow from './RoomRow'
import DragPreview from './DragPreview'
import { OperationsDrawer } from './OperationsDrawer'
import { useTimelineContext } from '../context/TimelineContext'
import { useDrawerContext } from '../context/DrawerContext'
import { useDragStateContext } from '../context/DragStateContext'

interface TimelineContentProps {
  // Loading/error
  isLoading: boolean
  isError: boolean
  isFetching: boolean
  forceSkeleton: boolean | '' | undefined

  // Scroll container ref (ALWAYS mounted for infinite scroll hook)
  scrollContainerRef: React.RefObject<HTMLDivElement>

  // Timeline data
  selectedRoomTypeId: string | null
  filteredRooms: TimelineRoom[]

  // Virtualizer
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>
  gridContainerRef: React.RefObject<HTMLDivElement>
}

export function TimelineContent({
  isLoading,
  isError,
  isFetching,
  forceSkeleton,
  scrollContainerRef,
  selectedRoomTypeId,
  filteredRooms,
  rowVirtualizer,
  gridContainerRef,
}: TimelineContentProps) {
  const navigate = useNavigate()
  const { zoomDays, days, roomTypeNameMap } = useTimelineContext()
  const { drawerMode, onCloseDrawer, selectedBooking, createBookingPrefill, onBookingCreated } = useDrawerContext()
  const { dragState, previewPos, isDragging, drawPreview } = useDragStateContext()

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
                          roomTypeName={roomTypeNameMap[room.id]}
                          rowHeight={virtualRow.size}
                          isEven={virtualRow.index % 2 === 0}
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
        createBookingPrefill={createBookingPrefill}
        onBookingCreated={onBookingCreated}
      />
    </div>
  )
}
