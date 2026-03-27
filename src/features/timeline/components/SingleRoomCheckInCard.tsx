import { memo, useState } from 'react'
import { LogIn, Loader2, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, todayISO } from '@/shared/utils'
import { CardButton } from '@/shared/ui/card-button'
import { ConfirmActionCard } from '@/shared/ui/confirm-action-card'
import { useCheckInRooms } from '@/features/bookings/hooks'
import { formatNightsLabel, type CheckinBooking } from '../utils/operationTypes'
import { InlineCheckInPanel } from './InlineCheckInPanel'
import { CollectSummary } from './CollectSummary'

export const SingleRoomCheckInCard = memo(function SingleRoomCheckInCard({ ci }: { ci: CheckinBooking }) {
  const [expanded, setExpanded] = useState(false)
  const checkInMutation = useCheckInRooms(ci.bookingId)
  const today = todayISO()

  const ciDate = ci.booking?.check_in?.slice(0, 10) ?? ''
  const isCheckInDay = ciDate <= today

  const handleCheckIn = async () => {
    if (!ci.roomStayId || !ci.roomId) return
    try {
      await checkInMutation.mutateAsync([{ room_stay_id: ci.roomStayId, room_id: ci.roomId }])
      toast.success('เช็คอินสำเร็จ')
    } catch (err) {
      toast.error((err as Error).message || 'เกิดข้อผิดพลาด')
    }
  }

  const hasRoom = ci.assignedRooms.length > 0
  const needsAssign = ci.unassignedCount > 0
  const canCheckIn = hasRoom && isCheckInDay && !needsAssign && Boolean(ci.roomStayId && ci.roomId)

  const depositLine = ci.booking && <CollectSummary booking={ci.booking} className="mt-1.5" />

  // ── Needs room assignment — expandable card with InlineCheckInPanel ──
  if (needsAssign) {
    return (
      <div>
        <CardButton
          onClick={() => setExpanded((v) => !v)}
          padding="card"
          className={cn(
            'border',
            expanded
              ? 'border-border bg-card rounded-b-none'
              : 'border-border bg-card hover:bg-accent/10',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-body font-semibold truncate">{ci.guestName}</span>
            <span className="text-helper shrink-0">1 ห้อง · {formatNightsLabel(ci)}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center space-inline text-helper">
              <span>{ci.typeName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-helper text-warning">รอกำหนดห้อง</span>
              <ChevronDown className={cn(
                'w-3.5 h-3.5 text-muted-foreground/50 transition-transform shrink-0',
                expanded && 'rotate-180',
              )} />
            </div>
          </div>
          {depositLine}
        </CardButton>

        {expanded && (
          <InlineCheckInPanel
            bookingId={ci.bookingId}
            onDone={() => setExpanded(false)}
          />
        )}
      </div>
    )
  }

  // ── Has room assigned — direct check-in action card ──
  const statusIndicator = !canCheckIn ? (
    <div className="shrink-0">
      <span className="text-helper">รอเช็คอิน</span>
    </div>
  ) : null

  return (
    <ConfirmActionCard
      disabled={!canCheckIn || checkInMutation.isPending}
      loading={checkInMutation.isPending}
      loader={<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      confirmTitle="ยืนยันเช็คอิน"
      confirmDescription={`เช็คอิน ${ci.guestName} ห้อง ${ci.assignedRooms[0]} ?`}
      confirmLabel="เช็คอิน"
      onConfirm={handleCheckIn}
      className="space-card"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-body font-semibold truncate">{ci.guestName}</span>
        <span className="text-helper shrink-0">1 ห้อง · {formatNightsLabel(ci)}</span>
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <div className="flex items-center space-inline text-helper">
          <span>{ci.typeName}</span>
          {hasRoom && (
            <>
              <span>·</span>
              <span className="font-medium text-foreground/70">ห้อง {ci.assignedRooms[0]}</span>
            </>
          )}
        </div>
        {checkInMutation.isPending
          ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
          : canCheckIn
            ? <LogIn className="w-4 h-4 text-primary shrink-0" />
            : statusIndicator}
      </div>
      {depositLine}
    </ConfirmActionCard>
  )
})
