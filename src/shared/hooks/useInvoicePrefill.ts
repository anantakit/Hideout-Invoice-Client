// Re-export booking invoice hooks + types for cross-feature use (consumed by receipts)
export { useInvoicePrefill, useInvoiceCoverage } from '@/features/bookings/hooks'
export type { InvoicePrefillResponse } from '@/features/bookings/types'
