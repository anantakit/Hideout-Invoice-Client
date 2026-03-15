import React, { useState, useMemo, useRef, useCallback } from 'react'
import { parseISO, differenceInDays } from 'date-fns'
import { Loader2, Check, CheckCircle2, ArrowRightLeft, Phone, ExternalLink } from 'lucide-react'
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
import { cn, todayISO } from '@/shared/utils'
import { useNavigate } from 'react-router-dom'

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
  const [confirmCheckInStay, setConfirmCheckInStay] = useState<RoomStayResponse | null>(null)
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
      <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-0 flex flex-col max-h-[85vh]">
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
                <button
                  type="button"
                  className="flex items-center gap-1 text-body text-muted-foreground active:text-foreground"
                  onClick={() => { onClose(); navigate(`/bookings/${safeId}`) }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  รายละเอียด
                </button>
              </div>
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
              {/* ═══════════════════════════════════════════════════════
                  Compact Summary — assigned badges + progress
                  ═══════════════════════════════════════════════════════ */}
              <div className="space-y-3">
                {/* Assigned rooms as compact badges */}
                {(assignedStays.length > 0 || checkedInStays.length > 0) && (
                  <div className="space-y-1.5">
                    <p className="text-label text-muted-foreground">
                      กำหนดห้องแล้ว
                    </p>
                    <div className="flex flex-wrap space-inline">
                      {assignedStays.map((stay) => (
                        <Badge key={stay.id} variant="green" className="text-helper px-2.5 py-1">
                          ห้อง {stay.room_number}
                        </Badge>
                      ))}
                      {checkedInStays.map((stay) => (
                        <Badge key={stay.id} variant="blue" className="text-helper px-2.5 py-1">
                          ห้อง {stay.room_number} · เข้าพัก
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress bar */}
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 h-2 radius-badge bg-muted overflow-hidden">
                    <div
                      className="h-full radius-badge bg-success transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="text-label tabular-nums text-muted-foreground shrink-0">
                    {totalAssigned} / {totalActive}
                  </span>
                </div>
              </div>

              <Separator />

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
                                  <button
                                    key={room.room_id}
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleTransferPick(room.room_id, room.room_number)}
                                    className={cn(
                                      'w-full flex items-center justify-between radius-card border px-4 py-3 min-h-[44px] text-left transition-colors disabled:opacity-50',
                                      group.isSameType
                                        ? 'border-primary/30 bg-primary/5 active:bg-primary/10'
                                        : 'border-border-soft bg-card active:bg-accent/10',
                                    )}
                                  >
                                    <p className="text-body font-bold tabular-nums">ห้อง {room.room_number}</p>
                                    <span className="text-caption text-primary shrink-0">เลือก</span>
                                  </button>
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
                              <button
                                key={room.room_id}
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleAssign(typeId, room.room_id, room.room_number)}
                                className="w-full flex items-center justify-between radius-card border border-border bg-card px-4 py-3 min-h-[44px] text-left active:bg-accent/10 transition-colors disabled:opacity-50"
                              >
                                <div>
                                  <p className="text-body font-bold tabular-nums">ห้อง {room.room_number}</p>
                                  <p className="text-micro text-muted-foreground">{room.room_type_name}</p>
                                </div>
                                <span className="text-caption text-primary shrink-0">เลือก</span>
                              </button>
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
                  {/* Assigned stays */}
                  {assignedStays.map((stay) => (
                    <div
                      key={stay.id}
                      className="flex items-center justify-between radius-card border border-success/30 bg-success/5 px-4 py-3 min-h-[44px]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Check className="w-4 h-4 text-success shrink-0" />
                        <div>
                          <p className="text-body font-bold tabular-nums">ห้อง {stay.room_number}</p>
                          <p className="text-micro text-muted-foreground">{stay.room_type_name} · กำหนดแล้ว</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                          disabled={isBusy}
                          onClick={() => handleReassign(stay)}
                        >
                          {busyStayId === stay.id && unassignMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            'เปลี่ยนห้อง'
                          )}
                        </Button>
                        {isCheckInDay && (
                          <Button
                            size="sm"
                            className="h-9 px-3 text-sm font-semibold"
                            disabled={isBusy}
                            onClick={() => setConfirmCheckInStay(stay)}
                          >
                            {busyStayId === stay.id && checkInMutation.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              'เช็คอิน'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Checked-in stays */}
                  {checkedInStays.map((stay) => {
                    const isTransferring = transferringStay?.id === stay.id
                    return (
                      <div
                        key={stay.id}
                        className={`flex items-center justify-between radius-card border px-4 py-3 min-h-[44px] ${
                          isTransferring
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border bg-card'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                          <div>
                            <p className="text-body font-bold tabular-nums">ห้อง {stay.room_number}</p>
                            <p className="text-micro text-muted-foreground">{stay.room_type_name} · เข้าพักแล้ว</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
                          disabled={isBusy}
                          onClick={() => setTransferringStay(isTransferring ? null : stay)}
                        >
                          เปลี่ยนห้อง
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

              {isCheckInDay && assignedStays.length > 1 && (
                <Button
                  className="w-full h-11 font-semibold"
                  disabled={isBusy}
                  onClick={() => setConfirmCheckInAll(true)}
                >
                  {checkingInAll ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  เช็คอินทั้งหมด ({assignedStays.length} ห้อง)
                </Button>
              )}

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

        {/* Single check-in confirmation */}
        <AlertDialog open={confirmCheckInStay !== null} onOpenChange={(open) => !open && setConfirmCheckInStay(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ยืนยันเช็คอิน</AlertDialogTitle>
              <AlertDialogDescription>
                เช็คอิน ห้อง {confirmCheckInStay?.room_number} ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (confirmCheckInStay) handleCheckInOne(confirmCheckInStay)
                setConfirmCheckInStay(null)
              }}>
                เช็คอิน
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
