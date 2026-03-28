import { describe, it, expect } from 'vitest'
import {
  validateCreateBookingForm,
  buildSubmitLabel,
  buildCreateBookingPayload,
  calculateTotalAmount,
  validateBookingForm,
  buildInlineBookingPayload,
} from './formValidation'
import type { CreateBookingFormValues } from '../create-booking/utils/createBookingSchema'
import type { SelectedRoom } from '@/features/timeline/hooks/useInlineBookingForm'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRoom(overrides: Partial<SelectedRoom> = {}): SelectedRoom {
  return {
    roomId: 'r1',
    roomNumber: '101',
    roomTypeId: 'rt1',
    roomTypeName: 'Standard',
    pricePerNight: 1000,
    ...overrides,
  }
}

// ── validateCreateBookingForm ───────────────────────────────────────────────

describe('validateCreateBookingForm', () => {
  const validItems = [
    { room_type_id: 'rt-1', check_in: '2025-03-15', check_out: '2025-03-17' },
  ]

  it('returns all true when guest, items, and payment are valid', () => {
    const result = validateCreateBookingForm('สมชาย', validItems, 'full', 3000)
    expect(result).toEqual({ hasGuest: true, hasValidItems: true, hasPayment: true })
  })

  it('hasGuest is false for empty string', () => {
    expect(validateCreateBookingForm('', validItems, 'full', 3000).hasGuest).toBe(false)
  })

  it('hasGuest is false for whitespace-only string', () => {
    expect(validateCreateBookingForm('   ', validItems, 'full', 3000).hasGuest).toBe(false)
  })

  it('hasValidItems is false when room_type_id is empty', () => {
    const items = [{ room_type_id: '', check_in: '2025-03-15', check_out: '2025-03-17' }]
    expect(validateCreateBookingForm('สมชาย', items, 'full', 3000).hasValidItems).toBe(false)
  })

  it('hasValidItems is false when check_in is empty', () => {
    const items = [{ room_type_id: 'rt-1', check_in: '', check_out: '2025-03-17' }]
    expect(validateCreateBookingForm('สมชาย', items, 'full', 3000).hasValidItems).toBe(false)
  })

  it('hasValidItems is false when check_out <= check_in', () => {
    const items = [{ room_type_id: 'rt-1', check_in: '2025-03-17', check_out: '2025-03-15' }]
    expect(validateCreateBookingForm('สมชาย', items, 'full', 3000).hasValidItems).toBe(false)
  })

  it('hasValidItems is false when check_out equals check_in', () => {
    const items = [{ room_type_id: 'rt-1', check_in: '2025-03-15', check_out: '2025-03-15' }]
    expect(validateCreateBookingForm('สมชาย', items, 'full', 3000).hasValidItems).toBe(false)
  })

  it('hasValidItems checks all items (second item invalid)', () => {
    const items = [
      { room_type_id: 'rt-1', check_in: '2025-03-15', check_out: '2025-03-17' },
      { room_type_id: '', check_in: '2025-03-15', check_out: '2025-03-17' },
    ]
    expect(validateCreateBookingForm('สมชาย', items, 'full', 3000).hasValidItems).toBe(false)
  })

  it('hasPayment is true for reserve mode regardless of amount', () => {
    expect(validateCreateBookingForm('สมชาย', validItems, 'reserve', undefined).hasPayment).toBe(true)
  })

  it('hasPayment is false when non-reserve and amount is undefined', () => {
    expect(validateCreateBookingForm('สมชาย', validItems, 'full', undefined).hasPayment).toBe(false)
  })

  it('hasPayment is false when non-reserve and amount is 0', () => {
    expect(validateCreateBookingForm('สมชาย', validItems, 'full', 0).hasPayment).toBe(false)
  })

  it('hasPayment is true when non-reserve and amount > 0', () => {
    expect(validateCreateBookingForm('สมชาย', validItems, 'partial', 500).hasPayment).toBe(true)
  })
})

// ── calculateTotalAmount ────────────────────────────────────────────────────

describe('calculateTotalAmount', () => {
  it('returns sum of pricePerNight * nights for all rooms', () => {
    const rooms = [makeRoom({ pricePerNight: 1000 }), makeRoom({ pricePerNight: 1500 })]
    expect(calculateTotalAmount(rooms, 3)).toBe(7500)
  })

  it('uses chargedPrice when present instead of pricePerNight', () => {
    const rooms = [makeRoom({ pricePerNight: 1000, chargedPrice: 800 })]
    expect(calculateTotalAmount(rooms, 2)).toBe(1600)
  })

  it('mixes chargedPrice and pricePerNight across rooms', () => {
    const rooms = [
      makeRoom({ pricePerNight: 1000, chargedPrice: 700 }),
      makeRoom({ pricePerNight: 1500 }),
    ]
    expect(calculateTotalAmount(rooms, 2)).toBe(4400) // (700 + 1500) * 2
  })

  it('returns 0 for empty room list', () => {
    expect(calculateTotalAmount([], 5)).toBe(0)
  })

  it('returns 0 when nights is 0', () => {
    expect(calculateTotalAmount([makeRoom()], 0)).toBe(0)
  })

  it('handles single night', () => {
    expect(calculateTotalAmount([makeRoom({ pricePerNight: 500 })], 1)).toBe(500)
  })
})

// ── validateBookingForm ─────────────────────────────────────────────────────

describe('validateBookingForm', () => {
  it('returns true when all conditions met', () => {
    expect(validateBookingForm(true, true, false)).toBe(true)
  })

  it('returns false when no guest', () => {
    expect(validateBookingForm(false, true, false)).toBe(false)
  })

  it('returns false when no payment', () => {
    expect(validateBookingForm(true, false, false)).toBe(false)
  })

  it('returns false when mutation is pending', () => {
    expect(validateBookingForm(true, true, true)).toBe(false)
  })

  it('returns false when all conditions fail', () => {
    expect(validateBookingForm(false, false, true)).toBe(false)
  })
})

// ── buildSubmitLabel ────────────────────────────────────────────────────────

describe('buildSubmitLabel', () => {
  it('returns walk-in reserve label', () => {
    expect(buildSubmitLabel('walk_in', 'reserve')).toBe('เช็คอิน (ค้างชำระ)')
  })

  it('returns walk-in with payment label', () => {
    expect(buildSubmitLabel('walk_in', 'full')).toBe('เช็คอิน & ชำระเงิน')
    expect(buildSubmitLabel('walk_in', 'partial')).toBe('เช็คอิน & ชำระเงิน')
    expect(buildSubmitLabel('walk_in', 'full_deposit')).toBe('เช็คอิน & ชำระเงิน')
  })

  it('returns advance booking label', () => {
    expect(buildSubmitLabel('advance', 'full')).toBe('ยืนยันการจอง')
    expect(buildSubmitLabel('advance', 'reserve')).toBe('ยืนยันการจอง')
  })
})

// ── buildCreateBookingPayload ───────────────────────────────────────────────

describe('buildCreateBookingPayload', () => {
  const baseValues: CreateBookingFormValues = {
    source: 'advance',
    guest_name: 'สมชาย ใจดี',
    guest_phone: '0812345678',
    customer_id: 'cust-1',
    same_dates: false,
    items: [
      {
        room_type_id: 'rt-1',
        quantity: 2,
        check_in: '2025-03-15',
        check_out: '2025-03-17',
        assigned_room_ids: ['room-1'],
      },
    ],
    payment_mode: 'full',
    payment_amount: 6000,
    payment_method: 'CASH',
    key_deposit_amount: undefined,
  }

  it('expands grouped stays into flat array', () => {
    const payload = buildCreateBookingPayload(baseValues)
    expect(payload.stays).toHaveLength(2)
    expect(payload.stays[0].room_id).toBe('room-1')
    expect(payload.stays[1].room_id).toBeNull()
  })

  it('calculates deposit as KEY_DEPOSIT_PER_ROOM × total rooms', () => {
    const payload = buildCreateBookingPayload(baseValues)
    // 2 rooms × 200 = 400
    expect(payload.key_deposit_amount).toBe(400)
  })

  it('sets deposit_status to COLLECTED for full_deposit mode', () => {
    const values = { ...baseValues, payment_mode: 'full_deposit' as const }
    const payload = buildCreateBookingPayload(values)
    expect(payload.deposit_status).toBe('COLLECTED')
  })

  it('sets deposit_status to PENDING for other modes', () => {
    const payload = buildCreateBookingPayload(baseValues)
    expect(payload.deposit_status).toBe('PENDING')
  })

  it('includes payment when mode is not reserve and amount exists', () => {
    const payload = buildCreateBookingPayload(baseValues)
    expect(payload.payment).toEqual({
      amount: 6000,
      method: 'CASH',
      deposit_amount: undefined,
    })
  })

  it('includes deposit_amount in payment for full_deposit mode', () => {
    const values = {
      ...baseValues,
      payment_mode: 'full_deposit' as const,
      payment_amount: 6400,
    }
    const payload = buildCreateBookingPayload(values)
    expect(payload.payment?.deposit_amount).toBe(400)
  })

  it('omits payment for reserve mode', () => {
    const values = {
      ...baseValues,
      payment_mode: 'reserve' as const,
      payment_amount: undefined,
    }
    const payload = buildCreateBookingPayload(values)
    expect(payload.payment).toBeUndefined()
  })

  it('omits payment when amount is undefined', () => {
    const values = { ...baseValues, payment_amount: undefined }
    const payload = buildCreateBookingPayload(values)
    expect(payload.payment).toBeUndefined()
  })

  it('maps guest fields correctly', () => {
    const payload = buildCreateBookingPayload(baseValues)
    expect(payload.source).toBe('advance')
    expect(payload.guest_name).toBe('สมชาย ใจดี')
    expect(payload.guest_phone).toBe('0812345678')
    expect(payload.customer_id).toBe('cust-1')
  })

  it('omits customer_id when empty string', () => {
    const values = { ...baseValues, customer_id: '' }
    const payload = buildCreateBookingPayload(values)
    expect(payload.customer_id).toBeUndefined()
  })

  it('handles multiple items with different quantities', () => {
    const values: CreateBookingFormValues = {
      ...baseValues,
      items: [
        { room_type_id: 'rt-1', quantity: 1, check_in: '2025-03-15', check_out: '2025-03-17', assigned_room_ids: [] },
        { room_type_id: 'rt-2', quantity: 3, check_in: '2025-03-15', check_out: '2025-03-17', assigned_room_ids: [] },
      ],
    }
    const payload = buildCreateBookingPayload(values)
    expect(payload.stays).toHaveLength(4) // 1 + 3
    expect(payload.key_deposit_amount).toBe(800) // 4 rooms × 200
  })
})

// ── buildInlineBookingPayload ───────────────────────────────────────────────

describe('buildInlineBookingPayload', () => {
  const basePrefill = { checkIn: '2025-03-01', checkOut: '2025-03-03' }
  const baseState = {
    source: 'walk_in' as const,
    guestName: '  สมชาย  ',
    guestPhone: ' 0812345678 ',
    paymentMode: 'full' as const,
    paymentAmount: '2000',
    paymentMethod: 'CASH' as const,
    selectedRooms: [makeRoom()],
  }

  it('builds payload with full payment', () => {
    const result = buildInlineBookingPayload(baseState, basePrefill, 200)

    expect(result.source).toBe('walk_in')
    expect(result.guest_name).toBe('สมชาย')
    expect(result.guest_phone).toBe('0812345678')
    expect(result.key_deposit_amount).toBe(200)
    expect(result.deposit_status).toBe('PENDING')
    expect(result.stays).toEqual([
      { room_type_id: 'rt1', room_id: 'r1', check_in: '2025-03-01', check_out: '2025-03-03' },
    ])
    expect(result.payment).toEqual({ amount: 2000, method: 'CASH', deposit_amount: undefined })
  })

  it('sets deposit_status to COLLECTED for full_deposit mode', () => {
    const state = { ...baseState, paymentMode: 'full_deposit' as const, paymentAmount: '2200' }
    const result = buildInlineBookingPayload(state, basePrefill, 200)

    expect(result.deposit_status).toBe('COLLECTED')
    expect(result.payment).toEqual({ amount: 2200, method: 'CASH', deposit_amount: 200 })
  })

  it('omits payment for reserve mode', () => {
    const state = { ...baseState, paymentMode: 'reserve' as const, paymentAmount: '' }
    const result = buildInlineBookingPayload(state, basePrefill, 200)

    expect(result.payment).toBeUndefined()
    expect(result.deposit_status).toBe('PENDING')
  })

  it('includes charged_price when set on room', () => {
    const state = {
      ...baseState,
      selectedRooms: [makeRoom({ chargedPrice: 800 })],
    }
    const result = buildInlineBookingPayload(state, basePrefill, 200)

    expect(result.stays[0]).toEqual({
      room_type_id: 'rt1',
      room_id: 'r1',
      check_in: '2025-03-01',
      check_out: '2025-03-03',
      charged_price: 800,
    })
  })

  it('handles multiple rooms', () => {
    const state = {
      ...baseState,
      selectedRooms: [
        makeRoom({ roomId: 'r1', roomTypeId: 'rt1' }),
        makeRoom({ roomId: 'r2', roomTypeId: 'rt2' }),
      ],
    }
    const result = buildInlineBookingPayload(state, basePrefill, 400)

    expect(result.stays).toHaveLength(2)
    expect(result.key_deposit_amount).toBe(400)
  })

  it('uses TRANSFER payment method', () => {
    const state = { ...baseState, paymentMethod: 'TRANSFER' as const }
    const result = buildInlineBookingPayload(state, basePrefill, 200)

    expect(result.payment?.method).toBe('TRANSFER')
  })
})
