import { describe, it, expect } from 'vitest'
import { filterPaymentsByType } from './paymentUtils'
import type { PaymentResponse, PaymentType } from '../../types'

function makePayment(type: PaymentType, id = '1'): PaymentResponse {
  return {
    id,
    booking_id: 'b1',
    amount: 1000,
    type,
    method: 'CASH',
    created_at: '2024-03-01T00:00:00Z',
    created_by: 'admin',
  }
}

describe('filterPaymentsByType', () => {
  const payments = [
    makePayment('PAYMENT', '1'),
    makePayment('DEPOSIT', '2'),
    makePayment('REFUND', '3'),
    makePayment('DEPOSIT_REFUND', '4'),
    makePayment('PAYMENT', '5'),
  ]

  it('filters by single type', () => {
    const result = filterPaymentsByType(payments, ['DEPOSIT'])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
  })

  it('filters by multiple types', () => {
    const result = filterPaymentsByType(payments, ['PAYMENT', 'REFUND'])
    expect(result).toHaveLength(3)
    expect(result.map((p) => p.id)).toEqual(['1', '3', '5'])
  })

  it('returns empty array when no matches', () => {
    const result = filterPaymentsByType(payments, ['DEPOSIT_REFUND'])
    expect(result).toHaveLength(1)
  })

  it('returns empty array for empty types filter', () => {
    const result = filterPaymentsByType(payments, [])
    expect(result).toHaveLength(0)
  })

  it('returns empty array for empty payments', () => {
    const result = filterPaymentsByType([], ['PAYMENT'])
    expect(result).toHaveLength(0)
  })
})
