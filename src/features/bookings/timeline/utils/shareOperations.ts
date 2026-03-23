import { parseISO, subDays } from 'date-fns'
import toast from 'react-hot-toast'
import { fmtShortWithYear, fmtShortISO, formatCompactNumber } from '@/shared/utils'
import type { TimelineRoom } from '../../types'
import { toDateStr, type CheckinBooking, type CheckoutBooking } from './operationTypes'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StayingGuest {
  guestName: string
  roomNumbers: string[]
  /** Earliest check_in among stays */
  checkIn: string
  /** Latest check_out among stays (exclusive — last night = checkOut - 1 day) */
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
      // พักต่อ = เช็คอินก่อนวันนี้ + ยังไม่ออก (ไม่ใช่คนที่เพิ่งเข้าวันนี้)
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

// ─── Share text formatting ──────────────────────────────────────────────────

/** Strip "เตียง" prefix and group by type: "เดี่ยว 1 คู่ 1" */
function fmtUnassignedTypes(types: string[]): string {
  const counts = new Map<string, number>()
  for (const t of types) {
    const short = t.replace(/^เตียง/, '')
    counts.set(short, (counts.get(short) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => `${name} ${count}`)
    .join(' ')
}

/** Format payment/deposit tags for checkin.
 *  "จ่ายครบ" = ค่าห้อง+ประกันจ่ายหมด → ไม่ต้องแสดงรายละเอียดประกัน
 */
function fmtPaymentTags(ci: CheckinBooking): string {
  const b = ci.booking
  if (!b) return ''
  // จ่ายครบ = ไม่ต้องเก็บอะไรเพิ่ม
  if (b.balance_amount <= 0 && b.deposit_status !== 'PENDING') return ' · จ่ายครบ'
  const tags: string[] = []
  if (b.deposit_status === 'PENDING' && b.key_deposit_amount > 0) {
    tags.push(`เก็บ ฿${formatCompactNumber(b.key_deposit_amount)}`)
  } else if (b.deposit_status === 'COLLECTED') {
    tags.push('เก็บแล้ว')
  }
  if (b.balance_amount > 0) tags.push(`ค้าง ฿${formatCompactNumber(b.balance_amount)}`)
  return tags.length > 0 ? ` · ${tags.join(' · ')}` : ''
}

function fmtCheckinLine(ci: CheckinBooking): string {
  const isDone = ci.stayStatuses.every((st) => st === 'CHECKED_IN' || st === 'CHECKED_OUT')
  const doneMark = isDone ? ' ✅' : ''
  const payment = fmtPaymentTags(ci)

  // Unassigned only
  if (ci.assignedRooms.length === 0) {
    const typeLabel = fmtUnassignedTypes(ci.unassignedTypes)
    return `• ⏳ ${ci.guestName} (${ci.nights} คืน ${typeLabel})${payment}${doneMark}`
  }

  const allSame = ci.roomNights.length <= 1 ||
    ci.roomNights.every((r) => r.nights === ci.roomNights[0].nights)

  if (allSame) {
    const rooms = ci.assignedRooms.join(',')
    const nights = ci.roomNights[0]?.nights ?? ci.nights
    return `• ${rooms} — ${ci.guestName} (${nights} คืน ${ci.totalStays} ห้อง)${payment}${doneMark}`
  }

  // Different nights per room — group by nights
  const byNights = new Map<number, string[]>()
  for (const r of ci.roomNights) {
    const list = byNights.get(r.nights) ?? []
    list.push(r.roomNumber)
    byNights.set(r.nights, list)
  }
  const roomPart = [...byNights.entries()]
    .map(([n, rooms]) => `${rooms.join(',')} (${n} คืน)`)
    .join(' ')
  return `• ${roomPart} — ${ci.guestName}${payment}${doneMark}`
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

  const shortType = (name: string) => name.replace(/^เตียง/, '')
  const typeParts = kpi.byType.map((t) => `${shortType(t.name)} ${t.available}/${t.total}`)
  const typeBreakdown = typeParts.length > 0 ? ` (${typeParts.join(' ')})` : ''
  lines.push(`📋 ${fmtShortWithYear(d)} · ว่าง ${Math.max(0, kpi.available)}/${kpi.total}${typeBreakdown}`)
  lines.push('')

  // Check-outs
  const allCheckouts = [...checkouts, ...doneCheckouts]
  if (allCheckouts.length > 0) {
    const coRoomCount = allCheckouts.reduce((sum, co) => sum + co.roomNumbers.length, 0)
    lines.push(`🔴 เช็คเอาท์ (${coRoomCount} ห้อง)`)
    for (const co of allCheckouts) {
      const roomLabel = co.roomNumbers.join(',')
      const isDone = co.stays.every((s) => s.status === 'CHECKED_OUT')
      if (isDone) {
        lines.push(`• ${roomLabel} — ${co.guestName} ✅`)
      } else {
        const tags: string[] = []
        if (co.balance > 0) tags.push(`ค้าง ฿${formatCompactNumber(co.balance)}`)
        if (co.depositStatus === 'COLLECTED') tags.push(`คืน ฿${formatCompactNumber(co.keyDepositAmount)}`)
        else if (co.keyDepositAmount > 0 || co.depositStatus === 'PENDING') tags.push('ไม่คืน')
        const suffix = tags.length > 0 ? ` — ${tags.join(' · ')}` : ''
        lines.push(`• ${roomLabel} — ${co.guestName}${suffix}`)
      }
    }
    lines.push('')
  }

  // Check-ins
  const allCheckins = [...checkins, ...doneCheckins]
  if (allCheckins.length > 0) {
    const ciRoomCount = allCheckins.reduce((sum, ci) => sum + ci.totalStays, 0)
    lines.push(`🟢 เช็คอิน (${ciRoomCount} ห้อง)`)
    for (const ci of allCheckins) {
      lines.push(fmtCheckinLine(ci))
    }
    lines.push('')
  }

  // Staying
  if (stayingGuests.length > 0) {
    lines.push(`🔵 พักต่อ (${stayingGuests.length})`)
    for (const g of stayingGuests) {
      const lastNight = subDays(parseISO(g.checkOut), 1)
      const range = `${fmtShortISO(g.checkIn)}–${fmtShortWithYear(lastNight)}`
      lines.push(`• ${g.roomNumbers.join(',')} — ${g.guestName} (${range})`)
    }
  }

  return lines.join('\n')
}

// ─── Share or copy ───────────────────────────────────────────────────────────

export const isMobileDevice = () =>
  window.matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0

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
