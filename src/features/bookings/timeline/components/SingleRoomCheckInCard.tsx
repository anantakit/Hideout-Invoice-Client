import { LogIn, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { todayISO, formatTHBCurrency } from '@/shared/utils'
import { ConfirmActionCard } from '@/shared/ui/confirm-action-card'
import { useCheckInRooms, useBooking } from '../../hooks'
import type { CheckinBooking } from '../utils/operationTypes'

export function SingleRoomCheckInCard({ ci }: { ci: CheckinBooking }) {
  const checkInMutation = useCheckInRooms(ci.bookingId)
  const { data: fullBooking } = useBooking(ci.bookingId)
  const keyDeposit = fullBooking?.key_deposit_amount ?? 0
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

  const statusIndicator = !canCheckIn ? (
    <div className="shrink-0">
      {needsAssign
        ? <span className="text-helper text-warning">รอกำหนดห้อง</span>
        : <span className="text-helper">รอเช็คอิน</span>}
    </div>
  ) : null

  return (
    <>
      <ConfirmActionCard
        disabled={!canCheckIn || checkInMutation.isPending}
        loading={checkInMutation.isPending}
        loader={<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        icon={<LogIn className="w-4 h-4 text-primary" />}
        confirmTitle="ยืนยันเช็คอิน"
        confirmDescription={`เช็คอิน ${ci.guestName} ห้อง ${ci.assignedRooms[0]} ?`}
        confirmLabel="เช็คอิน"
        onConfirm={handleCheckIn}
        className="space-card"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-body font-semibold truncate">{ci.guestName}</span>
              <span className="text-helper shrink-0">{ci.nights} คืน</span>
            </div>
            <div className="flex items-center space-inline text-helper mt-0.5">
              <span>{ci.typeName}</span>
              {hasRoom && (
                <>
                  <span>·</span>
                  <span className="font-medium text-foreground/70">ห้อง {ci.assignedRooms[0]}</span>
                </>
              )}
            </div>
          </div>
          {statusIndicator}
        </div>
        {/* Key deposit status */}
        {fullBooking && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {keyDeposit > 0 ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
                <span className="text-xs font-medium text-success">
                  ประกัน {formatTHBCurrency(keyDeposit)}
                </span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-warning shrink-0" />
                <span className="text-xs font-medium text-warning">
                  เก็บประกัน {formatTHBCurrency(ci.totalStays * 200)}
                </span>
              </>
            )}
          </div>
        )}
      </ConfirmActionCard>
    </>
  )
}
