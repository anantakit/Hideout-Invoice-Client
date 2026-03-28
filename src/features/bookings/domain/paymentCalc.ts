// paymentCalc.ts — pure functions for payment payload construction

import type { PaymentFormValues, PaymentResponse } from '../types'

// ── Build create payload ────────────────────────────────────────────────────

/** Converts form values to a create-payment API payload (without idempotency_key). */
export function buildCreatePayload(values: PaymentFormValues): {
  amount: number
  method: 'CASH' | 'TRANSFER'
  note?: string
} {
  return {
    amount: Number(values.amount),
    method: values.method,
    note: values.note || undefined,
  }
}

// ── Build edit payload ──────────────────────────────────────────────────────

/** Diffs form values against the original payment. Returns only changed fields, or null if nothing changed. */
export function buildEditPayload(
  original: PaymentResponse,
  values: PaymentFormValues,
): Record<string, unknown> | null {
  const payload: Record<string, unknown> = {}

  const newAmount = Number(values.amount)
  if (newAmount !== original.amount) payload.amount = newAmount
  if (values.method !== original.method) payload.method = values.method

  const newNote = values.note ?? ''
  const oldNote = original.note ?? ''
  if (newNote !== oldNote) payload.note = newNote

  return Object.keys(payload).length > 0 ? payload : null
}
