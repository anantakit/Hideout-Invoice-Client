// ── Form Validation — pure functions, no React imports ──────────────────────

import type { CreateBookingPayload, CreateBookingPaymentPayload } from '../types'
import type { CreateBookingFormValues } from '../create-booking/utils/createBookingSchema'
import { expandGroupedStays } from '../create-booking/utils/expandGroupedStays'
import { KEY_DEPOSIT_PER_ROOM } from '../constants'

// ── Types ───────────────────────────────────────────────────────────────────

export interface FormValidationResult {
  hasGuest: boolean
  hasValidItems: boolean
  hasPayment: boolean
}

// ── Functions ───────────────────────────────────────────────────────────────

/**
 * Validate create-booking form readiness (not Zod schema — UI-level checks).
 */
export function validateCreateBookingForm(
  guestName: string,
  items: readonly { room_type_id: string; check_in: string; check_out: string }[],
  paymentMode: string,
  paymentAmount: number | undefined,
): FormValidationResult {
  const hasGuest = guestName.trim().length > 0
  const hasValidItems = items.every(
    (item) => item.room_type_id && item.check_in && item.check_out && item.check_out > item.check_in,
  )
  const hasPayment = paymentMode === 'reserve' || (paymentAmount != null && paymentAmount > 0)
  return { hasGuest, hasValidItems, hasPayment }
}

/**
 * Compute the submit button label based on booking source and payment mode.
 * Shared by useCreateBookingForm and useInlineBookingForm.
 */
export function calculateSubmitLabel(
  source: 'walk_in' | 'advance',
  paymentMode: string,
): string {
  if (source === 'walk_in') {
    return paymentMode === 'reserve' ? 'เช็คอิน (ค้างชำระ)' : 'เช็คอิน & ชำระเงิน'
  }
  return 'ยืนยันการจอง'
}

/**
 * Build the API payload from create-booking form values.
 * Handles grouped-stay expansion and deposit calculation internally.
 */
export function buildCreateBookingPayload(
  values: CreateBookingFormValues,
): CreateBookingPayload {
  const stays = expandGroupedStays(values.items)

  const totalRooms = values.items.reduce((s, i) => s + Math.max(1, i.quantity ?? 1), 0)
  const depositAmount = KEY_DEPOSIT_PER_ROOM * totalRooms
  const depositStatus = values.payment_mode === 'full_deposit' ? 'COLLECTED' : 'PENDING'

  let payment: CreateBookingPaymentPayload | undefined
  if (values.payment_mode !== 'reserve' && values.payment_amount) {
    payment = {
      amount: values.payment_amount,
      method: values.payment_method,
      deposit_amount: values.payment_mode === 'full_deposit' ? depositAmount : undefined,
    }
  }

  return {
    source: values.source,
    guest_name: values.guest_name,
    guest_phone: values.guest_phone,
    customer_id: values.customer_id || undefined,
    key_deposit_amount: depositAmount,
    deposit_status: depositStatus,
    stays,
    payment,
  }
}
