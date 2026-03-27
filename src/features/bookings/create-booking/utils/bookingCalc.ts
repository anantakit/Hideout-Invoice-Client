import { differenceInDays, isValid } from 'date-fns'
import { KEY_DEPOSIT_PER_ROOM } from '../../constants'

/**
 * Calculate the number of nights between check-in and check-out dates.
 * Returns 0 for invalid or empty input.
 */
export function calcNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0
  const [cy, cm, cd] = checkIn.split('-').map(Number)
  const [oy, om, od] = checkOut.split('-').map(Number)
  if (!cy || !cm || !cd || !oy || !om || !od) return 0
  const ci = new Date(cy, cm - 1, cd)
  const co = new Date(oy, om - 1, od)
  if (!isValid(ci) || !isValid(co)) return 0
  return Math.max(0, differenceInDays(co, ci))
}

/** Calculate line total: price × quantity × nights */
export function calcLineTotal(price: number, qty: number, nights: number): number {
  return price * qty * nights
}

/** Calculate key deposit amount for a given number of rooms */
export function calcKeyDeposit(totalRooms: number): number {
  return KEY_DEPOSIT_PER_ROOM * totalRooms
}
