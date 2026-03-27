import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { UseFormReturn } from 'react-hook-form'
import { customersApi } from '../../customers/api'
import type { Customer } from '../../customers/types'
import { useInvoicePrefill, useInvoiceCoverage } from '../../bookings/hooks'
import type { ReceiptFormValues } from '../schemas'
import { METHOD_MAP } from '../schemas'

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

    if (prefill.check_in_date) {
      form.setValue('check_in_date', prefill.check_in_date.slice(0, 10))
    }
    if (prefill.payment_method) {
      form.setValue('payment_method', METHOD_MAP[prefill.payment_method] ?? prefill.payment_method)
    }
    if (prefill.items.length > 0) {
      form.setValue(
        'items',
        prefill.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      )
    }
    const noteParts: string[] = []
    if (prefill.guest_name) noteParts.push(`ผู้เข้าพัก: ${prefill.guest_name}`)
    if (prefill.guest_phone) noteParts.push(`โทร: ${prefill.guest_phone}`)
    if (noteParts.length > 0) form.setValue('notes', noteParts.join('\n'))
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
