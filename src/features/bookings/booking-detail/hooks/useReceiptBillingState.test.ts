import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReceiptBillingState } from './useReceiptBillingState'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}))

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useReceiptBillingState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useReceiptBillingState('b1'))

    expect(result.current.showModeSelect).toBe(false)
    expect(result.current.billingMode).toBe('booking')
    expect(result.current.selectedStayIds).toEqual([])
    expect(result.current.selectedStayId).toBe('')
    expect(result.current.selectedDate).toBe('')
  })

  describe('changeBillingMode', () => {
    it('changes billing mode and resets selections', () => {
      const { result } = renderHook(() => useReceiptBillingState('b1'))

      // Set up some state first
      act(() => result.current.toggleStayId('s1'))
      expect(result.current.selectedStayIds).toEqual(['s1'])

      // Change mode → should reset
      act(() => result.current.changeBillingMode('stay'))
      expect(result.current.billingMode).toBe('stay')
      expect(result.current.selectedStayIds).toEqual([])
      expect(result.current.selectedStayId).toBe('')
      expect(result.current.selectedDate).toBe('')
    })

    it('can switch to night mode', () => {
      const { result } = renderHook(() => useReceiptBillingState('b1'))

      act(() => result.current.changeBillingMode('night'))
      expect(result.current.billingMode).toBe('night')
    })

    it('can switch back to booking mode', () => {
      const { result } = renderHook(() => useReceiptBillingState('b1'))

      act(() => result.current.changeBillingMode('stay'))
      act(() => result.current.changeBillingMode('booking'))
      expect(result.current.billingMode).toBe('booking')
    })
  })

  describe('toggleStayId', () => {
    it('adds a stay id when not present', () => {
      const { result } = renderHook(() => useReceiptBillingState('b1'))

      act(() => result.current.toggleStayId('s1'))
      expect(result.current.selectedStayIds).toEqual(['s1'])
    })

    it('removes a stay id when already present', () => {
      const { result } = renderHook(() => useReceiptBillingState('b1'))

      act(() => result.current.toggleStayId('s1'))
      act(() => result.current.toggleStayId('s1'))
      expect(result.current.selectedStayIds).toEqual([])
    })

    it('supports multiple stay ids', () => {
      const { result } = renderHook(() => useReceiptBillingState('b1'))

      act(() => result.current.toggleStayId('s1'))
      act(() => result.current.toggleStayId('s2'))
      act(() => result.current.toggleStayId('s3'))
      expect(result.current.selectedStayIds).toEqual(['s1', 's2', 's3'])

      // Remove middle one
      act(() => result.current.toggleStayId('s2'))
      expect(result.current.selectedStayIds).toEqual(['s1', 's3'])
    })
  })

  describe('changeNightStay', () => {
    it('sets selectedStayId and resets selectedDate', () => {
      const { result } = renderHook(() => useReceiptBillingState('b1'))

      act(() => result.current.setSelectedDate('2025-03-15'))
      expect(result.current.selectedDate).toBe('2025-03-15')

      act(() => result.current.changeNightStay('s1'))
      expect(result.current.selectedStayId).toBe('s1')
      expect(result.current.selectedDate).toBe('')
    })
  })

  describe('canConfirm', () => {
    it('is true for booking mode (always)', () => {
      const { result } = renderHook(() => useReceiptBillingState('b1'))

      expect(result.current.billingMode).toBe('booking')
      expect(result.current.canConfirm).toBeTruthy()
    })

    it('is falsy for stay mode with no stays selected', () => {
      const { result } = renderHook(() => useReceiptBillingState('b1'))

      act(() => result.current.changeBillingMode('stay'))
      expect(result.current.canConfirm).toBeFalsy()
    })

    it('is truthy for stay mode with stays selected', () => {
      const { result } = renderHook(() => useReceiptBillingState('b1'))

      act(() => result.current.changeBillingMode('stay'))
      act(() => result.current.toggleStayId('s1'))
      expect(result.current.canConfirm).toBeTruthy()
    })

    it('is falsy for night mode with no stay or date', () => {
      const { result } = renderHook(() => useReceiptBillingState('b1'))

      act(() => result.current.changeBillingMode('night'))
      expect(result.current.canConfirm).toBeFalsy()
    })

    it('is falsy for night mode with stay but no date', () => {
      const { result } = renderHook(() => useReceiptBillingState('b1'))

      act(() => result.current.changeBillingMode('night'))
      act(() => result.current.changeNightStay('s1'))
      expect(result.current.canConfirm).toBeFalsy()
    })

    it('is truthy for night mode with both stay and date', () => {
      const { result } = renderHook(() => useReceiptBillingState('b1'))

      act(() => result.current.changeBillingMode('night'))
      act(() => result.current.changeNightStay('s1'))
      act(() => result.current.setSelectedDate('2025-03-15'))
      expect(result.current.canConfirm).toBeTruthy()
    })
  })

  describe('handleConfirm', () => {
    it('navigates with booking_id only for booking mode', () => {
      const { result } = renderHook(() => useReceiptBillingState('b1'))

      act(() => result.current.setShowModeSelect(true))
      act(() => result.current.handleConfirm())

      expect(mockNavigate).toHaveBeenCalledWith(
        '/receipts/new?booking_id=b1',
      )
      expect(result.current.showModeSelect).toBe(false)
    })

    it('navigates with mode and stay_ids for stay mode', () => {
      const { result } = renderHook(() => useReceiptBillingState('b1'))

      act(() => result.current.changeBillingMode('stay'))
      act(() => result.current.toggleStayId('s1'))
      act(() => result.current.toggleStayId('s2'))
      act(() => result.current.handleConfirm())

      expect(mockNavigate).toHaveBeenCalledWith(
        '/receipts/new?booking_id=b1&mode=stay&stay_ids=s1%2Cs2',
      )
    })

    it('navigates with mode, stay_ids, and date for night mode', () => {
      const { result } = renderHook(() => useReceiptBillingState('b1'))

      act(() => result.current.changeBillingMode('night'))
      act(() => result.current.changeNightStay('s1'))
      act(() => result.current.setSelectedDate('2025-03-15'))
      act(() => result.current.handleConfirm())

      expect(mockNavigate).toHaveBeenCalledWith(
        '/receipts/new?booking_id=b1&mode=night&stay_ids=s1&date=2025-03-15',
      )
    })

    it('closes mode select dialog on confirm', () => {
      const { result } = renderHook(() => useReceiptBillingState('b1'))

      act(() => result.current.setShowModeSelect(true))
      expect(result.current.showModeSelect).toBe(true)

      act(() => result.current.handleConfirm())
      expect(result.current.showModeSelect).toBe(false)
    })
  })

  describe('showModeSelect', () => {
    it('can be toggled via setShowModeSelect', () => {
      const { result } = renderHook(() => useReceiptBillingState('b1'))

      act(() => result.current.setShowModeSelect(true))
      expect(result.current.showModeSelect).toBe(true)

      act(() => result.current.setShowModeSelect(false))
      expect(result.current.showModeSelect).toBe(false)
    })
  })
})
