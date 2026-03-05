import React, { useMemo } from 'react'
import { format, parseISO, addDays, isToday, differenceInDays } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/shared/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Separator } from '@/shared/ui/separator'
import { ROUTES } from '@/app/routes'
import type { TimelineRoom, TimelineBooking, UnassignedStay } from '../../types'
import { StayAvailabilityCard } from '../availability/StayAvailabilityCard'

// ─── Constants ────────────────────────────────────────────────────────────────

const UPCOMING_WINDOW_DAYS = 5

// ─── Helpers ──────────────────────────────────────────────────────────────────

const THAI_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

function fmtThaiDate(d: Date): string {
  return `${THAI_DAYS[d.getDay()]} ${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`
}

function fmtThaiShortDate(d: Date): string {
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`
}

function fmtThaiDateFromISO(iso: string): string {
  try { return fmtThaiDate(parseISO(iso)) } catch { return iso }
}

/** Normalize a date string (may be ISO timestamp) to YYYY-MM-DD for safe comparison. */
function toDateStr(s: string): string {
  return s.slice(0, 10)
}

/** A booking/stay is OCCUPIED if the selected date falls within the stay window (date-only logic). */
function isOccupied(stay: { check_in: string; check_out: string }, dateStr: string): boolean {
  const ci = toDateStr(stay.check_in)
  const co = toDateStr(stay.check_out)
  return ci <= dateStr && dateStr < co
}

/** Check if a booking is upcoming: selectedDate < check_in <= selectedDate + N days. */
function isUpcoming(stay: { check_in: string }, dateStr: string, limitStr: string): boolean {
  const ci = toDateStr(stay.check_in)
  return ci > dateStr && ci <= limitStr
}

// ─── Derived types ────────────────────────────────────────────────────────────

interface GroupedBooking {
  booking: TimelineBooking
  roomNumbers: string[]
  roomTypeName?: string
}

interface RoomWithStatus {
  room: TimelineRoom
  displayStatus: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE'
  occupyingBooking?: TimelineBooking
  roomTypeName?: string
}

interface RoomTypeAvail {
  name: string
  total: number
  occupied: number
  reserved: number
  available: number
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface MobileTimelineListProps {
  rooms: TimelineRoom[]
  /** YYYY-MM-DD string for the currently-selected mobile day. */
  selectedDateStr: string
  bookingColorMap: Record<string, string>
  roomTypeNameMap: Record<string, string>
  unassignedStays: UnassignedStay[]
  onSelectBooking: (booking: TimelineBooking, roomNumbers?: string[]) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MobileTimelineList = React.memo(function MobileTimelineList({
  rooms,
  selectedDateStr,
  bookingColorMap,
  roomTypeNameMap,
  unassignedStays,
  onSelectBooking,
}: MobileTimelineListProps) {
  const navigate = useNavigate()
  const selectedDate = parseISO(selectedDateStr)
  const isTodayDate = isToday(selectedDate)

  // ── Single-pass derivation ──────────────────────────────────────────────────
  const {
    freeRooms,
    currentStays,
    upcomingStays,
    relevantUnassigned,
    availByType,
    stats,
  } = useMemo(() => {
    const dateStr = selectedDateStr
    const upcomingLimitStr = format(addDays(parseISO(selectedDateStr), UPCOMING_WINDOW_DAYS), 'yyyy-MM-dd')

    const free: RoomWithStatus[] = []
    const occupiedMap = new Map<string, GroupedBooking>()
    const upcomingMap = new Map<string, GroupedBooking>()

    // Per-type counters: typeName → { total, occupied }
    const typeCounters = new Map<string, { total: number; occupied: number }>()

    let totalRooms = 0
    let occupiedCount = 0

    for (const room of rooms) {
      const typeName = roomTypeNameMap[room.id] ?? 'อื่นๆ'

      // Skip non-active rooms from availability count
      if (room.status === 'MAINTENANCE' || room.status === 'CLEANING') {
        continue
      }

      totalRooms++

      // Ensure type entry
      if (!typeCounters.has(typeName)) {
        typeCounters.set(typeName, { total: 0, occupied: 0 })
      }
      const tc = typeCounters.get(typeName)!
      tc.total++

      // Check if occupied on selected date
      const occupying = room.bookings.find((b) => isOccupied(b, dateStr))

      if (occupying) {
        occupiedCount++
        tc.occupied++

        // Group by booking_id for currentStays
        const existing = occupiedMap.get(occupying.booking_id)
        if (existing) {
          existing.roomNumbers.push(room.room_number)
        } else {
          occupiedMap.set(occupying.booking_id, {
            booking: occupying,
            roomNumbers: [room.room_number],
            roomTypeName: typeName,
          })
        }
      } else {
        free.push({ room, displayStatus: 'AVAILABLE', roomTypeName: typeName })

        // Check for upcoming arrivals (within 5-day window)
        for (const b of room.bookings) {
          if (isUpcoming(b, dateStr, upcomingLimitStr)) {
            const existing = upcomingMap.get(b.booking_id)
            if (existing) {
              existing.roomNumbers.push(room.room_number)
            } else {
              upcomingMap.set(b.booking_id, {
                booking: b,
                roomNumbers: [room.room_number],
                roomTypeName: typeName,
              })
            }
          }
        }
      }
    }

    // Unassigned bookings that overlap the selected date
    const unassigned = unassignedStays.filter((s) => isOccupied(s, dateStr))

    // Also gather upcoming unassigned
    const upcomingUnassigned = unassignedStays.filter(
      (s) => !isOccupied(s, dateStr) && isUpcoming(s, dateStr, upcomingLimitStr),
    )

    // Count reserved (unassigned) per type
    const reservedByType = new Map<string, number>()
    for (const s of unassigned) {
      const tn = s.room_type_name
      reservedByType.set(tn, (reservedByType.get(tn) ?? 0) + 1)
    }
    const totalReserved = unassigned.length

    // Build per-type availability
    const byType: RoomTypeAvail[] = []
    for (const [name, counts] of typeCounters) {
      const reserved = reservedByType.get(name) ?? 0
      byType.push({
        name,
        total: counts.total,
        occupied: counts.occupied,
        reserved,
        available: Math.max(0, counts.total - counts.occupied - reserved),
      })
    }
    byType.sort((a, b) => a.name.localeCompare(b.name, 'th'))

    const totalAvail = Math.max(0, totalRooms - occupiedCount - totalReserved)

    return {
      freeRooms: free,
      currentStays: Array.from(occupiedMap.values()),
      upcomingStays: {
        assigned: Array.from(upcomingMap.values()),
        unassigned: upcomingUnassigned,
      },
      relevantUnassigned: unassigned,
      availByType: byType,
      stats: {
        total: totalRooms,
        free: totalAvail,
        occupied: occupiedCount,
        reserved: totalReserved,
      },
    }
  }, [rooms, selectedDateStr, unassignedStays, roomTypeNameMap])

  const totalUpcoming =
    upcomingStays.assigned.length + upcomingStays.unassigned.length

  return (
    <div className="flex-1 overflow-auto px-4 pb-6 space-y-4">

      {/* ── KPI: Availability by Room Type ──────────────────────────────────── */}
      <div className="pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            ห้องว่าง — {fmtThaiShortDate(selectedDate)}
            {isTodayDate && (
              <Badge variant="default" className="ml-2 text-[10px] px-1.5 py-0">
                วันนี้
              </Badge>
            )}
          </p>
        </div>

        <Card>
          <CardContent className="p-3 space-y-2">
            {/* Per-type rows */}
            {availByType.map((rt) => (
              <div key={rt.name} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{rt.name}</span>
                <span className={cn(
                  'text-sm font-semibold tabular-nums',
                  rt.available === 0 ? 'text-destructive' : 'text-success',
                )}>
                  {rt.available === 0 ? 'เต็ม' : `${rt.available} ว่าง`}
                </span>
              </div>
            ))}

            {availByType.length > 1 && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">รวม</span>
                  <span className={cn(
                    'text-sm font-bold tabular-nums',
                    stats.free === 0 ? 'text-destructive' : 'text-success',
                  )}>
                    {stats.free === 0 ? 'เต็ม' : `${stats.free} ว่าง`}
                  </span>
                </div>
              </>
            )}

            {/* Breakdown line */}
            <p className="text-[10px] text-muted-foreground tabular-nums">
              ทั้งหมด {stats.total} · เข้าพัก {stats.occupied}
              {stats.reserved > 0 && ` · จอง ${stats.reserved}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Stay Availability Checker ────────────────────────────────────────── */}
      <StayAvailabilityCard />

      {/* ── Section 1: Unassigned Bookings ───────────────────────────────────── */}
      {relevantUnassigned.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            จองแล้ว (ยังไม่กำหนดห้อง)
          </p>
          {relevantUnassigned.map((stay, i) => {
            const nights = differenceInDays(parseISO(stay.check_out), parseISO(stay.check_in))
            return (
              <div
                key={`${stay.booking_id}-${i}`}
                className="rounded-lg border border-warning/30 bg-warning-muted px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-warning-muted-foreground truncate">
                    {stay.guest_name}
                  </span>
                  <span className="text-[11px] text-warning-muted-foreground shrink-0 ml-2">
                    {nights} คืน
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-warning-muted-foreground">
                  <span>{stay.room_type_name}</span>
                  <span>
                    {fmtThaiDateFromISO(stay.check_in)} → {fmtThaiDateFromISO(stay.check_out)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => navigate(ROUTES.bookings.groupCheckIn(stay.booking_id))}
                >
                  Assign Room
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Section 2: Occupied ──────────────────────────────────────────────── */}
      {currentStays.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            เข้าพักอยู่ ({currentStays.length})
          </p>
          {currentStays.map(({ booking, roomNumbers }) => {
            const colorClass = bookingColorMap[booking.booking_id] ?? ''
            return (
              <button
                key={booking.booking_id}
                type="button"
                onClick={() => onSelectBooking(booking, roomNumbers)}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-left',
                  'hover:bg-muted/50 transition-colors',
                  colorClass,
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold truncate">{booking.guest_name}</span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {booking.balance_amount > 0 ? (
                      <span className="text-[10px] text-destructive font-medium">
                        ค้าง {booking.balance_amount.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[10px] text-success font-medium">ชำระแล้ว</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground/70">
                    {roomNumbers.join(' · ')}
                    {roomNumbers.length > 1 && (
                      <span className="text-[10px] ml-1">({roomNumbers.length} ห้อง)</span>
                    )}
                  </span>
                  <span>
                    {fmtThaiDateFromISO(booking.check_in)} → {fmtThaiDateFromISO(booking.check_out)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Section 3: Upcoming Arrivals ─────────────────────────────────────── */}
      {totalUpcoming > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            จะมาถึง ({totalUpcoming})
          </p>

          {upcomingStays.assigned.map(({ booking, roomNumbers, roomTypeName }) => {
            const nights = differenceInDays(parseISO(booking.check_out), parseISO(booking.check_in))
            return (
              <button
                key={booking.booking_id}
                type="button"
                onClick={() => onSelectBooking(booking, roomNumbers)}
                className="w-full rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground truncate">
                    {booking.guest_name}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                    {nights} คืน
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                  <span>{roomNumbers.join(' · ')}</span>
                  {roomTypeName && <span>{roomTypeName}</span>}
                  <span>
                    เข้าพัก {fmtThaiDateFromISO(booking.check_in)}
                  </span>
                </div>
              </button>
            )
          })}

          {upcomingStays.unassigned.map((stay, i) => {
            const nights = differenceInDays(parseISO(stay.check_out), parseISO(stay.check_in))
            return (
              <div
                key={`upcoming-${stay.booking_id}-${i}`}
                className="rounded-lg border border-dashed bg-muted/30 px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground truncate">
                    {stay.guest_name}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                    {nights} คืน
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                  <Badge variant="amber" className="text-[10px] px-1.5 py-0">
                    ยังไม่ assign ห้อง
                  </Badge>
                  <span>{stay.room_type_name}</span>
                  <span>เข้าพัก {fmtThaiDateFromISO(stay.check_in)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Section 4: Available Rooms ────────────────────────────────────────── */}
      {freeRooms.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            ห้องว่าง ({freeRooms.length})
          </p>
          <div className="grid grid-cols-2 gap-2">
            {freeRooms.map(({ room, roomTypeName }) => (
              <div
                key={room.id}
                className="h-8 rounded-full px-3 text-sm flex items-center gap-2 border bg-card border-border"
              >
                <span className="w-2 h-2 rounded-full shrink-0 bg-success" />
                <span className="font-medium">{room.room_number}</span>
                {roomTypeName && (
                  <span className="text-[10px] text-muted-foreground truncate">
                    {roomTypeName}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})
