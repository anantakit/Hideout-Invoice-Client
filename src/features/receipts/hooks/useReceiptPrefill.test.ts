import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { UseFormReturn } from 'react-hook-form'
import { createQueryWrapper } from '@/test/helpers'
import { useReceiptPrefill } from './useReceiptPrefill'
import type { ReceiptFormValues } from '../schemas'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPrefillData = {
  customer_id: 'cust-1',
  check_in_date: '2025-03-15T00:00:00Z',
  guest_name: 'สมชาย ใจดี',
  guest_phone: '0812345678',
  items: [
    { description: 'ห้อง Deluxe', quantity: 2, unit_price: 1500 },
  ],
}

const mockCoverageData = {
  covered_stay_ids: ['stay-1'],
  uncovered_stay_ids: ['stay-2'],
}

const mockCustomer = {
  id: 'cust-1',
  name: 'บริษัท ทดสอบ จำกัด',
  phone: '0891234567',
}

vi.mock('@/shared/hooks/useInvoicePrefill', () => ({
  useInvoicePrefill: vi.fn(),
  useInvoiceCoverage: vi.fn(),
}))

vi.mock('@/shared/api/customers', () => ({
  customersApi: { getById: vi.fn() },
}))

import { useInvoicePrefill, useInvoiceCoverage } from '@/shared/hooks/useInvoicePrefill'
import { customersApi } from '@/shared/api/customers'

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockForm() {
  return {
    setValue: vi.fn(),
    getValues: vi.fn(),
    watch: vi.fn(),
    register: vi.fn(),
    handleSubmit: vi.fn(),
    formState: { errors: {} },
    reset: vi.fn(),
    control: {},
    trigger: vi.fn(),
    setError: vi.fn(),
    clearErrors: vi.fn(),
    unregister: vi.fn(),
    setFocus: vi.fn(),
    getFieldState: vi.fn(),
    resetField: vi.fn(),
  } as unknown as UseFormReturn<ReceiptFormValues>
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useReceiptPrefill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useInvoicePrefill).mockReturnValue({ data: undefined, isLoading: false } as never)
    vi.mocked(useInvoiceCoverage).mockReturnValue({ data: undefined, isLoading: false } as never)
    vi.mocked(customersApi.getById).mockResolvedValue(mockCustomer as never)
  })

  it('returns initial state when no prefill data', () => {
    const form = createMockForm()
    const { result } = renderHook(
      () =>
        useReceiptPrefill({
          bookingId: 'b1',
          prefillMode: 'booking',
          prefillStayIds: undefined,
          prefillDate: undefined,
          form,
        }),
      { wrapper: createQueryWrapper() },
    )

    expect(result.current.selectedCustomer).toBeNull()
    expect(result.current.priceMode).toBe('rack')
    expect(result.current.prefill).toBeUndefined()
    expect(result.current.coverage).toBeUndefined()
  })

  it('calls useInvoicePrefill with correct params', () => {
    const form = createMockForm()
    renderHook(
      () =>
        useReceiptPrefill({
          bookingId: 'b1',
          prefillMode: 'stay',
          prefillStayIds: ['s1', 's2'],
          prefillDate: '2025-03-15',
          form,
        }),
      { wrapper: createQueryWrapper() },
    )

    expect(useInvoicePrefill).toHaveBeenCalledWith('b1', {
      mode: 'stay',
      stayIds: ['s1', 's2'],
      date: '2025-03-15',
      priceMode: 'rack',
    })
  })

  it('prefills form values when prefill data is available', async () => {
    vi.mocked(useInvoicePrefill).mockReturnValue({ data: mockPrefillData } as never)
    vi.mocked(useInvoiceCoverage).mockReturnValue({ data: mockCoverageData } as never)

    const form = createMockForm()
    renderHook(
      () =>
        useReceiptPrefill({
          bookingId: 'b1',
          prefillMode: 'booking',
          prefillStayIds: undefined,
          prefillDate: undefined,
          form,
        }),
      { wrapper: createQueryWrapper() },
    )

    await waitFor(() => {
      expect(form.setValue).toHaveBeenCalledWith('check_in_date', '2025-03-15')
    })

    expect(form.setValue).toHaveBeenCalledWith('items', [
      { description: 'ห้อง Deluxe', quantity: 2, unit_price: 1500 },
    ])
    expect(form.setValue).toHaveBeenCalledWith(
      'notes',
      'ผู้เข้าพัก: สมชาย ใจดี\nโทร: 0812345678',
    )
  })

  it('does not prefill notes when guest_name and guest_phone are absent', async () => {
    const prefillNoGuest = { ...mockPrefillData, guest_name: undefined, guest_phone: undefined }
    vi.mocked(useInvoicePrefill).mockReturnValue({ data: prefillNoGuest } as never)

    const form = createMockForm()
    renderHook(
      () =>
        useReceiptPrefill({
          bookingId: 'b1',
          prefillMode: 'booking',
          prefillStayIds: undefined,
          prefillDate: undefined,
          form,
        }),
      { wrapper: createQueryWrapper() },
    )

    await waitFor(() => {
      expect(form.setValue).toHaveBeenCalledWith('check_in_date', '2025-03-15')
    })

    const noteCalls = vi.mocked(form.setValue).mock.calls.filter(
      ([field]: [string, ...unknown[]]) => field === 'notes',
    )
    expect(noteCalls).toHaveLength(0)
  })

  it('does not prefill items when items array is empty', async () => {
    const prefillNoItems = { ...mockPrefillData, items: [] }
    vi.mocked(useInvoicePrefill).mockReturnValue({ data: prefillNoItems } as never)

    const form = createMockForm()
    renderHook(
      () =>
        useReceiptPrefill({
          bookingId: 'b1',
          prefillMode: 'booking',
          prefillStayIds: undefined,
          prefillDate: undefined,
          form,
        }),
      { wrapper: createQueryWrapper() },
    )

    await waitFor(() => {
      expect(form.setValue).toHaveBeenCalledWith('check_in_date', '2025-03-15')
    })

    const itemCalls = vi.mocked(form.setValue).mock.calls.filter(
      ([field]: [string, ...unknown[]]) => field === 'items',
    )
    expect(itemCalls).toHaveLength(0)
  })

  it('allows toggling priceMode', () => {
    const form = createMockForm()
    const { result } = renderHook(
      () =>
        useReceiptPrefill({
          bookingId: 'b1',
          prefillMode: 'booking',
          prefillStayIds: undefined,
          prefillDate: undefined,
          form,
        }),
      { wrapper: createQueryWrapper() },
    )

    expect(result.current.priceMode).toBe('rack')

    act(() => {
      result.current.setPriceMode('charged')
    })

    expect(result.current.priceMode).toBe('charged')
  })

  it('allows setting selectedCustomer', () => {
    const form = createMockForm()
    const { result } = renderHook(
      () =>
        useReceiptPrefill({
          bookingId: 'b1',
          prefillMode: 'booking',
          prefillStayIds: undefined,
          prefillDate: undefined,
          form,
        }),
      { wrapper: createQueryWrapper() },
    )

    expect(result.current.selectedCustomer).toBeNull()

    act(() => {
      result.current.setSelectedCustomer(mockCustomer as never)
    })

    expect(result.current.selectedCustomer).toEqual(mockCustomer)
  })

  it('exposes coverage data from useInvoiceCoverage', () => {
    vi.mocked(useInvoiceCoverage).mockReturnValue({ data: mockCoverageData } as never)

    const form = createMockForm()
    const { result } = renderHook(
      () =>
        useReceiptPrefill({
          bookingId: 'b1',
          prefillMode: 'booking',
          prefillStayIds: undefined,
          prefillDate: undefined,
          form,
        }),
      { wrapper: createQueryWrapper() },
    )

    expect(result.current.coverage).toEqual(mockCoverageData)
  })
})
