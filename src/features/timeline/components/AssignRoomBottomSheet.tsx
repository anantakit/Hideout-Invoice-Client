import React from 'react'
import { Loader2, Check, CheckCircle2, ArrowRightLeft, Phone, ExternalLink, LogIn } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/shared/ui/sheet'
import { Button } from '@/shared/ui/button'
import { ConfirmActionCard } from '@/shared/ui/confirm-action-card'
import { DepositBadge } from '@/features/bookings/shared/components/DepositBadge'
import { fmtShortISO } from '@/shared/utils'
import { cn } from '@/shared/utils'
import { useNavigate } from 'react-router-dom'
import { useAssignRoom } from '../hooks/useAssignRoom'
import { RoomPickerGrid } from './RoomPickerGrid'
import { AssignConfirmDialog } from './AssignConfirmDialog'

// ── Props ────────────────────────────────────────────────────────────────────

export interface CheckInBottomSheetProps {
  bookingId: string | null
  onClose: () => void
}

// ── Component ────────────────────────────────────────────────────────────────

const CheckInBottomSheet = React.memo(function CheckInBottomSheet({
  bookingId,
  onClose,
}: CheckInBottomSheetProps) {
  const navigate = useNavigate()
  const isOpen = bookingId !== null
  const safeId = bookingId ?? ''

  const {
    booking,
    isLoading,
    isBusy,
    availLoading,
    unassignedStays,
    assignedStays,
    checkedInStays,
    totalActive,
    totalAssigned,
    remainingCount,
    ciDate,
    coDate,
    nights,
    isCheckInDay,
    roomsByType,
    totalAvailableRooms,
    transferringStay,
    setTransferringStay,
    transferRoomGroups,
    currentTypePrice,
    checkingInAll,
    confirmCheckInAll,
    setConfirmCheckInAll,
    allAssigned,
    progressPct,
    busyStayId,
    checkInMutation,
    unassignMutation,
    handleAssign,
    handleReassign,
    handleCheckInOne,
    handleCheckInAll,
    handleTransferPick,
  } = useAssignRoom(safeId, isOpen)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) { setTransferringStay(null); onClose() } }}>
      <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-0 flex flex-col sheet-mobile">
        {/* ═══════ Header ═══════ */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <SheetTitle className="text-base font-semibold tracking-tight text-left">
            {booking?.guest_name ?? '...'}
          </SheetTitle>
          <SheetDescription asChild>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-body text-muted-foreground">
                {ciDate && coDate && (
                  <span>{fmtShortISO(ciDate)} → {fmtShortISO(coDate)} ({nights} คืน)</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {booking?.guest_phone && (
                  <a
                    href={`tel:${booking.guest_phone}`}
                    className="flex items-center gap-1.5 text-body text-primary active:opacity-70"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {booking.guest_phone}
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 h-auto p-0 text-body text-muted-foreground hover:text-foreground"
                  onClick={() => { onClose(); navigate(`/bookings/${safeId}`) }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  รายละเอียด
                </Button>
              </div>
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 pt-0 pb-8 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* ═══════ Progress + Deposit + Check-in All ═══════ */}
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 h-1.5 radius-badge bg-muted overflow-hidden">
                    <div
                      className="h-full radius-badge bg-success transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="text-helper tabular-nums shrink-0">
                    {totalAssigned}/{totalActive}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {booking && <DepositBadge booking={booking} />}
                  </div>
                  {isCheckInDay && assignedStays.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs h-auto py-1 px-2 text-primary hover:text-primary/80 shrink-0"
                      disabled={isBusy}
                      onClick={() => setConfirmCheckInAll(true)}
                    >
                      {checkingInAll ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={12} />
                      )}
                      เช็คอินทั้งหมด
                    </Button>
                  )}
                </div>
              </div>

              {/* ═══════ Room Picker (Assign + Transfer) ═══════ */}
              <RoomPickerGrid
                remainingCount={remainingCount}
                roomsByType={roomsByType}
                unassignedStays={unassignedStays}
                totalAvailableRooms={totalAvailableRooms}
                availLoading={availLoading}
                isBusy={isBusy}
                transferringStay={transferringStay}
                transferRoomGroups={transferRoomGroups}
                currentTypePrice={currentTypePrice}
                onAssign={handleAssign}
                onTransferPick={handleTransferPick}
                onTransferCancel={() => setTransferringStay(null)}
              />

              {/* ═══════ Assigned + Checked-in Stays ═══════ */}
              {(assignedStays.length > 0 || checkedInStays.length > 0) && (
                <div className="space-y-1.5">
                  {assignedStays.map((stay) => (
                    <div key={stay.id} className="flex items-center gap-1">
                      <ConfirmActionCard
                        disabled={!isCheckInDay || isBusy}
                        loading={busyStayId === stay.id && checkInMutation.isPending}
                        loader={<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        icon={isCheckInDay ? <LogIn className="w-4 h-4 text-primary" /> : undefined}
                        confirmTitle="ยืนยันเช็คอิน"
                        confirmDescription={`เช็คอิน ห้อง ${stay.room_number} ?`}
                        confirmLabel="เช็คอิน"
                        onConfirm={() => handleCheckInOne(stay)}
                        className="flex-1"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Check className="w-4 h-4 text-success shrink-0" />
                          <span className="text-body font-bold tabular-nums">ห้อง {stay.room_number}</span>
                          <span className="text-helper">{stay.room_type_name}</span>
                        </div>
                      </ConfirmActionCard>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isBusy}
                        onClick={() => handleReassign(stay)}
                        className="shrink-0 text-muted-foreground/60"
                        title="เปลี่ยนห้อง"
                      >
                        {busyStayId === stay.id && unassignMutation.isPending
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <ArrowRightLeft className="w-4 h-4" />}
                      </Button>
                    </div>
                  ))}

                  {checkedInStays.map((stay) => {
                    const isTransferring = transferringStay?.id === stay.id
                    return (
                      <div
                        key={stay.id}
                        className={cn(
                          'flex items-center justify-between radius-card border px-3 py-2.5',
                          isTransferring
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border bg-card',
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                          <span className="text-body font-bold tabular-nums">ห้อง {stay.room_number}</span>
                          <span className="text-helper text-success/80">เข้าพัก</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isBusy}
                          onClick={() => setTransferringStay(isTransferring ? null : stay)}
                          className="shrink-0 text-muted-foreground/60"
                          title="ย้ายห้อง"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ═══════ Check-in info / All done ═══════ */}
              {assignedStays.length > 0 && !isCheckInDay && (
                <div className="radius-card border border-info/30 bg-info-muted px-4 py-3 text-center">
                  <p className="text-body text-info-muted-foreground">
                    เช็คอินได้วันที่ {fmtShortISO(ciDate)}
                  </p>
                </div>
              )}

              {allAssigned && checkedInStays.length === 0 && assignedStays.length === 0 && (
                <div className="text-center py-6">
                  <Check className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="text-body text-muted-foreground">เช็คอินครบทุกห้องแล้ว</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ═══════ Batch Check-in Confirmation ═══════ */}
        <AssignConfirmDialog
          open={confirmCheckInAll}
          count={assignedStays.length}
          onConfirm={handleCheckInAll}
          onClose={() => setConfirmCheckInAll(false)}
        />
      </SheetContent>
    </Sheet>
  )
})

export default CheckInBottomSheet
