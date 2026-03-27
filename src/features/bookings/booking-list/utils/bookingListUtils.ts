import type { BookingResponse } from '../../types'

/** Format room labels as { label, count } for two-line display. */
export function getRoomInfo(booking: BookingResponse): { label: string; count: number } {
  const active = booking.room_stays.filter((s) => s.status !== 'CANCELLED')
  if (active.length === 0) return { label: '—', count: 0 }

  const assigned = active.filter((s) => s.room_number)
  const unassigned = active.filter((s) => !s.room_number)

  const parts: string[] = []

  if (assigned.length > 0) {
    parts.push(assigned.map((s) => s.room_number).join(', '))
  }

  if (unassigned.length > 0) {
    const grouped: Record<string, number> = {}
    for (const s of unassigned) {
      grouped[s.room_type_name] = (grouped[s.room_type_name] || 0) + 1
    }
    for (const [name, count] of Object.entries(grouped)) {
      parts.push(count > 1 ? `${name} x ${count}` : name)
    }
  }

  return { label: parts.join(', '), count: active.length }
}

/** Extract earliest check_in and latest check_out from a booking's stays. */
export function getStayRange(booking: BookingResponse): { checkIn: string; checkOut: string } | null {
  const stays = booking.room_stays
  if (!stays || stays.length === 0) return null
  let earliest = stays[0].check_in
  let latest = stays[0].check_out
  for (let i = 1; i < stays.length; i++) {
    if (stays[i].check_in < earliest) earliest = stays[i].check_in
    if (stays[i].check_out > latest) latest = stays[i].check_out
  }
  return { checkIn: earliest, checkOut: latest }
}
