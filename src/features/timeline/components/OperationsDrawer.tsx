import React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import { DesktopOperationsPanel } from './DesktopOperationsPanel'
import { BookingDetailContent } from './BookingDetailContent'
import { InlineCreateBookingForm } from './InlineCreateBookingForm'
import { useTimelineContext } from '../context/TimelineContext'
import { useTimelineCallbacks } from '../context/TimelineCallbackContext'
import type { SelectedBookingContext } from '@/features/timeline/types'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type DrawerMode = 'ops' | 'booking-detail' | 'create-booking' | null

export interface CreateBookingPrefill {
  roomId: string
  roomTypeId: string
  roomNumber: string
  roomTypeName: string
  pricePerNight: number
  checkIn: string   // YYYY-MM-DD
  checkOut: string   // YYYY-MM-DD
}

interface OperationsDrawerProps {
  mode: DrawerMode
  onClose: () => void
  selectedBooking: SelectedBookingContext | null
  createBookingPrefill?: CreateBookingPrefill | null
  onBookingCreated?: (bookingId: string) => void
}

// ─── Ops Content ───────────────────────────────────────────────────────────────

function OpsContent({ onClose }: { onClose: () => void }) {
  const { allRooms, todayStr, roomTypeNameMap, unassignedStays } = useTimelineContext()
  const { onDirectCheckOut } = useTimelineCallbacks()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-border-soft">
        <span className="text-sm font-semibold text-foreground">ปฏิบัติการวันนี้</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 shrink-0"
          aria-label="ปิด"
        >
          <X size={14} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <DesktopOperationsPanel
          rooms={allRooms}
          selectedDateStr={todayStr}
          roomTypeNameMap={roomTypeNameMap}
          unassignedStays={unassignedStays}
          onDirectCheckOut={onDirectCheckOut}
        />
      </div>
    </div>
  )
}

// ─── Main Drawer Component ─────────────────────────────────────────────────────

const DRAWER_WIDTH = 420

export const OperationsDrawer = React.memo(function OperationsDrawer({
  mode,
  onClose,
  selectedBooking,
  createBookingPrefill,
  onBookingCreated,
}: OperationsDrawerProps) {
  const { onDoubleClickBooking: onOpenDetail } = useTimelineCallbacks()
  const isOpen = mode !== null

  return (
    <div
      className={cn(
        'shrink-0 h-full border-l border-border-soft bg-card overflow-hidden transition-[width] duration-220 ease-in-out',
      )}
      style={{ width: isOpen ? DRAWER_WIDTH : 0 }}
    >
      <div
        className="h-full overflow-hidden"
        style={{ width: DRAWER_WIDTH }}
      >
        {mode === 'booking-detail' && selectedBooking && (
          <BookingDetailContent
            key={selectedBooking.booking.booking_id + selectedBooking.booking.room_stay_id}
            selected={selectedBooking}
            onClose={onClose}
            onOpenDetail={onOpenDetail}
          />
        )}

        {mode === 'create-booking' && createBookingPrefill && (
          <InlineCreateBookingForm
            key={`${createBookingPrefill.roomId}-${createBookingPrefill.checkIn}`}
            prefill={createBookingPrefill}
            onClose={onClose}
            onBookingCreated={onBookingCreated}
          />
        )}

        {mode === 'ops' && (
          <OpsContent onClose={onClose} />
        )}
      </div>
    </div>
  )
})
