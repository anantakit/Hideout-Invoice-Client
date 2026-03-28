import { describe, it, expect } from 'vitest'
import { buildCreatePayload, buildEditPayload } from './paymentCalc'
import type { PaymentResponse } from '../types'
import type { PaymentFormValues } from '../booking-detail/payment/usePaymentPanel'

// ── Fixtures ────────────────────────────────────────────────────────────────

const originalPayment: PaymentResponse = {
  id: 'p1',
  booking_id: 'b1',
  amount: 1000,
  type: 'PAYMENT',
  method: 'CASH',
  note: 'ชำระครั้งแรก',
  created_at: '2025-03-15T00:00:00Z',
  created_by: 'user-1',
}

// ── buildCreatePayload ──────────────────────────────────────────────────────

describe('buildCreatePayload', () => {
  it('converts amount string to number', () => {
    const result = buildCreatePayload({ amount: '1500', method: 'CASH' })
    expect(result.amount).toBe(1500)
  })

  it('preserves CASH method', () => {
    const result = buildCreatePayload({ amount: '500', method: 'CASH' })
    expect(result.method).toBe('CASH')
  })

  it('preserves TRANSFER method', () => {
    const result = buildCreatePayload({ amount: '500', method: 'TRANSFER' })
    expect(result.method).toBe('TRANSFER')
  })

  it('includes note when provided', () => {
    const result = buildCreatePayload({ amount: '500', method: 'CASH', note: 'หมายเหตุ' })
    expect(result.note).toBe('หมายเหตุ')
  })

  it('converts empty note to undefined', () => {
    const result = buildCreatePayload({ amount: '500', method: 'CASH', note: '' })
    expect(result.note).toBeUndefined()
  })

  it('treats missing note as undefined', () => {
    const result = buildCreatePayload({ amount: '500', method: 'CASH' })
    expect(result.note).toBeUndefined()
  })

  it('handles decimal amount', () => {
    const result = buildCreatePayload({ amount: '1500.50', method: 'TRANSFER' })
    expect(result.amount).toBe(1500.5)
  })

  it('handles zero amount', () => {
    const result = buildCreatePayload({ amount: '0', method: 'CASH' })
    expect(result.amount).toBe(0)
  })
})

// ── buildEditPayload ────────────────────────────────────────────────────────

describe('buildEditPayload', () => {
  it('returns null when nothing changed', () => {
    const values: PaymentFormValues = {
      amount: '1000',
      method: 'CASH',
      note: 'ชำระครั้งแรก',
    }
    expect(buildEditPayload(originalPayment, values)).toBeNull()
  })

  it('returns only changed amount', () => {
    const values: PaymentFormValues = {
      amount: '2000',
      method: 'CASH',
      note: 'ชำระครั้งแรก',
    }
    expect(buildEditPayload(originalPayment, values)).toEqual({ amount: 2000 })
  })

  it('returns only changed method', () => {
    const values: PaymentFormValues = {
      amount: '1000',
      method: 'TRANSFER',
      note: 'ชำระครั้งแรก',
    }
    expect(buildEditPayload(originalPayment, values)).toEqual({ method: 'TRANSFER' })
  })

  it('returns only changed note', () => {
    const values: PaymentFormValues = {
      amount: '1000',
      method: 'CASH',
      note: 'อัปเดตแล้ว',
    }
    expect(buildEditPayload(originalPayment, values)).toEqual({ note: 'อัปเดตแล้ว' })
  })

  it('returns all changed fields when everything changed', () => {
    const values: PaymentFormValues = {
      amount: '5000',
      method: 'TRANSFER',
      note: 'เปลี่ยนทั้งหมด',
    }
    expect(buildEditPayload(originalPayment, values)).toEqual({
      amount: 5000,
      method: 'TRANSFER',
      note: 'เปลี่ยนทั้งหมด',
    })
  })

  it('handles note cleared to empty string', () => {
    const values: PaymentFormValues = {
      amount: '1000',
      method: 'CASH',
      note: '',
    }
    expect(buildEditPayload(originalPayment, values)).toEqual({ note: '' })
  })

  it('treats undefined note same as empty when original has no note', () => {
    const noNotePayment = { ...originalPayment, note: undefined }
    const values: PaymentFormValues = {
      amount: '1000',
      method: 'CASH',
      note: undefined,
    }
    expect(buildEditPayload(noNotePayment, values)).toBeNull()
  })

  it('detects note added when original had no note', () => {
    const noNotePayment = { ...originalPayment, note: undefined }
    const values: PaymentFormValues = {
      amount: '1000',
      method: 'CASH',
      note: 'เพิ่มหมายเหตุ',
    }
    expect(buildEditPayload(noNotePayment, values)).toEqual({ note: 'เพิ่มหมายเหตุ' })
  })
})
