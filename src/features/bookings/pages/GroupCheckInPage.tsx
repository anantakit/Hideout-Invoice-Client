import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { Skeleton } from '@/shared/ui/skeleton'
import { differenceInDays, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

import { cn, formatThaiDate } from '@/shared/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Separator } from '@/shared/ui/separator'
import { ROUTES } from '@/app/routes'
import ErrorPage from '@/shared/components/ErrorPage'
import { useBooking, useCheckInRooms, useAvailabilityGrouped } from '../hooks'
import { type RoomStayResponse, getStatusLabel } from '../types'

// ─── Status badge ─────────────────────────────────────────────────────────────

function stayStatusVariant(status: string): 'gray' | 'amber' | 'green' | 'red' {
  switch (status) {
    case 'ASSIGNED':    return 'amber'
    case 'CHECKED_IN':  return 'green'
    case 'CANCELLED':   return 'red'
    default:            return 'gray'
  }
}

function StayStatusBadge({ status }: { status: string }) {
  return <Badge variant={stayStatusVariant(status)}>{getStatusLabel(status)}</Badge>
}

// ─── Room select for one stay ─────────────────────────────────────────────────

interface AvailableRoom {
  room_id: string
  room_number: string
  available: boolean
}

interface StayRoomSelectorProps {
  rooms: AvailableRoom[]
  isLoading: boolean
  /** Room IDs already chosen by other stays in this booking (should be disabled). */
  otherSelectedRoomIds: Set<string>
  /** The room_id already assigned to this stay (always selectable). */
  ownRoomId?: string
  value: string
  onChange: (roomId: string) => void
}

function StayRoomSelector({
  rooms,
  isLoading,
  otherSelectedRoomIds,
  ownRoomId,
  value,
  onChange,
}: StayRoomSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        กำลังโหลดห้อง...
      </div>
    )
  }

  // Show rooms that are available OR already assigned to this stay
  const selectableRooms = rooms.filter(
    (r) => r.available || r.room_id === ownRoomId,
  )

  if (selectableRooms.length === 0) {
    return <p className="text-xs text-muted-foreground">ไม่มีห้องว่างสำหรับประเภทนี้</p>
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-sm">
        <SelectValue placeholder="เลือกห้อง" />
      </SelectTrigger>
      <SelectContent>
        {selectableRooms.map((room) => {
          const takenByOther = otherSelectedRoomIds.has(room.room_id) && room.room_id !== value
          return (
            <SelectItem key={room.room_id} value={room.room_id} disabled={takenByOther}>
              ห้อง {room.room_number}{takenByOther ? ' (เลือกแล้ว)' : ''}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

// ─── Single stay row ──────────────────────────────────────────────────────────

interface StayRowProps {
  stay: RoomStayResponse
  selectedRoomId: string
  onRoomChange: (roomId: string) => void
  availableRooms: AvailableRoom[]
  availabilityLoading: boolean
  otherSelectedRoomIds: Set<string>
}

function StayRow({ stay, selectedRoomId, onRoomChange, availableRooms, availabilityLoading, otherSelectedRoomIds }: StayRowProps) {
  const isCheckedIn = stay.status === 'CHECKED_IN'
  const isCancelled = stay.status === 'CANCELLED'
  const isDisabled  = isCheckedIn || isCancelled
  const nights      = differenceInDays(parseISO(stay.check_out), parseISO(stay.check_in))
  const isSelected  = Boolean(selectedRoomId) && !isDisabled

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 transition-all',
        isDisabled  && 'opacity-50',
        isSelected  && 'border-primary ring-1 ring-ring',
        !isSelected && !isDisabled && 'border-border',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className={cn('text-sm font-semibold', isDisabled && 'text-muted-foreground')}>
            {stay.room_type_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatThaiDate(stay.check_in)} → {formatThaiDate(stay.check_out)}
            <span className="ml-1.5">({nights} คืน)</span>
          </p>
          {isCheckedIn && stay.room_number && (
            <p className="text-xs text-muted-foreground">ห้อง {stay.room_number}</p>
          )}
        </div>
        <StayStatusBadge status={stay.status} />
      </div>

      {/* Room selector — only for pending stays */}
      {!isDisabled && (
        <div className="mt-3">
          <StayRoomSelector
            rooms={availableRooms}
            isLoading={availabilityLoading}
            otherSelectedRoomIds={otherSelectedRoomIds}
            ownRoomId={stay.room_id}
            value={selectedRoomId}
            onChange={onRoomChange}
          />
        </div>
      )}
    </div>
  )
}

// ─── GroupCheckInPage ─────────────────────────────────────────────────────────

export default function GroupCheckInPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate    = useNavigate()

  const { data: booking, isLoading, isError } = useBooking(id)
  const checkIn = useCheckInRooms(id)

  // stayId → roomId
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [initialized, setInitialized] = useState(false)

  // Initialize selections from already-assigned rooms
  useEffect(() => {
    if (booking && !initialized) {
      const initial: Record<string, string> = {}
      for (const stay of booking.room_stays) {
        if (stay.room_id && (stay.status === 'RESERVED' || stay.status === 'ASSIGNED')) {
          initial[stay.id] = stay.room_id
        }
      }
      if (Object.keys(initial).length > 0) {
        setSelections(initial)
      }
      setInitialized(true)
    }
  }, [booking, initialized])

  const allStays     = booking?.room_stays ?? []
  const todayStr = new Date().toISOString().slice(0, 10)
  const pendingStays = allStays.filter(
    (s) => (s.status === 'RESERVED' || s.status === 'ASSIGNED') &&
      s.check_in.slice(0, 10) <= todayStr,
  )
  const selectedCount = pendingStays.filter((s) => selections[s.id]).length
  const canSubmit     = selectedCount > 0 && !checkIn.isPending

  // Derive date range from stays for availability query
  // Use the earliest check_in and latest check_out across all pending stays
  const checkInDate  = pendingStays.length > 0
    ? pendingStays.reduce((min, s) => s.check_in < min ? s.check_in : min, pendingStays[0].check_in)
    : ''
  const checkOutDate = pendingStays.length > 0
    ? pendingStays.reduce((max, s) => s.check_out > max ? s.check_out : max, pendingStays[0].check_out)
    : ''

  const { data: availability, isLoading: availabilityLoading } =
    useAvailabilityGrouped(checkInDate, checkOutDate, true, id)

  // Build a map: roomTypeId → rooms with availability
  const roomsByType = new Map<string, AvailableRoom[]>()
  if (availability) {
    for (const rt of availability.room_types) {
      roomsByType.set(
        rt.room_type_id,
        rt.rooms.map((r) => ({
          room_id: r.room_id,
          room_number: r.room_number,
          available: r.available,
        })),
      )
    }
  }

  // Collect room IDs already selected across all stays (for cross-stay dedup)
  const allSelectedRoomIds = new Set(Object.values(selections).filter(Boolean))

  function handleSubmit() {
    if (!canSubmit) return
    const stays = pendingStays
      .filter((s) => selections[s.id])
      .map((s) => ({ room_stay_id: s.id, room_id: selections[s.id] }))

    checkIn.mutate(stays, {
      onSuccess: () => {
        toast.success('เช็คอินกลุ่มสำเร็จ')
        navigate(ROUTES.bookings.detail(id))
      },
      onError: (err: Error) => {
        toast.error(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
      },
    })
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (isError || !booking) {
    return (
      <ErrorPage
        variant="error"
        title="ไม่พบข้อมูลการจอง"
        description="ไม่สามารถโหลดข้อมูลการจองได้ กรุณาลองใหม่"
      />
    )
  }

  // ── Page ─────────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 md:p-6">
      {/* Back */}
      <Link
        to={ROUTES.bookings.detail(id)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        กลับ
      </Link>

      {/* Booking header */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">เช็คอินกลุ่ม</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0.5 pt-0">
          <p className="text-sm font-medium">{booking.guest_name}</p>
          <p className="text-sm text-muted-foreground">{booking.guest_phone}</p>
        </CardContent>
      </Card>

      {/* Stay rows */}
      {allStays.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            รายการห้องพัก ({allStays.length} รายการ)
          </p>
          {allStays.map((stay) => (
            <StayRow
              key={stay.id}
              stay={stay}
              selectedRoomId={selections[stay.id] ?? ''}
              onRoomChange={(roomId) =>
                setSelections((prev) => ({ ...prev, [stay.id]: roomId }))
              }
              availableRooms={roomsByType.get(stay.room_type_id) ?? []}
              availabilityLoading={availabilityLoading}
              otherSelectedRoomIds={allSelectedRoomIds}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-8">ไม่มีรายการห้องพัก</p>
      )}

      {/* Submit */}
      {pendingStays.length > 0 && (
        <>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              เลือกแล้ว {selectedCount} / {pendingStays.length} ห้อง
            </p>
            <Button onClick={handleSubmit} disabled={!canSubmit} className="min-w-36">
              {checkIn.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  ยืนยันเช็คอิน
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {pendingStays.length === 0 && allStays.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          ทุกห้องดำเนินการเรียบร้อยแล้ว
        </p>
      )}
    </div>
  )
}
