// Re-export customer mutation hooks for cross-feature use (consumed by receipts, bookings)
export { useCreateCustomer } from '@/features/customers/hooks/useCreateCustomer'
export { useUpdateCustomer } from '@/features/customers/hooks/useUpdateCustomer'
