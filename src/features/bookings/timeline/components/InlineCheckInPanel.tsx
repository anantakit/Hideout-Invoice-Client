import { useState, useMemo } from 'react'
import { LogIn, Loader2, CheckCircle2, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, todayISO, fmtShortISO } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogFooter, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/shared/ui/alert-dialog'
import { ConfirmActionCard } from '@/shared/ui/confirm-action-card'
import type { RoomStayResponse } from '../../types'
import { useBooking, useAvailabilityGrouped, useAssignRooms, useCheckInRooms } from '../../hooks'

export function InlineCheckInPanel({
  bookingId,
  onDone,
}: {
  bookingId: string
  onDone: () => void
}) {
  const { data: booking, isLoading: bookingLoading } = useBooking(bookingId)
  const assignMutation = useAssignRooms(bookingId)
  const checkInMutation = useCheckInRooms(bookingId)
  const [busyStayId, setBusyStayId] = useState<string | null>(null)
  const [checkingInAll, setCheckingInAll] = useState(false)

  const today = todayISO()

  const { unassignedStays, assignedStays, checkedInStays, totalActive } = useMemo<{
    unassignedStays: RoomStayResponse[]
    assignedStays: RoomStayResponse[]
    checkedInStays: RoomStayResponse[]
    totalActive: number
  }>(() => {
    if (!booking) return { unassignedStays: [], assignedStays: [], checkedInStays: [], totalActive: 0 }
    const active = booking.room_stays.filter((s) => s.status !== 'CANCELLED' && s.status !== 'CHECKED_OUT')
    return {
      unassignedStays: active.filter((s) => s.status === 'RESERVED' && !s.room_id),
      assignedStays: active.filter((s) => (s.status === 'RESERVED' || s.status === 'ASSIGNED') && s.room_id),
      checkedInStays: active.filter((s) => s.status === 'CHECKED_IN'),
      totalActive: active.length,
    }
  }, [booking])

  const ciDate = (unassignedStays[0] ?? assignedStays[0] ?? checkedInStays[0])?.check_in?.slice(0, 10) ?? ''
  const coDate = (unassignedStays[0] ?? assignedStays[0] ?? checkedInStays[0])?.check_out?.slice(0, 10) ?? ''
  const isCheckInDay = ciDate <= today

  const { data: availability, isLoading: availLoading } = useAvailabilityGrouped(
    ciDate, coDate, unassignedStays.length > 0 && Boolean(ciDate && coDate), bookingId,
  )

  const assignedRoomIds = useMemo(() => {
    if (!booking) return new Set<string>()
    return new Set(booking.room_stays.filter((s: RoomStayResponse) => s.room_id).map((s: RoomStayResponse) => s.room_id!))
  }, [booking])

  const neededTypeIds = useMemo(
    () => new Set(unassignedStays.map((s) => s.room_type_id)),
    [unassignedStays],
  )

  const roomsByType = useMemo(() => {
    if (!availability) return []
    return availability.room_types
      .filter((rt) => neededTypeIds.has(rt.room_type_id))
      .map((rt) => ({
        typeId: rt.room_type_id,
        typeName: rt.room_type_name,
        rooms: rt.rooms.filter((r) => r.available && !assignedRoomIds.has(r.room_id)),
      }))
      .filter((rt) => rt.rooms.length > 0)
  }, [availability, neededTypeIds, assignedRoomIds])

  const isBusy = assignMutation.isPending || checkInMutation.isPending

  const handleAssign = async (roomTypeId: string, roomId: string, roomNumber: string) => {
    const stay = unassignedStays.find((s) => s.room_type_id === roomTypeId)
    if (!stay) return
    setBusyStayId(stay.id)
    try {
      await assignMutation.mutateAsync([{ room_stay_id: stay.id, room_id: roomId }])
      toast.success(`กำหนดห้อง ${roomNumber} แล้ว`)
    } catch (err) {
      toast.error((err as Error).message || 'เกิดข้อผิดพลาด')
    } finally {
      setBusyStayId(null)
    }
  }

  const handleCheckInOne = async (stayId: string, roomId: string) => {
    setBusyStayId(stayId)
    try {
      await checkInMutation.mutateAsync([{ room_stay_id: stayId, room_id: roomId }])
      toast.success('เช็คอินสำเร็จ')
      if (assignedStays.length <= 1 && unassignedStays.length === 0) onDone()
    } catch (err) {
      toast.error((err as Error).message || 'เกิดข้อผิดพลาด')
    } finally {
      setBusyStayId(null)
    }
  }

  const handleCheckInAll = async () => {
    if (assignedStays.length === 0) return
    setCheckingInAll(true)
    try {
      await checkInMutation.mutateAsync(
        assignedStays.map((s) => ({ room_stay_id: s.id, room_id: s.room_id! })),
      )
      toast.success('เช็คอินทั้งหมดสำเร็จ')
      if (unassignedStays.length === 0) onDone()
    } catch (err) {
      toast.error((err as Error).message || 'เกิดข้อผิดพลาด')
    } finally {
      setCheckingInAll(false)
    }
  }

  const isLoading = bookingLoading

  return (
    <div className="radius-card rounded-t-none border border-t-0 border-border bg-card space-card space-y-3">
      {isLoading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Progress header + check-in all inline — only for multi-room */}
          {totalActive > 1 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-helper font-medium shrink-0">
                  เช็คอิน {checkedInStays.length}/{totalActive} ห้อง
                </span>
                <div className="flex-1 max-w-[6rem] h-1.5 radius-badge bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full radius-badge transition-all duration-300',
                      checkedInStays.length === totalActive ? 'bg-success' : 'bg-primary',
                    )}
                    style={{ width: `${Math.round((checkedInStays.length / totalActive) * 100)}%` }}
                  />
                </div>
              </div>
              {isCheckInDay && assignedStays.length > 1 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs h-auto py-1 px-2 text-primary hover:text-primary/80"
                      disabled={isBusy}
                    >
                      {checkingInAll ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <LogIn size={12} />
                      )}
                      เช็คอินทั้งหมด
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>ยืนยันเช็คอินทั้งหมด</AlertDialogTitle>
                      <AlertDialogDescription>
                        เช็คอินห้อง {assignedStays.map((s) => s.room_number).join(', ')} ({assignedStays.length} ห้อง) พร้อมกัน
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCheckInAll}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        เช็คอินทั้งหมด
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}

          {/* Assigned rooms — tappable rows for check-in */}
          {assignedStays.length > 0 && (
            <div className="space-y-1.5">
              {assignedStays.map((stay) => (
                <ConfirmActionCard
                  key={stay.id}
                  disabled={!isCheckInDay || isBusy}
                  loading={busyStayId === stay.id && checkInMutation.isPending}
                  loader={<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  icon={isCheckInDay ? <LogIn className="w-4 h-4 text-primary" /> : undefined}
                  confirmTitle="ยืนยันเช็คอิน"
                  confirmDescription={`เช็คอิน ห้อง ${stay.room_number} ?`}
                  confirmLabel="เช็คอิน"
                  onConfirm={() => { if (stay.room_id) handleCheckInOne(stay.id, stay.room_id) }}
                  className="radius-button px-3 py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-inline min-w-0">
                      <KeyRound className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-body font-bold tabular-nums">ห้อง {stay.room_number}</span>
                      <span className="text-helper">{stay.room_type_name}</span>
                    </div>
                    {!isCheckInDay && (
                      <span className="text-helper shrink-0">รอเช็คอิน</span>
                    )}
                  </div>
                </ConfirmActionCard>
              ))}
            </div>
          )}

          {/* Checked-in rooms */}
          {checkedInStays.length > 0 && (
            <div className="space-y-1.5">
              {checkedInStays.map((stay) => (
                <div
                  key={stay.id}
                  className="flex items-center space-inline radius-button border border-success/20 bg-success/5 px-3 py-2.5 opacity-75"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                  <span className="text-body font-bold tabular-nums">ห้อง {stay.room_number}</span>
                  <span className="text-helper text-success/80">เข้าพักแล้ว</span>
                </div>
              ))}
            </div>
          )}

          {/* Unassigned — room picker */}
          {unassignedStays.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-helper text-warning font-medium">
                เหลืออีก {unassignedStays.length} ห้อง — เลือกห้อง
              </p>
              {availLoading ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : roomsByType.length === 0 ? (
                <p className="text-helper text-destructive text-center py-2">ไม่มีห้องว่างในประเภทนี้</p>
              ) : (
                roomsByType.map((rt) => (
                  <div key={rt.typeId} className="space-list">
                    {roomsByType.length > 1 && (
                      <p className="text-helper">{rt.typeName}</p>
                    )}
                    <div className="flex flex-wrap space-inline">
                      {rt.rooms.map((room) => {
                        const stayForType = unassignedStays.find((s) => s.room_type_id === rt.typeId)
                        const isBusyRoom = busyStayId === stayForType?.id
                        return (
                          <button
                            key={room.room_id}
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleAssign(rt.typeId, room.room_id, room.room_number)}
                            className={cn(
                              'h-9 min-w-[3.5rem] px-3 radius-button border text-body font-bold tabular-nums transition-colors',
                              'border-border bg-card hover:bg-accent/10',
                              'disabled:opacity-50',
                            )}
                          >
                            {isBusyRoom && isBusy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                            ) : (
                              room.room_number
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Not check-in day notice */}
          {!isCheckInDay && assignedStays.length > 0 && (
            <p className="text-helper text-center py-1">
              เช็คอินได้วันที่ {fmtShortISO(ciDate)}
            </p>
          )}

          {/* Check-in all is now inline with progress header above */}

          {/* All done */}
          {totalActive > 0 && unassignedStays.length === 0 && assignedStays.length === 0 && (
            <div className="text-center py-2">
              <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-1" />
              <p className="text-helper text-success">เช็คอินครบทุกห้องแล้ว</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
