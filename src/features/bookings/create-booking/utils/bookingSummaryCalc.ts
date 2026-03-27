import { calcNights, calcLineTotal, calcKeyDeposit } from './bookingCalc'

// ── Types ────────────────────────────────────────────────────────────────────

export interface LineItem {
  index: number
  name: string
  quantity: number
  nights: number
  price: number
  rackPrice: number
  hasDiscount: boolean
  subtotal: number
}

interface RoomItem {
  room_type_id: string
  check_in: string
  check_out: string
  quantity?: number
  charged_price?: number
}

// ── Calculators ──────────────────────────────────────────────────────────────

/** Build display line items from form items using room-type price and name maps. */
export function calcLineItems(
  items: RoomItem[],
  priceMap: Record<string, number>,
  nameMap: Record<string, string>,
): LineItem[] {
  return items
    .map((item, i) => {
      const rackPrice = priceMap[item.room_type_id]
      if (rackPrice == null) return null
      const nights = calcNights(item.check_in, item.check_out)
      if (nights <= 0) return null
      const qty = Math.max(1, item.quantity ?? 1)
      const price = item.charged_price ?? rackPrice
      return {
        index: i,
        name: nameMap[item.room_type_id] ?? 'ห้อง',
        quantity: qty,
        nights,
        price,
        rackPrice,
        hasDiscount: item.charged_price != null && item.charged_price < rackPrice,
        subtotal: calcLineTotal(price, qty, nights),
      }
    })
    .filter((l): l is LineItem => l != null)
}

/** Calculate deposit amounts based on payment mode. */
export function calcDepositSplit(
  paymentMode: string,
  totalRooms: number,
): { depositInPayment: number; depositToCollect: number } {
  const depositPerRoom = calcKeyDeposit(totalRooms)
  return {
    depositInPayment: paymentMode === 'full_deposit' ? depositPerRoom : 0,
    depositToCollect: paymentMode === 'full_deposit' ? 0 : depositPerRoom,
  }
}

/** Calculate total rooms from form items. */
export function calcTotalRooms(items: { quantity?: number }[]): number {
  return items.reduce((s, i) => s + Math.max(1, i.quantity ?? 1), 0)
}
