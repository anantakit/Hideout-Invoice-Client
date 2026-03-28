import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createQueryWrapper } from '@/test/helpers'
import { useCreateBookingForm, SOURCE_OPTIONS } from './useCreateBookingForm'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
const mockSearchParams = new URLSearchParams()
const mockSetSearchParams = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const mockCreateMutate = vi.fn()
vi.mock('../../hooks', () => ({
  useCreateBooking: vi.fn(() => ({
    mutate: mockCreateMutate,
    isPending: false,
  })),
}))

const mockCreateCustomerMutate = vi.fn()
vi.mock('@/shared/hooks/useCustomerMutations', () => ({
  useCreateCustomer: vi.fn((_onSuccess: unknown) => ({
    mutate: mockCreateCustomerMutate,
    isPending: false,
  })),
}))

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useCreateBookingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset search params to empty
    for (const key of [...mockSearchParams.keys()]) {
      mockSearchParams.delete(key)
    }
  })

  it('returns initial form state with default values', () => {
    const { result } = renderHook(() => useCreateBookingForm(), {
      wrapper: createQueryWrapper(),
    })

    expect(result.current.form).toBeDefined()
    expect(result.current.source).toBe('advance')
    expect(result.current.paymentMode).toBe('full')
    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.selectedCustomer).toBeNull()
    expect(result.current.customerModalOpen).toBe(false)
  })

  it('exports SOURCE_OPTIONS with advance and walk_in', () => {
    expect(SOURCE_OPTIONS).toHaveLength(2)
    expect(SOURCE_OPTIONS[0].value).toBe('advance')
    expect(SOURCE_OPTIONS[0].label).toBe('จองล่วงหน้า')
    expect(SOURCE_OPTIONS[1].value).toBe('walk_in')
    expect(SOURCE_OPTIONS[1].label).toBe('วอล์คอิน')
  })

  describe('canSubmit', () => {
    it('is false initially (no guest name)', () => {
      const { result } = renderHook(() => useCreateBookingForm(), {
        wrapper: createQueryWrapper(),
      })

      expect(result.current.hasGuest).toBe(false)
      expect(result.current.canSubmit).toBe(false)
    })

    it('becomes true when guest name, valid items, and payment are provided', async () => {
      const { result } = renderHook(() => useCreateBookingForm(), {
        wrapper: createQueryWrapper(),
      })

      act(() => {
        result.current.form.setValue('guest_name', 'สมชาย ใจดี')
        result.current.form.setValue('items', [
          {
            room_type_id: 'rt-1',
            quantity: 1,
            check_in: '2025-03-15',
            check_out: '2025-03-17',
            assigned_room_ids: [],
          },
        ])
        result.current.form.setValue('payment_amount', 3000)
      })

      await waitFor(() => {
        expect(result.current.hasGuest).toBe(true)
        expect(result.current.canSubmit).toBe(true)
      })
    })

    it('is true for reserve payment mode without payment amount', async () => {
      const { result } = renderHook(() => useCreateBookingForm(), {
        wrapper: createQueryWrapper(),
      })

      act(() => {
        result.current.form.setValue('guest_name', 'ทดสอบ')
        result.current.form.setValue('items', [
          {
            room_type_id: 'rt-1',
            quantity: 1,
            check_in: '2025-03-15',
            check_out: '2025-03-17',
            assigned_room_ids: [],
          },
        ])
        result.current.form.setValue('payment_mode', 'reserve')
      })

      await waitFor(() => {
        expect(result.current.hasPayment).toBe(true)
        expect(result.current.canSubmit).toBe(true)
      })
    })
  })

  describe('submitLabel', () => {
    it('shows ยืนยันการจอง for advance source', () => {
      const { result } = renderHook(() => useCreateBookingForm(), {
        wrapper: createQueryWrapper(),
      })

      expect(result.current.submitLabel).toBe('ยืนยันการจอง')
    })

    it('shows เช็คอิน & ชำระเงิน for walk_in with payment', async () => {
      const { result } = renderHook(() => useCreateBookingForm(), {
        wrapper: createQueryWrapper(),
      })

      act(() => {
        result.current.form.setValue('source', 'walk_in')
      })

      await waitFor(() => {
        expect(result.current.submitLabel).toBe('เช็คอิน & ชำระเงิน')
      })
    })

    it('shows เช็คอิน (ค้างชำระ) for walk_in with reserve mode', async () => {
      const { result } = renderHook(() => useCreateBookingForm(), {
        wrapper: createQueryWrapper(),
      })

      act(() => {
        result.current.form.setValue('source', 'walk_in')
        result.current.form.setValue('payment_mode', 'reserve')
      })

      await waitFor(() => {
        expect(result.current.submitLabel).toBe('เช็คอิน (ค้างชำระ)')
      })
    })
  })

  describe('customer modal', () => {
    it('toggles customerModalOpen', () => {
      const { result } = renderHook(() => useCreateBookingForm(), {
        wrapper: createQueryWrapper(),
      })

      act(() => result.current.setCustomerModalOpen(true))
      expect(result.current.customerModalOpen).toBe(true)

      act(() => result.current.setCustomerModalOpen(false))
      expect(result.current.customerModalOpen).toBe(false)
    })

    it('setSelectedCustomer updates selected customer', () => {
      const { result } = renderHook(() => useCreateBookingForm(), {
        wrapper: createQueryWrapper(),
      })

      const customer = { id: 'c1', name: 'ทดสอบ', phone: '0812345678' }
      act(() => result.current.setSelectedCustomer(customer as never))
      expect(result.current.selectedCustomer).toEqual(customer)
    })
  })

  describe('hasValidItems', () => {
    it('is false when item has no room_type_id', async () => {
      const { result } = renderHook(() => useCreateBookingForm(), {
        wrapper: createQueryWrapper(),
      })

      act(() => {
        result.current.form.setValue('items', [
          {
            room_type_id: '',
            quantity: 1,
            check_in: '2025-03-15',
            check_out: '2025-03-17',
            assigned_room_ids: [],
          },
        ])
      })

      await waitFor(() => {
        expect(result.current.hasValidItems).toBe(false)
      })
    })

    it('is false when check_out is not after check_in', async () => {
      const { result } = renderHook(() => useCreateBookingForm(), {
        wrapper: createQueryWrapper(),
      })

      act(() => {
        result.current.form.setValue('items', [
          {
            room_type_id: 'rt-1',
            quantity: 1,
            check_in: '2025-03-17',
            check_out: '2025-03-15',
            assigned_room_ids: [],
          },
        ])
      })

      await waitFor(() => {
        expect(result.current.hasValidItems).toBe(false)
      })
    })
  })
})
