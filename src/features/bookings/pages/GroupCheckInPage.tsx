import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
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
import { useBooking, useCheckInRooms, useRooms } from '../hooks'
import type { RoomStayResponse } from '../types'

// ─── Status badge ─────────────────────────────────────────────────────────────

function StayStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'RESERVED':    return <Badge variant="gray">RESERVED</Badge>
    case 'ASSIGNED':    return <Badge variant="amber">ASSIGNED</Badge>
    case 'CHECKED_IN':  return <Badge variant="green">CHECKED_IN</Badge>
    case 'CHECKED_OUT': return <Badge variant="gray">CHECKED_OUT</Badge>
    case 'CANCELLED':   return <Badge variant="red">CANCELLED</Badge>
    default:            return <Badge variant="gray">{status}</Badge>
  }
}

// ─── Room select for one stay ─────────────────────────────────────────────────

interface StayRoomSelectorProps {
  roomTypeId: string
  value: string
  onChange: (roomId: string) => void
}

function StayRoomSelector({ roomTypeId, value, onChange }: StayRoomSelectorProps) {
  const { data: rooms = [], isLoading } = useRooms(roomTypeId)
  const activeRooms = rooms.filter((r) => r.status === 'ACTIVE')

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        กำลังโหลดห้อง...
      </div>
    )
  }

  if (activeRooms.length === 0) {
    return <p className="text-xs text-muted-foreground">ไม่มีห้องพักสำหรับประเภทนี้</p>
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-sm">
        <SelectValue placeholder="เลือกห้อง" />
      </SelectTrigger>
      <SelectContent>
        {activeRooms.map((room) => (
          <SelectItem key={room.id} value={room.id}>
            ห้อง {room.number}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ─── Single stay row ──────────────────────────────────────────────────────────

interface StayRowProps {
  stay: RoomStayResponse
  selectedRoomId: string
  onRoomChange: (roomId: string) => void
}

function StayRow({ stay, selectedRoomId, onRoomChange }: StayRowProps) {
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
            roomTypeId={stay.room_type_id}
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

  const allStays     = booking?.room_stays ?? []
  const pendingStays = allStays.filter(
    (s) => s.status === 'RESERVED' || s.status === 'ASSIGNED',
  )
  const selectedCount = pendingStays.filter((s) => selections[s.id]).length
  const canSubmit     = selectedCount > 0 && !checkIn.isPending

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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (isError || !booking) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm text-destructive">ไม่พบข้อมูลการจอง</p>
        <Button variant="outline" size="sm" asChild>
          <Link to={ROUTES.bookings.list}>กลับรายการจอง</Link>
        </Button>
      </div>
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
