import type { PaymentResponse, PaymentType } from '../../types'

/** Filter payments by their type(s). */
export function filterPaymentsByType(
  payments: PaymentResponse[],
  types: PaymentType[],
): PaymentResponse[] {
  return payments.filter((p) => (types as string[]).includes(p.type))
}
