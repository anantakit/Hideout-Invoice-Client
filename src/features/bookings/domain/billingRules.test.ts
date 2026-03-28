import { describe, expect, it } from 'vitest'
import { buildReceiptUrl, isValidBillingSelection } from './billingRules'

// ── isValidBillingSelection ──────────────────

describe('isValidBillingSelection', () => {
  it('returns true for booking mode regardless of selections', () => {
    expect(isValidBillingSelection('booking', [], '', '')).toBe(true)
  })

  it('returns true for stay mode with selected stays', () => {
    expect(isValidBillingSelection('stay', ['s1', 's2'], '', '')).toBe(true)
  })

  it('returns false for stay mode with no selections', () => {
    expect(isValidBillingSelection('stay', [], '', '')).toBe(false)
  })

  it('returns true for night mode with stayId and date', () => {
    expect(
      isValidBillingSelection('night', [], 'stay-1', '2025-01-15'),
    ).toBe(true)
  })

  it('returns false for night mode without date', () => {
    expect(isValidBillingSelection('night', [], 'stay-1', '')).toBe(false)
  })

  it('returns false for night mode without stayId', () => {
    expect(isValidBillingSelection('night', [], '', '2025-01-15')).toBe(false)
  })

  it('returns false for night mode with neither stayId nor date', () => {
    expect(isValidBillingSelection('night', [], '', '')).toBe(false)
  })
})

// ── buildReceiptUrl ──────────────────

describe('buildReceiptUrl', () => {
  it('builds URL for booking mode with only booking_id', () => {
    const url = buildReceiptUrl('b1', 'booking', [], '', '')
    expect(url).toBe('/receipts/new?booking_id=b1')
  })

  it('builds URL for stay mode with stay_ids', () => {
    const url = buildReceiptUrl('b1', 'stay', ['s1', 's2'], '', '')
    expect(url).toContain('booking_id=b1')
    expect(url).toContain('mode=stay')
    expect(url).toContain('stay_ids=s1%2Cs2')
  })

  it('builds URL for night mode with stayId and date', () => {
    const url = buildReceiptUrl('b1', 'night', [], 'stay-1', '2025-01-15')
    expect(url).toContain('booking_id=b1')
    expect(url).toContain('mode=night')
    expect(url).toContain('stay_ids=stay-1')
    expect(url).toContain('date=2025-01-15')
  })

  it('builds URL for night mode without date', () => {
    const url = buildReceiptUrl('b1', 'night', [], 'stay-1', '')
    expect(url).toContain('mode=night')
    expect(url).toContain('stay_ids=stay-1')
    expect(url).not.toContain('date=')
  })

  it('does not include mode param for booking mode', () => {
    const url = buildReceiptUrl('b1', 'booking', [], '', '')
    expect(url).not.toContain('mode=')
  })
})
