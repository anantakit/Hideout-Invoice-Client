import { ChevronDown, LogIn, CheckCircle2 } from 'lucide-react'
import { cn } from '@/shared/utils'
import { Badge } from '@/shared/ui/badge'
import type { CheckinBooking } from '../utils/operationTypes'
import { SingleRoomCheckInCard } from './SingleRoomCheckInCard'
import { MultiRoomCheckInCard } from './MultiRoomCheckInCard'

// ─── Props ────────────────────────────────────────────────────────────────────

interface CheckInSectionProps {
  checkins: CheckinBooking[]
  doneCheckins: CheckinBooking[]
  checkinDone: number
  checkinTotal: number
  viewingToday: boolean
  show: boolean
  onToggle: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckInSection({
  checkins,
  doneCheckins,
  checkinDone,
  checkinTotal,
  viewingToday,
  show,
  onToggle,
}: CheckInSectionProps) {
  if (checkins.length === 0 && doneCheckins.length === 0) return null

  return (
    <div className="p-4 space-y-2 border-b border-border">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
      >
        <span className="text-label text-primary flex items-center space-inline">
          <LogIn className="w-3 h-3" />
          เช็คอิน{viewingToday ? 'วันนี้' : ''}
          <Badge variant="default" className="tabular-nums ml-0.5 text-micro px-1.5 py-0">
            {checkinDone}/{checkinTotal}
          </Badge>
        </span>
        <ChevronDown className={cn(
          'w-3.5 h-3.5 text-primary/50 transition-transform',
          show && 'rotate-180',
        )} />
      </button>

      {show && (
        <>
          {checkins.map((ci) => {
            const isSingleRoom = ci.totalStays === 1
            if (isSingleRoom) {
              return <SingleRoomCheckInCard key={ci.bookingId} ci={ci} />
            }
            return <MultiRoomCheckInCard key={ci.bookingId} ci={ci} />
          })}

          {/* Already checked-in bookings — shown inline */}
          {doneCheckins.map((ci) => (
            <div
              key={ci.bookingId}
              className="w-full radius-card border border-success/20 bg-success/5 space-card opacity-60"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-inline min-w-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                  <span className="text-body font-semibold truncate">{ci.guestName}</span>
                </div>
                <span className="text-helper text-success/80 shrink-0">เข้าพักแล้ว</span>
              </div>
              {ci.assignedRooms.length > 0 && (
                <p className="text-helper mt-1">ห้อง {ci.assignedRooms.join(', ')}</p>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
