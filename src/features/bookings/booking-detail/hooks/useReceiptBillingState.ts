import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  buildReceiptUrl,
  isValidBillingSelection,
} from '../../domain/billingRules'

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

  const canConfirm = isValidBillingSelection(
    billingMode,
    selectedStayIds,
    selectedStayId,
    selectedDate,
  )

  function handleConfirm() {
    const url = buildReceiptUrl(
      bookingId,
      billingMode,
      selectedStayIds,
      selectedStayId,
      selectedDate,
    )
    setShowModeSelect(false)
    navigate(url)
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
