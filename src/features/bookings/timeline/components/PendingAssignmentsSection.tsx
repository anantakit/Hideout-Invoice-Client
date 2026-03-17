import { useState, useMemo } from 'react'
import { parseISO, differenceInDays } from 'date-fns'
import { ChevronDown, BedDouble, Loader2, Wand2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { CardButton } from '@/shared/ui/card-button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { cn, todayISO, addDaysISO, fmtShortISO, THAI_MONTHS_SHORT } from '@/shared/utils'
import { Badge } from '@/shared/ui/badge'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogFooter, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/shared/ui/alert-dialog'
import type { UnassignedStay } from '../../types'
import { useBooking, useAvailabilityGrouped, useAssignRooms } from '../../hooks'
import { bookingsApi } from '../../api'
import { toDateStr } from '../utils/operationTypes'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PendingBookingGroup {
  bookingId: string
  guestName: string
  checkIn: string
  checkOut: string
  roomTypeNames: string[]
  totalRooms: number
  nights: number
}

// ─── Main Section ────────────────────────────────────────────────────────────

export function PendingAssignmentsSection({
  unassignedStays,
}: {
  unassignedStays: UnassignedStay[]
}) {
  const qc = useQueryClient()
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null)
  const [autoAssignDate, setAutoAssignDate] = useState<string | null>(null)
  const todayStr = todayISO()

  const autoAssign = useMutation({
    mutationFn: (date: string) => bookingsApi.autoAssignRooms(date),
    onSuccess: (resp) => {
      qc.invalidateQueries({ queryKey: ['timeline'] })
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['availability'] })
      qc.invalidateQueries({ queryKey: ['availability-grouped'] })
      if (resp.assigned_count > 0 && resp.skipped_count === 0) {
        toast.success(`มอบหมายห้องสำเร็จ ${resp.assigned_count} รายการ`)
      } else if (resp.assigned_count > 0) {
        toast.success(`มอบหมายสำเร็จ ${resp.assigned_count}, ข้าม ${resp.skipped_count}`)
      } else if (resp.skipped_count > 0) {
        toast.error(resp.skipped[0]?.reason ?? 'ไม่มีห้องว่าง')
      } else {
        toast('ไม่มีรายการที่ต้องมอบหมาย')
      }
      setAutoAssignDate(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? 'มอบหมายอัตโนมัติไม่สำเร็จ')
      setAutoAssignDate(null)
    },
  })

  const handleAutoAssign = (date: string) => {
    setAutoAssignDate(date)
    autoAssign.mutate(date)
  }

  const grouped = useMemo(() => {
    const map = new Map<string, PendingBookingGroup>()
    for (const s of unassignedStays) {
      if (s.status === 'CANCELLED' || s.status === 'CHECKED_OUT') continue
      if (toDateStr(s.check_in) === todayStr) continue
      const existing = map.get(s.booking_id)
      if (existing) {
        existing.totalRooms++
        if (toDateStr(s.check_in) < existing.checkIn) existing.checkIn = toDateStr(s.check_in)
        if (toDateStr(s.check_out) > existing.checkOut) existing.checkOut = toDateStr(s.check_out)
        if (!existing.roomTypeNames.includes(s.room_type_name)) {
          existing.roomTypeNames.push(s.room_type_name)
        }
      } else {
        const ci = parseISO(s.check_in)
        const co = parseISO(s.check_out)
        map.set(s.booking_id, {
          bookingId: s.booking_id,
          guestName: s.guest_name,
          checkIn: toDateStr(s.check_in),
          checkOut: toDateStr(s.check_out),
          roomTypeNames: [s.room_type_name],
          totalRooms: 1,
          nights: differenceInDays(co, ci),
        })
      }
    }
    return Array.from(map.values())
  }, [unassignedStays])

  const sections = useMemo(() => {
    const dateMap = new Map<string, PendingBookingGroup[]>()
    for (const g of grouped) {
      const key = g.checkIn
      const arr = dateMap.get(key) ?? []
      arr.push(g)
      dateMap.set(key, arr)
    }
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, bookings]) => {
        const d = parseISO(dateStr)
        const label =
          dateStr === todayStr ? 'วันนี้' :
          dateStr === addDaysISO(1) ? 'พรุ่งนี้' :
          `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`
        const isUrgent = dateStr <= todayStr
        const stayCount = bookings.reduce((sum, b) => sum + b.totalRooms, 0)
        return { dateStr, label, isUrgent, bookings, stayCount }
      })
  }, [grouped, todayStr])

  const totalStays = unassignedStays.filter(
    (s) => s.status !== 'CANCELLED' && s.status !== 'CHECKED_OUT' && toDateStr(s.check_in) !== todayStr,
  ).length

  const urgentSections = sections.filter((s) => s.isUrgent)
  const futureSections = sections.filter((s) => !s.isUrgent)
  const futureStayCount = futureSections.reduce((sum, s) => sum + s.stayCount, 0)
  const [showFuture, setShowFuture] = useState(false)

  return (
    <div className="p-4 border-b border-border space-y-3">
      <p className="text-label text-muted-foreground flex items-center space-inline">
        <BedDouble className="w-3 h-3" />
        รอมอบหมายห้อง
        <Badge variant="amber" className="tabular-nums ml-0.5 text-micro px-1.5 py-0">{totalStays}</Badge>
      </p>

      <div className="space-y-3">
        {urgentSections.map((section) => (
          <DateSection
            key={section.dateStr}
            section={section}
            expandedBookingId={expandedBookingId}
            setExpandedBookingId={setExpandedBookingId}
            autoAssign={autoAssign}
            autoAssignDate={autoAssignDate}
            handleAutoAssign={handleAutoAssign}
          />
        ))}
      </div>

      {futureSections.length > 0 && (
        <div className="space-y-3">
          <CardButton
            variant="ghost"
            padding="none"
            onClick={() => setShowFuture(!showFuture)}
            className="flex-row items-center justify-between py-1.5"
          >
            <span className="text-helper flex items-center space-inline">
              ล่วงหน้า
              <span className="font-normal text-muted-foreground/50">{futureStayCount} ห้อง</span>
            </span>
            <ChevronDown className={cn(
              'w-3.5 h-3.5 text-muted-foreground/50 transition-transform',
              showFuture && 'rotate-180',
            )} />
          </CardButton>

          {showFuture && futureSections.map((section) => (
            <DateSection
              key={section.dateStr}
              section={section}
              expandedBookingId={expandedBookingId}
              setExpandedBookingId={setExpandedBookingId}
              autoAssign={autoAssign}
              autoAssignDate={autoAssignDate}
              handleAutoAssign={handleAutoAssign}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Date Section ────────────────────────────────────────────────────────────

function DateSection({
  section,
  expandedBookingId,
  setExpandedBookingId,
  autoAssign,
  autoAssignDate,
  handleAutoAssign,
}: {
  section: { dateStr: string; label: string; isUrgent: boolean; bookings: PendingBookingGroup[]; stayCount: number }
  expandedBookingId: string | null
  setExpandedBookingId: (id: string | null) => void
  autoAssign: { isPending: boolean }
  autoAssignDate: string | null
  handleAutoAssign: (date: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className={cn(
          'text-xs flex items-center space-inline',
          section.isUrgent
            ? 'font-semibold text-warning'
            : 'font-medium text-muted-foreground',
        )}>
          {section.isUrgent && <span className="w-1.5 h-1.5 radius-badge bg-warning" />}
          {section.label}
          <span className="font-normal text-muted-foreground/50">{section.stayCount} ห้อง</span>
        </p>
        {section.stayCount > 1 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={autoAssign.isPending}
                className="gap-1.5 h-auto p-0 text-helper hover:text-primary"
              >
                {autoAssign.isPending && autoAssignDate === section.dateStr ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Wand2 className="w-3 h-3" />
                )}
                อัตโนมัติ
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ยืนยันจัดห้องอัตโนมัติ</AlertDialogTitle>
                <AlertDialogDescription>
                  มอบหมายห้องอัตโนมัติให้ {section.stayCount} ห้อง เข้าพัก{section.label} ระบบจะเลือกห้องที่เหมาะสมที่สุด
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleAutoAssign(section.dateStr)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  จัดอัตโนมัติ
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {section.bookings.map((booking) => {
        const isExpanded = expandedBookingId === booking.bookingId
        return (
          <div key={booking.bookingId}>
            <CardButton
              onClick={() => setExpandedBookingId(isExpanded ? null : booking.bookingId)}
              padding="card"
              className={cn(
                'border',
                isExpanded
                  ? 'border-border bg-card rounded-b-none'
                  : section.isUrgent
                    ? 'border-border bg-card hover:bg-accent/10'
                    : 'border-border-soft bg-card/50 hover:bg-card',
                isExpanded && 'rounded-b-none',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={cn(
                  'text-body font-semibold truncate',
                  !section.isUrgent && 'text-muted-foreground',
                )}>{booking.guestName}</span>
                <span className="text-helper shrink-0">{booking.nights} คืน</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center space-inline text-helper">
                  <span>{booking.roomTypeNames.join(', ')}</span>
                  <span>·</span>
                  <span className="tabular-nums">{booking.totalRooms} ห้อง</span>
                </div>
                <ChevronDown className={cn(
                  'w-3.5 h-3.5 text-muted-foreground/50 transition-transform shrink-0',
                  isExpanded && 'rotate-180',
                )} />
              </div>
              <p className="text-helper text-muted-foreground/50 mt-0.5 tabular-nums">
                {fmtShortISO(booking.checkIn)} → {fmtShortISO(booking.checkOut)}
              </p>
            </CardButton>

            {isExpanded && (
              <InlineRoomPicker
                bookingId={booking.bookingId}
                checkIn={booking.checkIn}
                checkOut={booking.checkOut}
                onDone={() => setExpandedBookingId(null)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Inline Room Picker ──────────────────────────────────────────────────────

function InlineRoomPicker({
  bookingId,
  checkIn,
  checkOut,
  onDone,
}: {
  bookingId: string
  checkIn: string
  checkOut: string
  onDone: () => void
}) {
  const { data: booking, isLoading: bookingLoading } = useBooking(bookingId)
  const { data: availability, isLoading: availLoading } = useAvailabilityGrouped(
    checkIn, checkOut, true, bookingId,
  )
  const assignMutation = useAssignRooms(bookingId)
  const [busyStayId, setBusyStayId] = useState<string | null>(null)

  const unassignedStays = useMemo(() => {
    if (!booking) return []
    return booking.room_stays.filter((s) => s.status === 'RESERVED' && !s.room_id)
  }, [booking])

  const assignedRoomIds = useMemo(() => {
    if (!booking) return new Set<string>()
    return new Set(booking.room_stays.filter((s) => s.room_id).map((s) => s.room_id!))
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

  const handleAssign = async (roomTypeId: string, roomId: string, roomNumber: string) => {
    const stay = unassignedStays.find((s) => s.room_type_id === roomTypeId)
    if (!stay) return
    setBusyStayId(stay.id)
    try {
      await assignMutation.mutateAsync([{ room_stay_id: stay.id, room_id: roomId }])
      toast.success(`กำหนดห้อง ${roomNumber} แล้ว`)
      if (unassignedStays.length <= 1) onDone()
    } catch (err) {
      toast.error((err as Error).message || 'เกิดข้อผิดพลาด')
    } finally {
      setBusyStayId(null)
    }
  }

  const isLoading = bookingLoading || availLoading
  const isBusy = assignMutation.isPending

  return (
    <div className="radius-card rounded-t-none border border-t-0 border-border bg-card space-card space-y-2">
      {isLoading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : roomsByType.length === 0 ? (
        <p className="text-xs text-destructive text-center py-2">ไม่มีห้องว่างในประเภทนี้</p>
      ) : (
        <>
          {unassignedStays.length > 0 && (
            <p className="text-xs text-warning font-medium">
              รอกำหนด {unassignedStays.length} ห้อง
            </p>
          )}

          {roomsByType.map((rt) => (
            <div key={rt.typeId} className="space-y-1.5">
              {roomsByType.length > 1 && (
                <p className="text-xs text-muted-foreground">{rt.typeName}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
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
                        'radius-card border border-border bg-card px-3 py-2 min-w-14 text-center',
                        'text-sm font-bold tabular-nums transition-colors cursor-pointer',
                        isBusy ? 'opacity-50' : 'hover:border-primary hover:bg-primary/5 active:bg-primary/10',
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
          ))}
        </>
      )}
    </div>
  )
}
