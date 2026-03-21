import { useState, useEffect, useMemo } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { LogIn, Loader2, Key, ShieldCheck, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { fmtShortISO, formatCompactNumber } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
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
import { ConfirmActionCard } from '@/shared/ui/confirm-action-card'
import { useCheckInRooms, useAvailabilityGrouped } from '../../hooks'
import type { RoomStayResponse } from '../../types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface InlineCheckInProps {
  bookingId: string
  pendingStays: RoomStayResponse[]
  /** When true, renders without Card wrapper (for use inside drawer/panel). */
  compact?: boolean
  /** Key deposit amount from booking. */
  keyDepositAmount?: number
  /** Deposit status: NONE, PENDING, COLLECTED. */
  depositStatus?: string
}

interface AvailableRoom {
  room_id: string
  room_number: string
  available: boolean
}

// ─── InlineCheckIn ───────────────────────────────────────────────────────────

export function InlineCheckIn({ bookingId, pendingStays, compact, keyDepositAmount = 0, depositStatus = 'NONE' }: InlineCheckInProps) {
  const checkIn = useCheckInRooms(bookingId)

  // stayId → roomId (for unassigned stays that need room selection)
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [initialized, setInitialized] = useState(false)
  // Track which stay is currently being individually checked in
  const [checkingInStayId, setCheckingInStayId] = useState<string | null>(null)

  // Pre-populate selections from already-assigned rooms
  useEffect(() => {
    if (pendingStays.length > 0 && !initialized) {
      const initial: Record<string, string> = {}
      for (const stay of pendingStays) {
        if (stay.room_id) {
          initial[stay.id] = stay.room_id
        }
      }
      if (Object.keys(initial).length > 0) {
        setSelections(initial)
      }
      setInitialized(true)
    }
  }, [pendingStays, initialized])

  // Categorize stays
  const assigned = pendingStays.filter((s) => s.room_id || selections[s.id])
  const unassigned = pendingStays.filter((s) => !s.room_id && !selections[s.id])
  const allReady = assigned.length === pendingStays.length

  // Derive date range for availability query (only needed if unassigned stays exist)
  const needsAvailability = unassigned.length > 0
  const checkInDate = pendingStays.reduce(
    (min, s) => (s.check_in < min ? s.check_in : min),
    pendingStays[0].check_in,
  )
  const checkOutDate = pendingStays.reduce(
    (max, s) => (s.check_out > max ? s.check_out : max),
    pendingStays[0].check_out,
  )

  const { data: availability, isLoading: availabilityLoading } =
    useAvailabilityGrouped(checkInDate, checkOutDate, needsAvailability, bookingId)

  const roomsByType = useMemo(() => {
    const map = new Map<string, AvailableRoom[]>()
    if (availability) {
      for (const rt of availability.room_types) {
        map.set(
          rt.room_type_id,
          rt.rooms.map((r) => ({
            room_id: r.room_id,
            room_number: r.room_number,
            available: r.available,
          })),
        )
      }
    }
    return map
  }, [availability])

  // All room IDs currently selected (for cross-stay dedup)
  const selectedRoomIds = useMemo(() => {
    const set = new Set<string>()
    for (const stay of pendingStays) {
      const roomId = selections[stay.id] || stay.room_id
      if (roomId) set.add(roomId)
    }
    return set
  }, [pendingStays, selections])

  // ── Actions ──────────────────────────────────────────────────────────────

  function handleCheckInSingle(stay: RoomStayResponse) {
    const roomId = selections[stay.id] || stay.room_id
    if (!roomId) return

    setCheckingInStayId(stay.id)
    checkIn.mutate(
      [{ room_stay_id: stay.id, room_id: roomId }],
      {
        onSuccess: () => {
          toast.success(`เช็คอิน ห้อง ${stay.room_number || roomId.slice(0, 6)} สำเร็จ`)
          setCheckingInStayId(null)
        },
        onError: (err: Error) => {
          toast.error(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
          setCheckingInStayId(null)
        },
      },
    )
  }

  function handleCheckInAll() {
    const stays = pendingStays
      .filter((s) => selections[s.id] || s.room_id)
      .map((s) => ({
        room_stay_id: s.id,
        room_id: selections[s.id] || s.room_id!,
      }))

    if (stays.length === 0) return

    checkIn.mutate(stays, {
      onSuccess: () => {
        toast.success(`เช็คอิน ${stays.length} ห้องสำเร็จ`)
      },
      onError: (err: Error) => {
        toast.error(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
      },
    })
  }

  // ── Confirmation dialog state ────────────────────────────────────────
  const [confirmAll, setConfirmAll] = useState(false)

  // Resolve display name for a stay's room
  function getRoomLabel(stay: RoomStayResponse): string {
    const roomId = selections[stay.id] || stay.room_id || ''
    if (stay.room_number) return `ห้อง ${stay.room_number}`
    const rooms = roomsByType.get(stay.room_type_id) ?? []
    const room = rooms.find((r) => r.room_id === roomId)
    return room ? `ห้อง ${room.room_number}` : `ห้อง ${roomId.slice(0, 6)}`
  }

  // ── Key deposit banner ──────────────────────────────────────────────────

  const depositLine = depositStatus !== 'NONE' ? (
    <div className="flex items-center gap-1.5">
      {depositStatus === 'PENDING' ? (
        <>
          <ShieldAlert className="w-3.5 h-3.5 text-warning shrink-0" />
          <span className="text-xs font-medium text-warning">
            เก็บ {formatCompactNumber(keyDepositAmount)}
          </span>
        </>
      ) : (
        <>
          <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
          <span className="text-xs font-medium text-success">
            เก็บแล้ว {formatCompactNumber(keyDepositAmount)}
          </span>
        </>
      )}
    </div>
  ) : null

  // ── Render ───────────────────────────────────────────────────────────────

  const stayRows = (
    <div className="space-y-2">
      {pendingStays.map((stay) => {
        const nights = differenceInDays(parseISO(stay.check_out), parseISO(stay.check_in))
        const roomId = selections[stay.id] || stay.room_id || ''
        const hasRoom = roomId !== ''
        const isAssigned = Boolean(stay.room_id)
        const isSingleChecking = checkingInStayId === stay.id && checkIn.isPending

        return (
          <div key={stay.id}>
            {hasRoom ? (
              // ── Tappable row — opens confirmation dialog ──
              <ConfirmActionCard
                disabled={checkIn.isPending}
                loading={isSingleChecking}
                loader={<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                icon={<LogIn className="w-4 h-4 text-primary" />}
                confirmTitle="ยืนยันเช็คอิน"
                confirmDescription={`เช็คอิน ${getRoomLabel(stay)} ?`}
                confirmLabel="เช็คอิน"
                onConfirm={() => handleCheckInSingle(stay)}
              >
                  {isAssigned ? (
                    <div className="flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-semibold">ห้อง {stay.room_number}</span>
                      <span className="text-xs text-muted-foreground">{stay.room_type_name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-semibold">
                        {getRoomLabel(stay)}
                      </span>
                      <span className="text-xs text-muted-foreground">{stay.room_type_name}</span>
                    </div>
                  )}
                  <p className="text-micro-sm text-muted-foreground mt-0.5 pl-5.5">
                    {fmtShortISO(stay.check_in)} → {fmtShortISO(stay.check_out)} · {nights} คืน
                  </p>
              </ConfirmActionCard>
            ) : (
              // ── Needs room assignment — show selector ──
              <div className="radius-card border border-border bg-card text-card-foreground shadow-card px-3 py-2.5">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{stay.room_type_name} · {nights} คืน</p>
                  {availabilityLoading ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      กำลังโหลด...
                    </div>
                  ) : (
                    <Select
                      value={selections[stay.id] ?? ''}
                      onValueChange={(rid) =>
                        setSelections((prev) => ({ ...prev, [stay.id]: rid }))
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="เลือกห้อง" />
                      </SelectTrigger>
                      <SelectContent>
                        {(roomsByType.get(stay.room_type_id) ?? [])
                          .filter((r) => r.available || r.room_id === stay.room_id)
                          .map((room) => {
                            const taken = selectedRoomIds.has(room.room_id) && room.room_id !== selections[stay.id]
                            return (
                              <SelectItem key={room.room_id} value={room.room_id} disabled={taken}>
                                ห้อง {room.room_number}{taken ? ' (เลือกแล้ว)' : ''}
                              </SelectItem>
                            )
                          })}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  // Inline batch check-in button (shown next to progress label)
  const batchButton = pendingStays.length > 1 && (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1 text-xs h-auto py-1 px-2 text-primary hover:text-primary/80 shrink-0"
      disabled={checkIn.isPending || !allReady}
      onClick={() => setConfirmAll(true)}
    >
      {checkIn.isPending && checkingInStayId === null ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <LogIn size={12} />
      )}
      เช็คอินทั้งหมด
    </Button>
  )

  // Confirmation dialogs
  const confirmDialogs = (
    <>
      {/* Batch check-in confirmation */}
      <AlertDialog open={confirmAll} onOpenChange={(open) => !open && setConfirmAll(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันเช็คอิน</AlertDialogTitle>
            <AlertDialogDescription>
              เช็คอินทั้งหมด {pendingStays.length} ห้อง ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              handleCheckInAll()
              setConfirmAll(false)
            }}>
              เช็คอินทั้งหมด
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  // ── Compact mode (drawer/panel) — no Card wrapper ──
  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <LogIn className="w-3.5 h-3.5" />
            เช็คอิน {pendingStays.length > 1 ? `0/${pendingStays.length} ห้อง` : ''}
          </p>
          {batchButton}
        </div>
        {stayRows}
        {confirmDialogs}
      </div>
    )
  }

  // ── Full mode (BookingDetailPage) — with Card wrapper ──
  return (
    <div className="space-y-3">
      {depositLine}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <LogIn className="w-3.5 h-3.5" />
          เช็คอิน {pendingStays.length > 1 ? `0/${pendingStays.length} ห้อง` : ''}
        </p>
        {batchButton}
      </div>
      {stayRows}
      {confirmDialogs}
    </div>
  )
}
