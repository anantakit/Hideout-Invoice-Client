import { useState } from 'react'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../../../shared/utils'
import { useCreatePayment, useUpdateBooking, useUpdatePayment } from '../../hooks'
import type { BookingResponse, PaymentResponse } from '../../types'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PaymentFormValues {
  amount: string
  method: 'CASH' | 'TRANSFER'
  note?: string
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePaymentPanel(booking: BookingResponse) {
  const [showForm, setShowForm] = useState(false)
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)

  const createPayment = useCreatePayment(booking.id)
  const updatePayment = useUpdatePayment(booking.id)
  const updateBooking = useUpdateBooking(booking.id)

  function startEdit(payment: PaymentResponse) {
    setEditingPaymentId(payment.id)
  }

  function startPick() {
    setEditingPaymentId('pick')
  }

  function cancelEdit() {
    setEditingPaymentId(null)
  }

  function onEditSubmit(paymentId: string, original: PaymentResponse, values: PaymentFormValues) {
    const payload: Record<string, unknown> = {}
    const newAmount = Number(values.amount)
    if (newAmount !== original.amount) payload.amount = newAmount
    if (values.method !== original.method) payload.method = values.method
    const newNote = values.note ?? ''
    const oldNote = original.note ?? ''
    if (newNote !== oldNote) payload.note = newNote

    if (Object.keys(payload).length === 0) {
      cancelEdit()
      return
    }

    updatePayment.mutate(
      { paymentId, payload },
      {
        onSuccess: () => {
          toast.success('แก้ไขการชำระเงินสำเร็จ')
          cancelEdit()
        },
        onError: (err) => {
          toast.error(getErrorMessage(err))
        },
      },
    )
  }

  function onCreateSubmit(values: PaymentFormValues) {
    createPayment.mutate(
      {
        amount: Number(values.amount),
        method: values.method,
        note: values.note || undefined,
        idempotency_key: crypto.randomUUID(),
      },
      {
        onSuccess: () => {
          toast.success('บันทึกการชำระเงินสำเร็จ')
          setShowForm(false)
        },
        onError: (err) => {
          toast.error(getErrorMessage(err))
        },
      },
    )
  }

  function exemptDeposit() {
    updateBooking.mutate(
      { deposit_status: 'NONE' },
      { onSuccess: () => toast.success('ยกเว้นเงินประกันแล้ว') },
    )
  }

  function updateDepositReturn(val: number) {
    updateBooking.mutate(
      { deposit_returned: val },
      { onSuccess: () => toast.success(`บันทึกคืนประกัน ฿${val}`) },
    )
  }

  return {
    showForm,
    setShowForm,
    editingPaymentId,
    startEdit,
    startPick,
    cancelEdit,
    onEditSubmit,
    onCreateSubmit,
    exemptDeposit,
    updateDepositReturn,
    isCreatePending: createPayment.isPending,
    isUpdatePending: updatePayment.isPending,
  }
}
