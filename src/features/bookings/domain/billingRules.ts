// billingRules.ts — pure functions for receipt billing mode logic

type BillingMode = 'booking' | 'stay' | 'night'

export function isValidBillingSelection(
  billingMode: BillingMode,
  selectedStayIds: string[],
  selectedStayId: string,
  selectedDate: string,
): boolean {
  return (
    billingMode === 'booking' ||
    (billingMode === 'stay' && selectedStayIds.length > 0) ||
    (billingMode === 'night' && !!selectedStayId && !!selectedDate)
  )
}

export function buildReceiptUrl(
  bookingId: string,
  billingMode: BillingMode,
  selectedStayIds: string[],
  selectedStayId: string,
  selectedDate: string,
): string {
  const params = new URLSearchParams({ booking_id: bookingId })
  if (billingMode !== 'booking') params.set('mode', billingMode)
  if (billingMode === 'stay' && selectedStayIds.length > 0) {
    params.set('stay_ids', selectedStayIds.join(','))
  }
  if (billingMode === 'night' && selectedStayId) {
    params.set('stay_ids', selectedStayId)
    if (selectedDate) params.set('date', selectedDate)
  }
  return `/receipts/new?${params.toString()}`
}
