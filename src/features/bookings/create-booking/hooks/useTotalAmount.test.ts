import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { FormProvider, useForm } from 'react-hook-form'
import React from 'react'
import { createQueryWrapper } from '@/test/helpers'
import { useTotalAmount } from './useTotalAmount'
import type { CreateBookingFormValues } from '../utils/createBookingSchema'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../hooks', () => ({
  useRoomTypes: vi.fn(),
}))

import { useRoomTypes } from '../../hooks'

const mockRoomTypes = [
  { id: 'rt-1', name: 'Standard', price_per_night: 1000, created_at: '' },
  { id: 'rt-2', name: 'Deluxe', price_per_night: 2000, created_at: '' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function createFormWrapper(items: CreateBookingFormValues['items']) {
  const QueryWrapper = createQueryWrapper()

  return function Wrapper({ children }: { children: React.ReactNode }) {
    const form = useForm<CreateBookingFormValues>({
      defaultValues: {
        source: 'advance',
        guest_name: '',
        guest_phone: '',
        same_dates: false,
        items,
        payment_mode: 'full',
        payment_method: 'CASH',
      },
    })
     
    return React.createElement(QueryWrapper, null,
      React.createElement(FormProvider, { ...form as any, children }),
    )
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useTotalAmount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRoomTypes).mockReturnValue({ data: mockRoomTypes } as never)
  })

  it('returns 0 for empty items', () => {
    const { result } = renderHook(() => useTotalAmount(), {
      wrapper: createFormWrapper([]),
    })

    expect(result.current).toBe(0)
  })

  it('calculates total for a single item (price × qty × nights)', () => {
    const { result } = renderHook(() => useTotalAmount(), {
      wrapper: createFormWrapper([
        {
          room_type_id: 'rt-1',
          quantity: 1,
          check_in: '2025-03-15',
          check_out: '2025-03-17',
          assigned_room_ids: [],
        },
      ]),
    })

    // 1000 × 1 × 2 nights = 2000
    expect(result.current).toBe(2000)
  })

  it('calculates total for multiple items', () => {
    const { result } = renderHook(() => useTotalAmount(), {
      wrapper: createFormWrapper([
        {
          room_type_id: 'rt-1',
          quantity: 2,
          check_in: '2025-03-15',
          check_out: '2025-03-17',
          assigned_room_ids: [],
        },
        {
          room_type_id: 'rt-2',
          quantity: 1,
          check_in: '2025-03-15',
          check_out: '2025-03-18',
          assigned_room_ids: [],
        },
      ]),
    })

    // rt-1: 1000 × 2 × 2 = 4000
    // rt-2: 2000 × 1 × 3 = 6000
    expect(result.current).toBe(10000)
  })

  it('uses charged_price when provided instead of rack price', () => {
    const { result } = renderHook(() => useTotalAmount(), {
      wrapper: createFormWrapper([
        {
          room_type_id: 'rt-2',
          quantity: 1,
          check_in: '2025-03-15',
          check_out: '2025-03-16',
          assigned_room_ids: [],
          charged_price: 1500,
        },
      ]),
    })

    // 1500 (charged) × 1 × 1 night = 1500
    expect(result.current).toBe(1500)
  })

  it('returns 0 for unknown room_type_id', () => {
    const { result } = renderHook(() => useTotalAmount(), {
      wrapper: createFormWrapper([
        {
          room_type_id: 'unknown',
          quantity: 1,
          check_in: '2025-03-15',
          check_out: '2025-03-17',
          assigned_room_ids: [],
        },
      ]),
    })

    expect(result.current).toBe(0)
  })

  it('returns 0 when roomTypes is empty', () => {
    vi.mocked(useRoomTypes).mockReturnValue({ data: [] } as never)

    const { result } = renderHook(() => useTotalAmount(), {
      wrapper: createFormWrapper([
        {
          room_type_id: 'rt-1',
          quantity: 1,
          check_in: '2025-03-15',
          check_out: '2025-03-17',
          assigned_room_ids: [],
        },
      ]),
    })

    expect(result.current).toBe(0)
  })

  it('treats missing quantity as 1', () => {
    const { result } = renderHook(() => useTotalAmount(), {
      wrapper: createFormWrapper([
        {
          room_type_id: 'rt-1',
          quantity: undefined as unknown as number,
          check_in: '2025-03-15',
          check_out: '2025-03-16',
          assigned_room_ids: [],
        },
      ]),
    })

    // 1000 × 1 × 1 night = 1000
    expect(result.current).toBe(1000)
  })

  it('returns 0 for same-day check-in/check-out (0 nights)', () => {
    const { result } = renderHook(() => useTotalAmount(), {
      wrapper: createFormWrapper([
        {
          room_type_id: 'rt-1',
          quantity: 1,
          check_in: '2025-03-15',
          check_out: '2025-03-15',
          assigned_room_ids: [],
        },
      ]),
    })

    expect(result.current).toBe(0)
  })
})
