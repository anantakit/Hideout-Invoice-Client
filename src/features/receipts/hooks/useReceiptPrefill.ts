import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { UseFormReturn } from 'react-hook-form'
import { customersApi } from '@/shared/api/customers'
import type { Customer } from '@/shared/types/customer'
import { useInvoicePrefill, useInvoiceCoverage } from '@/shared/hooks/useInvoicePrefill'
import type { ReceiptFormValues } from '../schemas'
import { mapPrefillToFormValues } from '../domain/prefillLogic'

interface UseReceiptPrefillParams {
  bookingId: string | undefined
  prefillMode: 'booking' | 'stay' | 'night' | undefined
  prefillStayIds: string[] | undefined
  prefillDate: string | undefined
  form: UseFormReturn<ReceiptFormValues>
}

interface UseReceiptPrefillResult {
  prefill: ReturnType<typeof useInvoicePrefill>['data']
  coverage: ReturnType<typeof useInvoiceCoverage>['data']
  selectedCustomer: Customer | null
  setSelectedCustomer: (c: Customer | null) => void
  priceMode: 'rack' | 'charged'
  setPriceMode: (m: 'rack' | 'charged') => void
}

export function useReceiptPrefill({
  bookingId,
  prefillMode,
  prefillStayIds,
  prefillDate,
  form,
}: UseReceiptPrefillParams): UseReceiptPrefillResult {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [prefilled, setPrefilled] = useState(false)
  const [priceMode, setPriceMode] = useState<'rack' | 'charged'>('rack')

  const { data: prefill } = useInvoicePrefill(bookingId, {
    mode: prefillMode,
    stayIds: prefillStayIds,
    date: prefillDate,
    priceMode,
  })
  const { data: coverage } = useInvoiceCoverage(bookingId)

  // Fetch customer from booking's customer_id
  const prefillCustomerId = prefill?.customer_id
  const { data: prefillCustomer } = useQuery({
    queryKey: ['customer', prefillCustomerId],
    queryFn: () => customersApi.getById(prefillCustomerId!),
    enabled: !!prefillCustomerId && !selectedCustomer,
  })

  // Auto-select customer from booking prefill
  useEffect(() => {
    if (prefillCustomer && !selectedCustomer) {
      setSelectedCustomer(prefillCustomer)
      form.setValue('customer_id', prefillCustomer.id, { shouldValidate: true })
    }
  }, [prefillCustomer, selectedCustomer, form])

  // Reset prefilled flag when price mode changes so items are re-applied
  useEffect(() => {
    setPrefilled(false)
  }, [priceMode])

  // Prefill form from booking data
  useEffect(() => {
    if (!prefill || prefilled) return
    setPrefilled(true)

    const values = mapPrefillToFormValues(prefill)
    for (const [key, value] of Object.entries(values)) {
      form.setValue(key as keyof ReceiptFormValues, value as ReceiptFormValues[keyof ReceiptFormValues])
    }
  }, [prefill, prefilled, form])

  return {
    prefill,
    coverage,
    selectedCustomer,
    setSelectedCustomer,
    priceMode,
    setPriceMode,
  }
}
