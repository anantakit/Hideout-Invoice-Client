import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

type BillingMode = 'booking' | 'stay' | 'night'

export function useReceiptBillingState(bookingId: string) {
  const navigate = useNavigate()
  const [showModeSelect, setShowModeSelect] = useState(false)
  const [billingMode, setBillingMode] = useState<BillingMode>('booking')
  const [selectedStayIds, setSelectedStayIds] = useState<string[]>([])
  const [selectedStayId, setSelectedStayId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')

  function changeBillingMode(mode: BillingMode) {
    setBillingMode(mode)
    setSelectedStayIds([])
    setSelectedStayId('')
    setSelectedDate('')
  }

  function toggleStayId(id: string) {
    setSelectedStayIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  function changeNightStay(stayId: string) {
    setSelectedStayId(stayId)
    setSelectedDate('')
  }

  const canConfirm =
    billingMode === 'booking' ||
    (billingMode === 'stay' && selectedStayIds.length > 0) ||
    (billingMode === 'night' && selectedStayId && selectedDate)

  function handleConfirm() {
    const params = new URLSearchParams({ booking_id: bookingId })
    if (billingMode !== 'booking') params.set('mode', billingMode)
    if (billingMode === 'stay' && selectedStayIds.length > 0) {
      params.set('stay_ids', selectedStayIds.join(','))
    }
    if (billingMode === 'night' && selectedStayId) {
      params.set('stay_ids', selectedStayId)
      if (selectedDate) params.set('date', selectedDate)
    }
    setShowModeSelect(false)
    navigate(`/receipts/new?${params.toString()}`)
  }

  return {
    showModeSelect,
    setShowModeSelect,
    billingMode,
    changeBillingMode,
    selectedStayIds,
    toggleStayId,
    selectedStayId,
    changeNightStay,
    selectedDate,
    setSelectedDate,
    canConfirm,
    handleConfirm,
  }
}
