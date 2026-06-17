// receipts/domain/prefillLogic.ts — pure functions, no React imports

import type { InvoicePrefillResponse } from '@/shared/hooks/useInvoicePrefill'
import type { ReceiptFormValues } from '../schemas'

/**
 * Map prefill data from booking API into partial receipt form values.
 * Handles items mapping and notes generation.
 */
export function mapPrefillToFormValues(
  prefill: InvoicePrefillResponse,
): Partial<ReceiptFormValues> {
  const values: Partial<ReceiptFormValues> = {}

  if (prefill.check_in_date) {
    values.check_in_date = prefill.check_in_date.slice(0, 10)
  }
  if (prefill.items.length > 0) {
    values.items = prefill.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }))
  }

  const notes = buildPrefillNotes(prefill.guest_name, prefill.guest_phone)
  if (notes) {
    values.notes = notes
  }

  return values
}

/**
 * Build a Thai-language notes string from guest contact info.
 * Returns undefined if neither name nor phone is provided.
 */
export function buildPrefillNotes(
  guestName?: string,
  guestPhone?: string,
): string | undefined {
  const parts: string[] = []
  if (guestName) parts.push(`ผู้เข้าพัก: ${guestName}`)
  if (guestPhone) parts.push(`โทร: ${guestPhone}`)
  return parts.length > 0 ? parts.join('\n') : undefined
}
