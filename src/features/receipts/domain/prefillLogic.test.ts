import { describe, it, expect } from 'vitest'
import type { InvoicePrefillResponse } from '@/features/bookings/types'
import { mapPrefillToFormValues, buildPrefillNotes } from './prefillLogic'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePrefill(
  overrides: Partial<InvoicePrefillResponse> = {},
): InvoicePrefillResponse {
  return {
    booking_id: 'b-1',
    mode: 'booking',
    guest_name: '',
    guest_phone: '',
    customer_id: undefined,
    check_in_date: '',
    check_out_date: '',
    nights: 1,
    room_numbers: '101',
    payment_method: '',
    total_amount: 1000,
    paid_amount: 0,
    balance_amount: 1000,
    items: [],
    ...overrides,
  }
}

// ── buildPrefillNotes ────────────────────────────────────────────────────────

describe('buildPrefillNotes', () => {
  it('returns both name and phone joined by newline', () => {
    expect(buildPrefillNotes('สมชาย', '0812345678')).toBe(
      'ผู้เข้าพัก: สมชาย\nโทร: 0812345678',
    )
  })

  it('returns only name when phone is empty', () => {
    expect(buildPrefillNotes('สมชาย', '')).toBe('ผู้เข้าพัก: สมชาย')
  })

  it('returns only name when phone is undefined', () => {
    expect(buildPrefillNotes('สมชาย')).toBe('ผู้เข้าพัก: สมชาย')
  })

  it('returns only phone when name is empty', () => {
    expect(buildPrefillNotes('', '0812345678')).toBe('โทร: 0812345678')
  })

  it('returns only phone when name is undefined', () => {
    expect(buildPrefillNotes(undefined, '0812345678')).toBe('โทร: 0812345678')
  })

  it('returns undefined when both are empty', () => {
    expect(buildPrefillNotes('', '')).toBeUndefined()
  })

  it('returns undefined when both are undefined', () => {
    expect(buildPrefillNotes()).toBeUndefined()
  })
})

// ── mapPrefillToFormValues ───────────────────────────────────────────────────

describe('mapPrefillToFormValues', () => {
  it('maps check_in_date sliced to 10 chars', () => {
    const result = mapPrefillToFormValues(
      makePrefill({ check_in_date: '2025-03-15T00:00:00Z' }),
    )
    expect(result.check_in_date).toBe('2025-03-15')
  })

  it('maps CASH payment method via METHOD_MAP', () => {
    const result = mapPrefillToFormValues(
      makePrefill({ payment_method: 'CASH' }),
    )
    expect(result.payment_method).toBe('เงินสด')
  })

  it('maps TRANSFER payment method via METHOD_MAP', () => {
    const result = mapPrefillToFormValues(
      makePrefill({ payment_method: 'TRANSFER' }),
    )
    expect(result.payment_method).toBe('โอนเงิน')
  })

  it('passes through unknown payment method as-is', () => {
    const result = mapPrefillToFormValues(
      makePrefill({ payment_method: 'CREDIT_CARD' }),
    )
    expect(result.payment_method).toBe('CREDIT_CARD')
  })

  it('maps items keeping only description, quantity, unit_price', () => {
    const result = mapPrefillToFormValues(
      makePrefill({
        items: [
          { description: 'ห้อง 101', quantity: 2, unit_price: 1500, amount: 3000 },
          { description: 'ห้อง 102', quantity: 1, unit_price: 2000, amount: 2000 },
        ],
      }),
    )
    expect(result.items).toEqual([
      { description: 'ห้อง 101', quantity: 2, unit_price: 1500 },
      { description: 'ห้อง 102', quantity: 1, unit_price: 2000 },
    ])
  })

  it('does not set items when array is empty', () => {
    const result = mapPrefillToFormValues(makePrefill({ items: [] }))
    expect(result.items).toBeUndefined()
  })

  it('sets notes from guest name and phone', () => {
    const result = mapPrefillToFormValues(
      makePrefill({ guest_name: 'สมชาย', guest_phone: '0899999999' }),
    )
    expect(result.notes).toBe('ผู้เข้าพัก: สมชาย\nโทร: 0899999999')
  })

  it('does not set notes when guest info is empty', () => {
    const result = mapPrefillToFormValues(makePrefill())
    expect(result.notes).toBeUndefined()
  })

  it('omits fields when source data is empty', () => {
    const result = mapPrefillToFormValues(makePrefill())
    expect(result.check_in_date).toBeUndefined()
    expect(result.payment_method).toBeUndefined()
    expect(result.items).toBeUndefined()
    expect(result.notes).toBeUndefined()
  })

  it('maps all fields together', () => {
    const result = mapPrefillToFormValues(
      makePrefill({
        check_in_date: '2025-06-01T00:00:00Z',
        payment_method: 'CASH',
        guest_name: 'วิชัย',
        guest_phone: '0811111111',
        items: [{ description: 'ห้อง Deluxe', quantity: 3, unit_price: 2500, amount: 7500 }],
      }),
    )
    expect(result).toEqual({
      check_in_date: '2025-06-01',
      payment_method: 'เงินสด',
      items: [{ description: 'ห้อง Deluxe', quantity: 3, unit_price: 2500 }],
      notes: 'ผู้เข้าพัก: วิชัย\nโทร: 0811111111',
    })
  })
})
