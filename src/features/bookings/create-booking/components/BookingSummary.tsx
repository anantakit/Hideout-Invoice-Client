import { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { differenceInDays, isValid } from 'date-fns'
import { formatTHB } from '@/shared/utils'
import { Card, CardContent } from '@/shared/ui/card'
import { Separator } from '@/shared/ui/separator'
import { useRoomTypes } from '../../hooks'
import type { CreateBookingFormValues } from '../utils/createBookingSchema'
import { KEY_DEPOSIT_PER_ROOM } from '../../constants'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0
  const [cy, cm, cd] = checkIn.split('-').map(Number)
  const [oy, om, od] = checkOut.split('-').map(Number)
  if (!cy || !cm || !cd || !oy || !om || !od) return 0
  const ci = new Date(cy, cm - 1, cd)
  const co = new Date(oy, om - 1, od)
  if (!isValid(ci) || !isValid(co)) return 0
  return Math.max(0, differenceInDays(co, ci))
}

// ─── BookingSummary ────────────────────────────────────────────────────────────

/**
 * Shows a per-item cost breakdown and grand total derived from the form context.
 * Each line represents one room-type group: price × rooms × nights.
 * Renders nothing when there are no items with valid dates + a known price.
 *
 * Must be rendered inside the same `<Form>` (FormProvider) as `RoomTypeBookingBuilder`.
 */
export function BookingSummary() {
  const form = useFormContext<CreateBookingFormValues>()
  const items         = useWatch({ control: form.control, name: 'items' })
  const paymentMode   = useWatch({ control: form.control, name: 'payment_mode' })
  const paymentAmount = useWatch({ control: form.control, name: 'payment_amount' })

  const { data: roomTypes = [] } = useRoomTypes()

  const priceMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const rt of roomTypes) {
      if (rt.price_per_night != null) m[rt.id] = rt.price_per_night
    }
    return m
  }, [roomTypes])

  const nameMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const rt of roomTypes) m[rt.id] = rt.name
    return m
  }, [roomTypes])

  const lines = useMemo(() => {
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
          subtotal: price * nights * qty,
        }
      })
      .filter(Boolean) as {
        index: number
        name: string
        quantity: number
        nights: number
        price: number
        rackPrice: number
        hasDiscount: boolean
        subtotal: number
      }[]
  }, [items, priceMap, nameMap])

  const roomTotal = useMemo(() => lines.reduce((s, l) => s + l.subtotal, 0), [lines])
  const totalRooms = items.reduce((s, i) => s + Math.max(1, i.quantity ?? 1), 0)
  const depositAmount = paymentMode === 'full_deposit' ? KEY_DEPOSIT_PER_ROOM * totalRooms : 0

  if (lines.length === 0) return null

  return (
    <Card className="bg-muted/30">
      <CardContent className="pt-4 pb-4 space-y-2">
        {lines.map((line) => (
          <div key={line.index} className="flex justify-between text-body">
            <span className="text-muted-foreground">
              {line.name}
              {' × '}
              <span className="font-medium text-foreground">{line.quantity} ห้อง</span>
              {' × '}
              {line.nights} คืน
              {line.hasDiscount && (
                <span className="ml-1">
                  (<span className="line-through">{formatTHB(line.rackPrice)}</span>
                  {' → '}
                  <span className="text-primary">{formatTHB(line.price)}</span>)
                </span>
              )}
            </span>
            <span className="font-medium text-foreground tabular-nums">
              {formatTHB(line.subtotal)}
            </span>
          </div>
        ))}

        {depositAmount > 0 && (
          <div className="flex justify-between text-body">
            <span className="text-muted-foreground">
              ประกันกุญแจ ({totalRooms} ห้อง × ฿{KEY_DEPOSIT_PER_ROOM})
            </span>
            <span className="font-medium text-foreground tabular-nums">
              {formatTHB(depositAmount)}
            </span>
          </div>
        )}

        {(lines.length > 1 || depositAmount > 0) && (
          <>
            <Separator />
            <div className="flex justify-between text-body font-semibold">
              <span>{depositAmount > 0 ? 'รวมทั้งหมด (ค่าห้อง + ประกัน)' : 'รวมทั้งหมด'}</span>
              <span className="tabular-nums">{formatTHB(roomTotal + depositAmount)}</span>
            </div>
          </>
        )}

        {paymentMode !== 'reserve' && paymentAmount != null && paymentAmount > 0 && (
          <>
            <Separator />
            <div className="flex justify-between text-body">
              <span className="text-muted-foreground">ชำระเดี๋ยวนี้</span>
              <span className="font-semibold text-primary tabular-nums">
                {formatTHB(paymentAmount)}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── useTotalAmount ───────────────────────────────────────────────────────────

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
      return sum + price * nights * qty
    }, 0)
  }, [items, roomTypes])
}
