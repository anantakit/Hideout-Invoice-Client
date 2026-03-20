import React, { useState, useMemo, useRef, useCallback } from 'react'
import { parseISO, differenceInDays } from 'date-fns'
import { Loader2, Check, CheckCircle2, ArrowRightLeft, Phone, ExternalLink, ShieldCheck, ShieldAlert, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/shared/ui/sheet'
import { Button } from '@/shared/ui/button'
import { CardButton } from '@/shared/ui/card-button'
import { Separator } from '@/shared/ui/separator'
import { ConfirmActionCard } from '@/shared/ui/confirm-action-card'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/shared/ui/alert-dialog'
import {
  useBooking,
  useAvailabilityGrouped,
  useAssignRooms,
  useCheckInRooms,
  useUnassignRoom,
  useTransferRoom,
} from '../../hooks'
import type { RoomStayResponse } from '../../types'
import { cn, todayISO, fmtShortISO } from '@/shared/utils'
import { useNavigate } from 'react-router-dom'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const navigate = useNavigate()
  const isOpen = bookingId !== null
  const safeId = bookingId ?? ''

  const { data: booking, isLoading: bookingLoading } = useBooking(safeId)
  const assignMutation = useAssignRooms(safeId)
  const unassignMutation = useUnassignRoom(safeId)
  const checkInMutation = useCheckInRooms(safeId)
  const transferMutation = useTransferRoom(safeId)
  const [busyStayId, setBusyStayId] = useState<string | null>(null)
  const [checkingInAll, setCheckingInAll] = useState(false)
  const [transferringStay, setTransferringStay] = useState<RoomStayResponse | null>(null)
  const [confirmCheckInAll, setConfirmCheckInAll] = useState(false)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Categorize stays ────────────────────────────────────────────────────
  const { unassignedStays, assignedStays, checkedInStays, totalActive } = useMemo(() => {
    if (!booking) return { unassignedStays: [] as RoomStayResponse[], assignedStays: [] as RoomStayResponse[], checkedInStays: [] as RoomStayResponse[], totalActive: 0 }

    const active = booking.room_stays.filter((s) => s.status !== 'CANCELLED')
    const unassigned = active.filter((s) => s.status === 'RESERVED' && !s.room_id)
    const assigned = active.filter((s) => (s.status === 'RESERVED' || s.status === 'ASSIGNED') && s.room_id)
    const checkedIn = active.filter((s) => s.status === 'CHECKED_IN')

    return { unassignedStays: unassigned, assignedStays: assigned, checkedInStays: checkedIn, totalActive: active.length }
  }, [booking])

  const totalAssigned = assignedStays.length + checkedInStays.length
  const remainingCount = unassignedStays.length

  // ── Date logic ────────────────────────────────────────────────────────────
  const today = todayISO()
  const availStay = transferringStay ?? unassignedStays[0] ?? assignedStays[0] ?? checkedInStays[0]
  const ciDate = availStay?.check_in?.slice(0, 10) ?? ''
  const coDate = availStay?.check_out?.slice(0, 10) ?? ''
  const isCheckInDay = ciDate <= today
  const nights = ciDate && coDate ? differenceInDays(parseISO(coDate), parseISO(ciDate)) : 0

  // ── Availability query ──────────────────────────────────────────────────
  const { data: availability, isLoading: availLoading } = useAvailabilityGrouped(
    ciDate, coDate,
    isOpen && Boolean(ciDate && coDate),
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
            <span className="text-body">กำหนดห้อง {roomNumber} แล้ว</span>
            <button
              type="button"
              className="text-label text-primary underline shrink-0"
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

  // Transfer: grouped by type with price diff
  const transferRoomGroups = useMemo(() => {
    if (!transferringStay || !availability) return []
    return availability.room_types
      .map((rt) => ({
        typeId: rt.room_type_id,
        typeName: rt.room_type_name,
        pricePerNight: rt.price_per_night,
        isSameType: rt.room_type_id === transferringStay.room_type_id,
        rooms: rt.rooms
          .filter((r) => r.available && !assignedRoomIds.has(r.room_id) && r.room_id !== transferringStay.room_id)
          .map((r) => ({ room_id: r.room_id, room_number: r.room_number })),
      }))
      .filter((g) => g.rooms.length > 0)
      .sort((a, b) => (a.isSameType ? -1 : b.isSameType ? 1 : 0))
  }, [transferringStay, availability, assignedRoomIds])

  const currentTypePrice = transferRoomGroups.find((g) => g.isSameType)?.pricePerNight ?? 0

  const allAssigned = remainingCount === 0 && totalActive > 0
  const progressPct = totalActive > 0 ? (totalAssigned / totalActive) * 100 : 0

  // ── Render ──────────────────────────────────────────────────────────────
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
              {/* ═══════════════════════════════════════════════════════
                  Compact Summary — progress + deposit + check-in all
                  ═══════════════════════════════════════════════════════ */}
              <div className="space-y-2">
                {/* Row 1: Progress bar + count */}
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

                {/* Row 2: Deposit status + check-in-all on same row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {(booking?.key_deposit_amount ?? 0) > 0 ? (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5 text-warning shrink-0" />
                        <span className="text-xs font-medium text-warning">เก็บ{' ' + booking!.key_deposit_amount.toLocaleString()}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
                        <span className="text-xs font-medium text-success">จ่ายครบ</span>
                      </>
                    )}
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

              {/* ═══════════════════════════════════════════════════════
                  Transfer room picker
                  ═══════════════════════════════════════════════════════ */}
              {transferringStay && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-body font-semibold flex items-center space-inline">
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        ย้ายจากห้อง {transferringStay.room_number}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setTransferringStay(null)}
                      >
                        ยกเลิก
                      </Button>
                    </div>

                    {availLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : transferRoomGroups.length === 0 ? (
                      <p className="text-helper text-destructive text-center py-3">ไม่มีห้องว่าง</p>
                    ) : (
                      <div className="space-y-4">
                        {transferRoomGroups.map((group) => {
                          const diff = group.pricePerNight - currentTypePrice
                          return (
                            <div key={group.typeId}>
                              <div className="flex items-baseline justify-between mb-1.5">
                                <p className="text-label text-foreground">
                                  {group.typeName}
                                  {group.isSameType && (
                                    <span className="text-helper font-normal ml-1">(ประเภทเดียวกัน)</span>
                                  )}
                                </p>
                                {!group.isSameType && diff !== 0 && (
                                  <span className={cn(
                                    'text-micro font-medium',
                                    diff > 0 ? 'text-warning' : 'text-success',
                                  )}>
                                    {diff > 0 ? '+' : ''}{diff.toLocaleString()}/คืน
                                  </span>
                                )}
                              </div>
                              <div className="space-list">
                                {group.rooms.map((room) => (
                                  <CardButton
                                    key={room.room_id}
                                    disabled={isBusy}
                                    onClick={() => handleTransferPick(room.room_id, room.room_number)}
                                    padding="card"
                                    className={cn(
                                      'flex-row items-center justify-between border',
                                      group.isSameType
                                        ? 'border-primary/30 bg-primary/5 active:bg-primary/10'
                                        : 'border-border-soft bg-card active:bg-accent/10',
                                    )}
                                  >
                                    <p className="text-body font-bold tabular-nums">ห้อง {room.room_number}</p>
                                    <span className="text-caption text-primary shrink-0">เลือก</span>
                                  </CardButton>
                                ))}
                              </div>
                            </div>
                          )
                        })}

                        {transferRoomGroups.some((g) => !g.isSameType) && (
                          <p className="text-micro text-muted-foreground/70">
                            * ราคาต่อคืนจะยังเป็นราคาเดิม
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              {/* ═══════════════════════════════════════════════════════
                  Room Selection — vertical list
                  ═══════════════════════════════════════════════════════ */}
              {remainingCount > 0 && !transferringStay && (
                <div className="space-y-3">
                  <div>
                    <p className="text-body font-semibold">เลือกห้อง</p>
                    <p className="text-helper text-warning font-medium mt-0.5">
                      เหลืออีก {remainingCount} ห้อง
                    </p>
                  </div>

                  {availLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {Array.from(roomsByType.entries()).map(([typeId, rooms]) => {
                        const hasUnassigned = unassignedStays.some((s) => s.room_type_id === typeId)
                        if (!hasUnassigned) return null

                        return (
                          <div key={typeId} className="space-y-1.5">
                            {roomsByType.size > 1 && (
                              <p className="text-caption text-muted-foreground pb-0.5">
                                {rooms[0]?.room_type_name}
                              </p>
                            )}
                            {rooms.map((room) => (
                              <CardButton
                                key={room.room_id}
                                disabled={isBusy}
                                onClick={() => handleAssign(typeId, room.room_id, room.room_number)}
                                padding="card"
                                className="flex-row items-center justify-between active:bg-accent/10"
                              >
                                <div>
                                  <p className="text-body font-bold tabular-nums">ห้อง {room.room_number}</p>
                                  <p className="text-micro text-muted-foreground">{room.room_type_name}</p>
                                </div>
                                <span className="text-caption text-primary shrink-0">เลือก</span>
                              </CardButton>
                            ))}
                          </div>
                        )
                      })}

                      {totalAvailableRooms === 0 && (
                        <p className="text-helper text-destructive text-center py-3">ไม่มีห้องว่างในประเภทนี้</p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════
                  Assigned Rooms — detail list with actions
                  ═══════════════════════════════════════════════════════ */}
              {(assignedStays.length > 0 || checkedInStays.length > 0) && (
                <div className="space-y-1.5">
                  {/* Assigned stays — tappable row for check-in */}
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

                  {/* Checked-in stays — compact with transfer icon */}
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

              {/* ═══════════════════════════════════════════════════════
                  Check-in Actions
                  ═══════════════════════════════════════════════════════ */}
              {assignedStays.length > 0 && !isCheckInDay && (
                <div className="radius-card border border-info/30 bg-info-muted px-4 py-3 text-center">
                  <p className="text-body text-info-muted-foreground">
                    เช็คอินได้วันที่ {fmtShortISO(ciDate)}
                  </p>
                </div>
              )}

              {/* Check-in all is now inline with progress header above */}

              {/* All done */}
              {allAssigned && checkedInStays.length === 0 && assignedStays.length === 0 && (
                <div className="text-center py-6">
                  <Check className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="text-body text-muted-foreground">เช็คอินครบทุกห้องแล้ว</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Batch check-in confirmation */}
        <AlertDialog open={confirmCheckInAll} onOpenChange={(open) => !open && setConfirmCheckInAll(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ยืนยันเช็คอิน</AlertDialogTitle>
              <AlertDialogDescription>
                เช็คอินทั้งหมด {assignedStays.length} ห้อง ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                handleCheckInAll()
                setConfirmCheckInAll(false)
              }}>
                เช็คอินทั้งหมด
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  )
})

export default CheckInBottomSheet
