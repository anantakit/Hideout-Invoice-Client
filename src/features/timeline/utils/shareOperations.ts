import { parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { fmtShortWithYear, formatCompactNumber, isMobileDevice } from '@/shared/utils'
import type { TimelineRoom } from '@/features/bookings/types'
import { toDateStr, type CheckinBooking, type CheckoutBooking } from './operationTypes'
import { computeDeposit } from '@/features/bookings/shared/depositUtils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StayingGuest {
  guestName: string
  roomNumbers: string[]
  checkIn: string
  checkOut: string
}

// ─── Compute staying guests ──────────────────────────────────────────────────

export function computeStayingGuests(
  rooms: TimelineRoom[],
  dateStr: string,
): StayingGuest[] {
  const map = new Map<string, StayingGuest>()
  for (const room of rooms) {
    if (room.status === 'MAINTENANCE') continue
    for (const b of room.bookings) {
      if (b.status !== 'CHECKED_IN') continue
      const ci = toDateStr(b.check_in)
      const co = toDateStr(b.check_out)
      if (ci < dateStr && co > dateStr) {
        const existing = map.get(b.booking_id)
        if (existing) {
          existing.roomNumbers.push(room.room_number)
          if (ci < existing.checkIn) existing.checkIn = ci
          if (co > existing.checkOut) existing.checkOut = co
        } else {
          map.set(b.booking_id, {
            guestName: b.guest_name,
            roomNumbers: [room.room_number],
            checkIn: ci,
            checkOut: co,
          })
        }
      }
    }
  }
  return Array.from(map.values())
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Strip "เตียง" prefix: "เตียงเดี่ยว" → "เดี่ยว" */
function shortType(name: string): string {
  return name.replace(/^เตียง/, '')
}

/** Short Buddhist year: 2569 → 69 */
function shortBE(d: Date): string {
  const full = fmtShortWithYear(d) // "25 มี.ค. 2569"
  return full.replace(/(\d{4})$/, (y) => y.slice(2))
}

// ─── Check-in line ──────────────────────────────────────────────────────────

function fmtCheckinLine(ci: CheckinBooking): string {
  const b = ci.booking
  const dep = b ? computeDeposit(b) : null
  const isDone = ci.stayStatuses.every((st) => st === 'CHECKED_IN' || st === 'CHECKED_OUT')

  // Payment tag
  let payTag = ''
  if (dep && dep.totalToCollect > 0) {
    payTag = ` เก็บ ${formatCompactNumber(dep.totalToCollect)}`
  } else if (isDone) {
    payTag = ' ✅'
  }

  // Unassigned
  if (ci.assignedRooms.length === 0) {
    return `⏳ ${ci.guestName} ${ci.nights} คืน${payTag}`
  }

  // All same nights
  const allSame = ci.roomNights.length <= 1 ||
    ci.roomNights.every((r) => r.nights === ci.roomNights[0].nights)

  if (allSame) {
    const rooms = ci.assignedRooms.join(',')
    const nights = ci.roomNights[0]?.nights ?? ci.nights
    return `${rooms} ${ci.guestName} ${nights} คืน${payTag}`
  }

  // Different nights — group by nights
  const byNights = new Map<number, string[]>()
  for (const r of ci.roomNights) {
    const list = byNights.get(r.nights) ?? []
    list.push(r.roomNumber)
    byNights.set(r.nights, list)
  }
  const nightParts = [...byNights.entries()]
    .map(([n, rooms]) => `${rooms.join(',')} = ${n} คืน`)
    .join(' ')
  return `${nightParts} ${ci.guestName}${payTag}`
}

// ─── Build share text ────────────────────────────────────────────────────────

export function buildShareText(
  dateStr: string,
  checkouts: CheckoutBooking[],
  doneCheckouts: CheckoutBooking[],
  checkins: CheckinBooking[],
  doneCheckins: CheckinBooking[],
  stayingGuests: StayingGuest[],
  kpi: { total: number; available: number; byType: { name: string; total: number; available: number }[] },
): string {
  const d = parseISO(dateStr)
  const lines: string[] = []

  // Header — แยกบรรทัดเพื่อไม่โดนตัดในแอปแชท
  lines.push(`📋 ${shortBE(d)}`)
  const typeParts = kpi.byType.map((t) => `${shortType(t.name)} ${t.available}`)
  const typeBreakdown = typeParts.length > 0 ? ` (${typeParts.join(' ')})` : ''
  lines.push(`ว่าง ${Math.max(0, kpi.available)}/${kpi.total}${typeBreakdown}`)
  lines.push('')

  // Check-outs
  const allCheckouts = [...checkouts, ...doneCheckouts]
  if (allCheckouts.length > 0) {
    const coRoomCount = allCheckouts.reduce((sum, co) => sum + co.roomNumbers.length, 0)
    lines.push(`ออก ${coRoomCount} ห้อง`)
    for (const co of allCheckouts) {
      const roomLabel = co.roomNumbers.join(',')
      const isDone = co.stays.every((s) => s.status === 'CHECKED_OUT')
      if (isDone) {
        lines.push(`${roomLabel} ${co.guestName} ✅`)
      } else {
        const dep = computeDeposit({
          key_deposit_amount: co.keyDepositAmount,
          deposit_paid: co.depositPaid,
          deposit_status: co.depositStatus,
          balance_amount: co.balance,
        })
        const tags: string[] = []
        if (co.balance > 0) tags.push(`ค้าง ${formatCompactNumber(co.balance)}`)
        if (dep.toReturn > 0) {
          tags.push(`คืน ${formatCompactNumber(dep.toReturn)}`)
        }
        const suffix = tags.length > 0 ? ` ${tags.join(' ')}` : ''
        lines.push(`${roomLabel} ${co.guestName}${suffix}`)
      }
    }
    lines.push('')
  }

  // Check-ins
  const allCheckins = [...checkins, ...doneCheckins]
  if (allCheckins.length > 0) {
    const ciRoomCount = allCheckins.reduce((sum, ci) => sum + ci.totalStays, 0)
    lines.push(`เข้า ${ciRoomCount} ห้อง`)
    for (const ci of allCheckins) {
      lines.push(fmtCheckinLine(ci))
    }
    lines.push('')
  }

  // Staying
  if (stayingGuests.length > 0) {
    lines.push(`พักต่อ ${stayingGuests.length}`)
    for (const g of stayingGuests) {
      lines.push(`${g.roomNumbers.join(',')} ${g.guestName}`)
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

// ─── Share or copy ───────────────────────────────────────────────────────────

export { isMobileDevice }

export async function shareOrCopy(text: string) {
  if (isMobileDevice() && navigator.share) {
    try {
      await navigator.share({ text })
      return
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    toast.success('คัดลอกแล้ว')
  } catch {
    toast.error('ไม่สามารถคัดลอกได้')
  }
}
