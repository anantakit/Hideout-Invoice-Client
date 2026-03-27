import { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useRoomTypes } from '../../hooks'
import { calcNights, calcLineTotal } from '../utils/bookingCalc'
import type { CreateBookingFormValues } from '../utils/createBookingSchema'

/** Returns the grand total (price × quantity × nights) for all valid items. */
export function useTotalAmount(): number {
  const form = useFormContext<CreateBookingFormValues>()
  const items = useWatch({ control: form.control, name: 'items' })
  const { data: roomTypes = [] } = useRoomTypes()

  return useMemo(() => {
    const priceMap: Record<string, number> = {}
    for (const rt of roomTypes) {
      if (rt.price_per_night != null) priceMap[rt.id] = rt.price_per_night
    }
    return items.reduce((sum, item) => {
      const rackPrice = priceMap[item.room_type_id]
      if (!rackPrice) return sum
      const price = item.charged_price ?? rackPrice
      const nights = calcNights(item.check_in, item.check_out)
      const qty    = Math.max(1, item.quantity ?? 1)
      return sum + calcLineTotal(price, qty, nights)
    }, 0)
  }, [items, roomTypes])
}
