import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePaymentPanel } from './usePaymentPanel'
import type { BookingResponse, PaymentResponse } from '../../types'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

// Stable mock references — returned by every hook call
const createMutate = vi.fn()
const updateMutate = vi.fn()
const bookingMutate = vi.fn()

vi.mock('../../hooks', () => ({
  useCreatePayment: vi.fn(() => ({ mutate: createMutate, isPending: false })),
  useUpdatePayment: vi.fn(() => ({ mutate: updateMutate, isPending: false })),
  useUpdateBooking: vi.fn(() => ({ mutate: bookingMutate, isPending: false })),
}))

vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' })

import toast from 'react-hot-toast'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockBooking = {
  id: 'b1',
  guest_name: 'ทดสอบ',
  guest_phone: '0812345678',
  source: 'WALK_IN',
  status: 'CONFIRMED',
  total_amount: 3000,
  discount_amount: 0,
  paid_amount: 1000,
} as BookingResponse

const mockPayment: PaymentResponse = {
  id: 'p1',
  booking_id: 'b1',
  amount: 1000,
  type: 'PAYMENT',
  method: 'CASH',
  note: 'ชำระครั้งแรก',
  created_at: '2025-03-15T00:00:00Z',
  created_by: 'user-1',
} as PaymentResponse

// ── Tests ────────────────────────────────────────────────────────────────────

describe('usePaymentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => usePaymentPanel(mockBooking))

    expect(result.current.showForm).toBe(false)
    expect(result.current.editingPaymentId).toBeNull()
    expect(result.current.isCreatePending).toBe(false)
    expect(result.current.isUpdatePending).toBe(false)
  })

  it('toggles showForm', () => {
    const { result } = renderHook(() => usePaymentPanel(mockBooking))

    act(() => result.current.setShowForm(true))
    expect(result.current.showForm).toBe(true)

    act(() => result.current.setShowForm(false))
    expect(result.current.showForm).toBe(false)
  })

  it('startEdit sets editingPaymentId to payment id', () => {
    const { result } = renderHook(() => usePaymentPanel(mockBooking))

    act(() => result.current.startEdit(mockPayment))
    expect(result.current.editingPaymentId).toBe('p1')
  })

  it('startPick sets editingPaymentId to "pick"', () => {
    const { result } = renderHook(() => usePaymentPanel(mockBooking))

    act(() => result.current.startPick())
    expect(result.current.editingPaymentId).toBe('pick')
  })

  it('cancelEdit resets editingPaymentId to null', () => {
    const { result } = renderHook(() => usePaymentPanel(mockBooking))

    act(() => result.current.startEdit(mockPayment))
    act(() => result.current.cancelEdit())
    expect(result.current.editingPaymentId).toBeNull()
  })

  describe('onCreateSubmit', () => {
    it('calls createPayment.mutate with correct payload', () => {
      const { result } = renderHook(() => usePaymentPanel(mockBooking))

      act(() => {
        result.current.onCreateSubmit({
          amount: '1500',
          method: 'TRANSFER',
          note: 'ชำระเพิ่ม',
        })
      })

      expect(createMutate).toHaveBeenCalledWith(
        {
          amount: 1500,
          method: 'TRANSFER',
          note: 'ชำระเพิ่ม',
          idempotency_key: 'test-uuid',
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      )
    })

    it('shows success toast and hides form on success', () => {
      const { result } = renderHook(() => usePaymentPanel(mockBooking))

      act(() => result.current.setShowForm(true))

      act(() => {
        result.current.onCreateSubmit({ amount: '500', method: 'CASH' })
      })

      const [, options] = createMutate.mock.calls[0]
      act(() => options.onSuccess())

      expect(toast.success).toHaveBeenCalledWith('บันทึกการชำระเงินสำเร็จ')
      expect(result.current.showForm).toBe(false)
    })

    it('shows error toast on failure', () => {
      const { result } = renderHook(() => usePaymentPanel(mockBooking))

      act(() => {
        result.current.onCreateSubmit({ amount: '500', method: 'CASH' })
      })

      const [, options] = createMutate.mock.calls[0]
      act(() => options.onError(new Error('ยอดเงินไม่ถูกต้อง')))

      expect(toast.error).toHaveBeenCalledWith('ยอดเงินไม่ถูกต้อง')
    })

    it('converts empty note to undefined', () => {
      const { result } = renderHook(() => usePaymentPanel(mockBooking))

      act(() => {
        result.current.onCreateSubmit({ amount: '500', method: 'CASH', note: '' })
      })

      expect(createMutate).toHaveBeenCalledWith(
        expect.objectContaining({ note: undefined }),
        expect.anything(),
      )
    })
  })

  describe('onEditSubmit', () => {
    it('calls updatePayment.mutate with only changed fields', () => {
      const { result } = renderHook(() => usePaymentPanel(mockBooking))

      act(() => {
        result.current.onEditSubmit('p1', mockPayment, {
          amount: '2000',
          method: 'CASH',
          note: 'ชำระครั้งแรก',
        })
      })

      expect(updateMutate).toHaveBeenCalledWith(
        { paymentId: 'p1', payload: { amount: 2000 } },
        expect.anything(),
      )
    })

    it('includes method in payload when changed', () => {
      const { result } = renderHook(() => usePaymentPanel(mockBooking))

      act(() => {
        result.current.onEditSubmit('p1', mockPayment, {
          amount: '1000',
          method: 'TRANSFER',
          note: 'ชำระครั้งแรก',
        })
      })

      expect(updateMutate).toHaveBeenCalledWith(
        { paymentId: 'p1', payload: { method: 'TRANSFER' } },
        expect.anything(),
      )
    })

    it('includes note in payload when changed', () => {
      const { result } = renderHook(() => usePaymentPanel(mockBooking))

      act(() => {
        result.current.onEditSubmit('p1', mockPayment, {
          amount: '1000',
          method: 'CASH',
          note: 'อัปเดตแล้ว',
        })
      })

      expect(updateMutate).toHaveBeenCalledWith(
        { paymentId: 'p1', payload: { note: 'อัปเดตแล้ว' } },
        expect.anything(),
      )
    })

    it('cancels edit without calling mutate when no fields changed', () => {
      const { result } = renderHook(() => usePaymentPanel(mockBooking))

      act(() => result.current.startEdit(mockPayment))

      act(() => {
        result.current.onEditSubmit('p1', mockPayment, {
          amount: '1000',
          method: 'CASH',
          note: 'ชำระครั้งแรก',
        })
      })

      expect(updateMutate).not.toHaveBeenCalled()
      expect(result.current.editingPaymentId).toBeNull()
    })

    it('shows success toast and cancels edit on success', () => {
      const { result } = renderHook(() => usePaymentPanel(mockBooking))

      act(() => result.current.startEdit(mockPayment))

      act(() => {
        result.current.onEditSubmit('p1', mockPayment, {
          amount: '2000',
          method: 'CASH',
          note: 'ชำระครั้งแรก',
        })
      })

      const [, options] = updateMutate.mock.calls[0]
      act(() => options.onSuccess())

      expect(toast.success).toHaveBeenCalledWith('แก้ไขการชำระเงินสำเร็จ')
      expect(result.current.editingPaymentId).toBeNull()
    })

    it('shows error toast on edit failure', () => {
      const { result } = renderHook(() => usePaymentPanel(mockBooking))

      act(() => {
        result.current.onEditSubmit('p1', mockPayment, {
          amount: '999999',
          method: 'CASH',
        })
      })

      const [, options] = updateMutate.mock.calls[0]
      act(() => options.onError(new Error('เกินวงเงิน')))

      expect(toast.error).toHaveBeenCalledWith('เกินวงเงิน')
    })
  })

  describe('exemptDeposit', () => {
    it('calls updateBooking.mutate with deposit_status NONE', () => {
      const { result } = renderHook(() => usePaymentPanel(mockBooking))

      act(() => result.current.exemptDeposit())

      expect(bookingMutate).toHaveBeenCalledWith(
        { deposit_status: 'NONE' },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      )
    })

    it('shows success toast on exempt', () => {
      const { result } = renderHook(() => usePaymentPanel(mockBooking))

      act(() => result.current.exemptDeposit())

      const [, options] = bookingMutate.mock.calls[0]
      act(() => options.onSuccess())

      expect(toast.success).toHaveBeenCalledWith('ยกเว้นเงินประกันแล้ว')
    })
  })

  describe('updateDepositReturn', () => {
    it('calls updateBooking.mutate with deposit_returned value', () => {
      const { result } = renderHook(() => usePaymentPanel(mockBooking))

      act(() => result.current.updateDepositReturn(500))

      expect(bookingMutate).toHaveBeenCalledWith(
        { deposit_returned: 500 },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      )
    })

    it('shows success toast with amount on return', () => {
      const { result } = renderHook(() => usePaymentPanel(mockBooking))

      act(() => result.current.updateDepositReturn(500))

      const [, options] = bookingMutate.mock.calls[0]
      act(() => options.onSuccess())

      expect(toast.success).toHaveBeenCalledWith('บันทึกคืนประกัน ฿500')
    })
  })
})
