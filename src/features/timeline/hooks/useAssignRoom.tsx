import { useState, useMemo, useRef, useCallback } from 'react'
import { parseISO, differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'
import {
  useBooking,
  useAvailabilityGrouped,
  useAssignRooms,
  useCheckInRooms,
  useUnassignRoom,
  useTransferRoom,
} from '@/features/bookings/hooks'
import type { RoomStayResponse } from '@/features/bookings/types'
import { todayISO } from '@/shared/utils'

// ── Constants ────────────────────────────────────────────────────────────────

const UNDO_TIMEOUT_MS = 4000

// ── Types ────────────────────────────────────────────────────────────────────

export interface AvailableRoom {
  room_id: string
  room_number: string
  room_type_name: string
}

export interface TransferRoomGroup {
  typeId: string
  typeName: string
  pricePerNight: number
  isSameType: boolean
  rooms: { room_id: string; room_number: string }[]
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAssignRoom(bookingId: string, isOpen: boolean) {
  const { data: booking, isLoading: bookingLoading } = useBooking(bookingId)
  const assignMutation = useAssignRooms(bookingId)
  const unassignMutation = useUnassignRoom(bookingId)
  const checkInMutation = useCheckInRooms(bookingId)
  const transferMutation = useTransferRoom(bookingId)

  const [busyStayId, setBusyStayId] = useState<string | null>(null)
  const [checkingInAll, setCheckingInAll] = useState(false)
  const [transferringStay, setTransferringStay] = useState<RoomStayResponse | null>(null)
  const [confirmCheckInAll, setConfirmCheckInAll] = useState(false)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Categorize stays ──────────────────────────────────────────────────────
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

  // ── Availability query ────────────────────────────────────────────────────
  const { data: availability, isLoading: availLoading } = useAvailabilityGrouped(
    ciDate, coDate,
    isOpen && Boolean(ciDate && coDate),
    bookingId,
  )

  // Already-assigned room IDs
  const assignedRoomIds = useMemo(() => {
    if (!booking) return new Set<string>()
    return new Set(booking.room_stays.filter((s) => s.room_id).map((s) => s.room_id!))
  }, [booking])

  // Available rooms grouped by type
  const roomsByType = useMemo(() => {
    if (!availability) return new Map<string, AvailableRoom[]>()
    const map = new Map<string, AvailableRoom[]>()
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

  // ── Transfer room groups ──────────────────────────────────────────────────
  const transferRoomGroups = useMemo<TransferRoomGroup[]>(() => {
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

  // ── Derived state ─────────────────────────────────────────────────────────
  const isBusy = assignMutation.isPending || checkInMutation.isPending || unassignMutation.isPending || transferMutation.isPending
  const isLoading = bookingLoading
  const allAssigned = remainingCount === 0 && totalActive > 0
  const progressPct = totalActive > 0 ? (totalAssigned / totalActive) * 100 : 0

  // ── Undo helper ───────────────────────────────────────────────────────────
  const doUnassign = useCallback(async (stayId: string) => {
    try {
      await unassignMutation.mutateAsync(stayId)
    } catch {
      // silently fail undo
    }
  }, [unassignMutation])

  // ── Handlers ──────────────────────────────────────────────────────────────

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

  return {
    booking,
    isLoading,
    isBusy,
    availLoading,

    // Stays
    unassignedStays,
    assignedStays,
    checkedInStays,
    totalActive,
    totalAssigned,
    remainingCount,

    // Dates
    ciDate,
    coDate,
    nights,
    isCheckInDay,

    // Rooms
    roomsByType,
    totalAvailableRooms,

    // Transfer
    transferringStay,
    setTransferringStay,
    transferRoomGroups,
    currentTypePrice,

    // Check-in all dialog
    checkingInAll,
    confirmCheckInAll,
    setConfirmCheckInAll,

    // Progress
    allAssigned,
    progressPct,

    // Busy indicator per stay
    busyStayId,
    checkInMutation,
    unassignMutation,

    // Handlers
    handleAssign,
    handleReassign,
    handleCheckInOne,
    handleCheckInAll,
    handleTransferPick,
  }
}
