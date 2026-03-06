import React, { useState, useMemo, useRef, useCallback } from 'react'
import { parseISO, differenceInDays } from 'date-fns'
import { Loader2, Check, CheckCircle2, RefreshCw, ArrowRightLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/shared/ui/sheet'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import {
  useBooking,
  useAvailabilityGrouped,
  useAssignRooms,
  useCheckInRooms,
  useUnassignRoom,
  useTransferRoom,
} from '../../hooks'
import type { RoomStayResponse } from '../../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

function fmtShortISO(iso: string): string {
  try {
    const d = parseISO(iso)
    return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`
  } catch { return iso }
}

const UNDO_TIMEOUT_MS = 4000

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CheckInBottomSheetProps {
  bookingId: string | null
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

const CheckInBottomSheet = React.memo(function CheckInBottomSheet({
  bookingId,
  onClose,
}: CheckInBottomSheetProps) {
  const isOpen = bookingId !== null
  const safeId = bookingId ?? ''

  const { data: booking, isLoading: bookingLoading } = useBooking(safeId)
  const assignMutation = useAssignRooms(safeId)
  const unassignMutation = useUnassignRoom(safeId)
  const checkInMutation = useCheckInRooms(safeId)
  const transferMutation = useTransferRoom(safeId)
  const [busyStayId, setBusyStayId] = useState<string | null>(null)
  const [checkingInAll, setCheckingInAll] = useState(false)
  // transferringStay: the CHECKED_IN stay being transferred — shows room picker
  const [transferringStay, setTransferringStay] = useState<RoomStayResponse | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Categorize stays ────────────────────────────────────────────────────
  const { unassignedStays, assignedStays, checkedInStays, checkedInCount, totalActive } = useMemo(() => {
    if (!booking) return { unassignedStays: [] as RoomStayResponse[], assignedStays: [] as RoomStayResponse[], checkedInStays: [] as RoomStayResponse[], checkedInCount: 0, totalActive: 0 }

    const active = booking.room_stays.filter((s) => s.status !== 'CANCELLED')
    const unassigned = active.filter((s) => s.status === 'RESERVED' && !s.room_id)
    const assigned = active.filter((s) => (s.status === 'RESERVED' || s.status === 'ASSIGNED') && s.room_id)
    const checkedIn = active.filter((s) => s.status === 'CHECKED_IN')
    const doneCount = active.filter((s) => s.status === 'CHECKED_IN' || s.status === 'CHECKED_OUT').length

    return { unassignedStays: unassigned, assignedStays: assigned, checkedInStays: checkedIn, checkedInCount: doneCount, totalActive: active.length }
  }, [booking])

  const pendingCount = unassignedStays.length + assignedStays.length
  const allDone = pendingCount === 0 && totalActive > 0

  // ── Availability query ──────────────────────────────────────────────────
  // Use transferring stay's dates when in transfer mode, otherwise pending stays
  const needsAvailability = unassignedStays.length > 0 || transferringStay !== null
  const availStay = transferringStay ?? unassignedStays[0] ?? assignedStays[0]
  const ciDate = availStay?.check_in?.slice(0, 10) ?? ''
  const coDate = availStay?.check_out?.slice(0, 10) ?? ''

  const { data: availability, isLoading: availLoading } = useAvailabilityGrouped(
    ciDate, coDate,
    isOpen && needsAvailability,
    safeId,
  )

  // Already-assigned room IDs (exclude from available list)
  const assignedRoomIds = useMemo(() => {
    if (!booking) return new Set<string>()
    return new Set(booking.room_stays.filter((s) => s.room_id).map((s) => s.room_id!))
  }, [booking])

  // Available rooms grouped by type
  const roomsByType = useMemo(() => {
    if (!availability) return new Map<string, { room_id: string; room_number: string; room_type_name: string }[]>()
    const map = new Map<string, { room_id: string; room_number: string; room_type_name: string }[]>()
    for (const rt of availability.room_types) {
      const rooms = rt.rooms
        .filter((r) => r.available && !assignedRoomIds.has(r.room_id))
        .map((r) => ({ room_id: r.room_id, room_number: r.room_number, room_type_name: rt.room_type_name }))
      if (rooms.length > 0) {
        map.set(rt.room_type_id, rooms)
      }
    }
    return map
  }, [availability, assignedRoomIds])

  const totalAvailableRooms = useMemo(
    () => Array.from(roomsByType.values()).reduce((sum, rooms) => sum + rooms.length, 0),
    [roomsByType],
  )

  // ── Undo helper ─────────────────────────────────────────────────────────
  const doUnassign = useCallback(async (stayId: string) => {
    try {
      await unassignMutation.mutateAsync(stayId)
    } catch {
      // silently fail undo
    }
  }, [unassignMutation])

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleAssign = async (roomTypeId: string, roomId: string, roomNumber: string) => {
    const stay = unassignedStays.find((s) => s.room_type_id === roomTypeId)
    if (!stay) return
    setBusyStayId(stay.id)
    try {
      await assignMutation.mutateAsync([{ room_stay_id: stay.id, room_id: roomId }])

      const stayId = stay.id
      const toastId = toast.success(
        (t) => (
          <div className="flex items-center gap-3">
            <span className="text-sm">กำหนดห้อง {roomNumber} แล้ว</span>
            <button
              type="button"
              className="text-xs font-semibold text-primary underline shrink-0"
              onClick={() => {
                toast.dismiss(t.id)
                if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
                doUnassign(stayId)
              }}
            >
              เลิกทำ
            </button>
          </div>
        ),
        { duration: UNDO_TIMEOUT_MS },
      )

      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
      undoTimerRef.current = setTimeout(() => {
        toast.dismiss(toastId)
        undoTimerRef.current = null
      }, UNDO_TIMEOUT_MS)
    } catch (err) {
      toast.error((err as Error).message || 'เกิดข้อผิดพลาด')
    } finally {
      setBusyStayId(null)
    }
  }

  const handleReassign = async (stay: RoomStayResponse) => {
    setBusyStayId(stay.id)
    try {
      await unassignMutation.mutateAsync(stay.id)
      toast.success(`ยกเลิกห้อง ${stay.room_number} — เลือกห้องใหม่ได้`)
    } catch (err) {
      toast.error((err as Error).message || 'เกิดข้อผิดพลาด')
    } finally {
      setBusyStayId(null)
    }
  }

  const handleCheckInOne = async (stay: RoomStayResponse) => {
    if (!stay.room_id) return
    setBusyStayId(stay.id)
    try {
      await checkInMutation.mutateAsync([{ room_stay_id: stay.id, room_id: stay.room_id }])
      toast.success('เช็คอินสำเร็จ')
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
      const stays = assignedStays.map((s) => ({ room_stay_id: s.id, room_id: s.room_id! }))
      await checkInMutation.mutateAsync(stays)
      toast.success('เช็คอินทั้งหมดสำเร็จ')
    } catch (err) {
      toast.error((err as Error).message || 'เกิดข้อผิดพลาด')
    } finally {
      setCheckingInAll(false)
    }
  }

  // Transfer: pick a new room for a CHECKED_IN stay
  const handleTransferPick = async (roomId: string, roomNumber: string) => {
    if (!transferringStay) return
    setBusyStayId(transferringStay.id)
    try {
      await transferMutation.mutateAsync({ stayId: transferringStay.id, roomId })
      toast.success(`ย้ายไปห้อง ${roomNumber} เรียบร้อย`)
      setTransferringStay(null)
    } catch (err) {
      toast.error((err as Error).message || 'เกิดข้อผิดพลาด')
    } finally {
      setBusyStayId(null)
    }
  }

  const isBusy = assignMutation.isPending || checkInMutation.isPending || unassignMutation.isPending || transferMutation.isPending
  const isLoading = bookingLoading
  const nights = ciDate && coDate ? differenceInDays(parseISO(coDate), parseISO(ciDate)) : 0

  // When transferring, filter rooms to the same type as the transferring stay
  const transferRooms = transferringStay
    ? (roomsByType.get(transferringStay.room_type_id) ?? [])
    : []

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) { setTransferringStay(null); onClose() } }}>
      <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-0 flex flex-col max-h-[85vh]">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <SheetTitle className="text-base font-semibold tracking-tight text-left">
            {booking?.guest_name ?? 'Loading...'}
          </SheetTitle>
          <SheetDescription asChild>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {ciDate && coDate && (
                <span>{fmtShortISO(ciDate)} → {fmtShortISO(coDate)} ({nights} คืน)</span>
              )}
              {totalActive > 0 && (
                <Badge
                  variant={allDone ? 'green' : 'amber'}
                  className="text-[10px] px-1.5 py-0"
                >
                  {checkedInCount}/{totalActive} เช็คอิน
                </Badge>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-8 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* ════════════════════════════════════════════════════════
                  Transfer room picker — shown when a CHECKED_IN stay
                  is being transferred
                  ════════════════════════════════════════════════════════ */}
              {transferringStay && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      เปลี่ยนห้องจาก {transferringStay.room_number}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={() => setTransferringStay(null)}
                    >
                      ยกเลิก
                    </Button>
                  </div>

                  {availLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : transferRooms.length === 0 ? (
                    <p className="text-xs text-destructive text-center py-3">ไม่มีห้องว่างในประเภทนี้</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5">
                      {transferRooms.map((room) => (
                        <button
                          key={room.room_id}
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleTransferPick(room.room_id, room.room_number)}
                          className="flex flex-col items-center justify-center rounded-xl border border-primary/30 bg-primary/5 px-2 py-3 text-center active:bg-primary/10 transition-colors disabled:opacity-50"
                        >
                          <span className="text-base font-bold tabular-nums">{room.room_number}</span>
                          <span className="text-[10px] text-primary mt-0.5">ย้ายมาที่นี่</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <Separator className="my-2" />
                </div>
              )}

              {/* ════════════════════════════════════════════════════════
                  Section: Assigned — ready to check in
                  ════════════════════════════════════════════════════════ */}
              {assignedStays.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    พร้อมเช็คอิน ({assignedStays.length})
                  </p>
                  {assignedStays.map((stay) => (
                    <div
                      key={stay.id}
                      className="flex items-center justify-between rounded-xl border border-success/30 bg-success/5 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-bold tabular-nums">ห้อง {stay.room_number}</span>
                        <span className="text-[11px] text-muted-foreground ml-2">{stay.room_type_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          disabled={isBusy}
                          onClick={() => handleReassign(stay)}
                          title="เปลี่ยนห้อง"
                        >
                          {busyStayId === stay.id && unassignMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs"
                          disabled={isBusy}
                          onClick={() => handleCheckInOne(stay)}
                        >
                          {busyStayId === stay.id && checkInMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            'Check-in'
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}

                  {assignedStays.length > 1 && (
                    <Button
                      className="w-full"
                      disabled={isBusy}
                      onClick={handleCheckInAll}
                    >
                      {checkingInAll ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      เช็คอินทั้งหมด ({assignedStays.length} ห้อง)
                    </Button>
                  )}

                  {(unassignedStays.length > 0 || checkedInStays.length > 0) && <Separator className="my-2" />}
                </div>
              )}

              {/* ════════════════════════════════════════════════════════
                  Section: Available rooms — assign to pending stays
                  ════════════════════════════════════════════════════════ */}
              {unassignedStays.length > 0 && !transferringStay && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    เลือกห้อง ({unassignedStays.length} ห้องรอกำหนด)
                  </p>

                  {availLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {Array.from(roomsByType.entries()).map(([typeId, rooms]) => {
                        const hasUnassigned = unassignedStays.some((s) => s.room_type_id === typeId)
                        if (!hasUnassigned) return null

                        return (
                          <div key={typeId}>
                            {roomsByType.size > 1 && (
                              <p className="text-xs font-medium text-muted-foreground mb-1.5">{rooms[0]?.room_type_name}</p>
                            )}
                            <div className="grid grid-cols-3 gap-1.5">
                              {rooms.map((room) => (
                                <button
                                  key={room.room_id}
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleAssign(typeId, room.room_id, room.room_number)}
                                  className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-2 py-3 text-center active:bg-accent/10 transition-colors disabled:opacity-50"
                                >
                                  <span className="text-base font-bold tabular-nums">{room.room_number}</span>
                                  <span className="text-[10px] text-muted-foreground mt-0.5">Assign</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}

                      {totalAvailableRooms === 0 && (
                        <p className="text-xs text-destructive text-center py-3">ไม่มีห้องว่างในประเภทนี้</p>
                      )}
                    </>
                  )}

                  {checkedInStays.length > 0 && <Separator className="my-2" />}
                </div>
              )}

              {/* ════════════════════════════════════════════════════════
                  Section: Checked-in stays — with transfer option
                  ════════════════════════════════════════════════════════ */}
              {checkedInStays.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    เช็คอินแล้ว ({checkedInStays.length})
                  </p>
                  {checkedInStays.map((stay) => {
                    const isTransferring = transferringStay?.id === stay.id
                    return (
                      <div
                        key={stay.id}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
                          isTransferring
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border bg-card'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-sm font-bold tabular-nums">ห้อง {stay.room_number}</span>
                          <span className="text-[11px] text-muted-foreground ml-2">{stay.room_type_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="green" className="text-[9px] px-1.5 py-0">เข้าพัก</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                            disabled={isBusy}
                            onClick={() => setTransferringStay(isTransferring ? null : stay)}
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            เปลี่ยนห้อง
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* All done state */}
              {allDone && checkedInStays.length === 0 && (
                <div className="text-center py-8">
                  <Check className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">เช็คอินครบทุกห้องแล้ว</p>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
})

export default CheckInBottomSheet
