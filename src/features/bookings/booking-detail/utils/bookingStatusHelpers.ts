import { differenceInDays, isToday, isBefore, startOfDay, parseISO, addDays } from 'date-fns'

// ─── Badge variant types ─────────────────────────────────────────────────────

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'blue' | 'gray' | 'green' | 'red' | 'amber'

export function bookingStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'CONFIRMED':            return 'blue'
    case 'PARTIALLY_CHECKED_IN': return 'amber'
    case 'CHECKED_IN':           return 'green'
    case 'CHECKED_OUT':          return 'gray'
    case 'CANCELLED':            return 'red'
    default:                     return 'default'
  }
}

export function stayStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'ASSIGNED':    return 'default'
    case 'CHECKED_IN':  return 'green'
    case 'CHECKED_OUT': return 'gray'
    case 'CANCELLED':   return 'red'
    default:            return 'gray'  // RESERVED
  }
}

// ─── Room group mapper (shared by transfer + extend-conflict) ────────────────

export interface RoomGroupSource {
  room_types: Array<{
    room_type_id: string
    room_type_name: string
    price_per_night: number
    rooms: Array<{ room_id: string; room_number: string; available: boolean }>
  }>
}

export interface RoomGroup {
  typeId: string
  typeName: string
  pricePerNight: number
  isSameType: boolean
  rooms: Array<{ room_id: string; room_number: string; available: boolean }>
}

export function mapRoomGroups(
  source: RoomGroupSource,
  stayRoomTypeId: string,
  excludeRoomId?: string,
): RoomGroup[] {
  return source.room_types
    .map((t) => ({
      typeId: t.room_type_id,
      typeName: t.room_type_name,
      pricePerNight: t.price_per_night,
      isSameType: t.room_type_id === stayRoomTypeId,
      rooms: t.rooms.filter((r) => r.available && r.room_id !== excludeRoomId),
    }))
    .filter((g) => g.rooms.length > 0)
}

// ─── Date helpers ────────────────────────────────────────────────────────────

/** Add n days to an ISO date string → ISO string */
export function addDaysToISO(iso: string, n: number): string {
  const d = addDays(parseISO(iso), n)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function calcNights(checkIn: string, checkOut: string): number {
  try {
    return Math.max(0, differenceInDays(parseISO(checkOut), parseISO(checkIn)))
  } catch {
    return 0
  }
}

export function isCheckInToday(checkIn: string): boolean {
  try {
    return isToday(parseISO(checkIn))
  } catch {
    return false
  }
}

export function isCheckInOverdue(checkIn: string): boolean {
  try {
    return isBefore(startOfDay(parseISO(checkIn)), startOfDay(new Date()))
  } catch {
    return false
  }
}
