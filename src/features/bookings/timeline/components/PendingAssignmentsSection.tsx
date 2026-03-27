import { useState, useMemo } from 'react'
import { parseISO, differenceInDays } from 'date-fns'
import { ChevronDown, BedDouble } from 'lucide-react'
import { CardButton } from '@/shared/ui/card-button'
import { cn, todayISO, addDaysISO, fmtShort } from '@/shared/utils'
import { Badge } from '@/shared/ui/badge'
import type { UnassignedStay } from '../../types'
import { toDateStr } from '../utils/operationTypes'
import { useAutoAssignRooms } from '../hooks/useAutoAssignRooms'
import { PendingDateSection } from './PendingDateSection'

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
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null)
  const [autoAssignDate, setAutoAssignDate] = useState<string | null>(null)
  const todayStr = todayISO()

  const { mutate: autoAssignMutate, isPending: autoAssignPending } = useAutoAssignRooms({
    onSettled: () => setAutoAssignDate(null),
  })

  const handleAutoAssign = (date: string) => {
    setAutoAssignDate(date)
    autoAssignMutate(date)
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
          fmtShort(d)
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
      <span className="text-label text-muted-foreground flex items-center space-inline">
        <BedDouble className="w-3 h-3" />
        รอมอบหมายห้อง
        <Badge variant="amber" className="tabular-nums ml-0.5 text-micro px-1.5 py-0">{totalStays}</Badge>
      </span>

      <div className="space-y-3">
        {urgentSections.map((section) => (
          <PendingDateSection
            key={section.dateStr}
            section={section}
            expandedBookingId={expandedBookingId}
            setExpandedBookingId={setExpandedBookingId}
            autoAssign={{ isPending: autoAssignPending }}
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
            <PendingDateSection
              key={section.dateStr}
              section={section}
              expandedBookingId={expandedBookingId}
              setExpandedBookingId={setExpandedBookingId}
              autoAssign={{ isPending: autoAssignPending }}
              autoAssignDate={autoAssignDate}
              handleAutoAssign={handleAutoAssign}
            />
          ))}
        </div>
      )}
    </div>
  )
}
