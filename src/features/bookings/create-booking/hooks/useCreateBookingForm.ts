import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { todayISO, addDaysISO } from '@/shared/utils'
import { useCreateBooking } from '../../hooks'
import { createBookingSchema } from '../utils/createBookingSchema'
import type { CreateBookingFormValues } from '../utils/createBookingSchema'
import {
  validateCreateBookingForm,
  calculateSubmitLabel,
  buildCreateBookingPayload,
} from '../../domain/formValidation'
import { ROUTES } from '@/app/routes'
import type { Customer } from '@/shared/types/customer'
import type { CustomerFormValues } from '@/shared/components/CustomerModal'
import { useCreateCustomer } from '@/shared/hooks/useCustomerMutations'

export const SOURCE_OPTIONS = [
  { value: 'advance' as const, label: 'จองล่วงหน้า', desc: 'จองห้องพักล่วงหน้า' },
  { value: 'walk_in' as const, label: 'วอล์คอิน',     desc: 'เช็คอินทันที' },
]

export function useCreateBookingForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const createBooking = useCreateBooking()
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)

  // Allow pre-filling from URL: /bookings/new?check_in=...&check_out=...&room_type_id=...&room_id=...
  const urlCheckIn    = searchParams.get('check_in')     || todayISO()
  const urlCheckOut   = searchParams.get('check_out')    || addDaysISO(1)
  const urlRoomTypeId = searchParams.get('room_type_id') || ''
  const urlRoomId     = searchParams.get('room_id')      || ''

  const form = useForm<CreateBookingFormValues>({
    resolver: zodResolver(createBookingSchema),
    mode: 'onChange',
    defaultValues: {
      source: 'advance',
      guest_name: '',
      guest_phone: '',
      customer_id: undefined,
      same_dates: false,
      items: [
        {
          room_type_id: urlRoomTypeId,
          quantity: 1,
          check_in: urlCheckIn,
          check_out: urlCheckOut,
          assigned_room_ids: urlRoomId ? [urlRoomId] : [],
        },
      ],
      payment_mode: 'full',
      payment_amount: undefined,
      payment_method: 'CASH',
      key_deposit_amount: undefined,
    },
  })

  const source        = useWatch({ control: form.control, name: 'source' })
  const paymentMode   = useWatch({ control: form.control, name: 'payment_mode' })
  const guestName     = useWatch({ control: form.control, name: 'guest_name' })
  const items         = useWatch({ control: form.control, name: 'items' })
  const paymentAmount = useWatch({ control: form.control, name: 'payment_amount' })
  const isSubmitting  = createBooking.isPending

  const { hasGuest, hasValidItems, hasPayment } = validateCreateBookingForm(
    guestName, items, paymentMode, paymentAmount,
  )
  const canSubmit = hasGuest && hasValidItems && hasPayment && !isSubmitting

  const handleCustomerCreated = useCallback(
    (customer: Customer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setSelectedCustomer(customer)
      form.setValue('customer_id', customer.id)
      setCustomerModalOpen(false)
    },
    [queryClient, form],
  )

  const { mutate: createCustomerMutate, isPending: isCreatingCustomer } = useCreateCustomer(handleCustomerCreated)

  const handleCustomerSave = useCallback(
    (values: CustomerFormValues) => createCustomerMutate(values),
    [createCustomerMutate],
  )

  const submitLabel = calculateSubmitLabel(source, paymentMode)

  const onSubmit = form.handleSubmit((values) => {
    const payload = buildCreateBookingPayload(values)

    createBooking.mutate(payload, {
      onSuccess: (booking) => {
        toast.success(
          values.source === 'walk_in'
            ? 'เช็คอินสำเร็จ'
            : `สร้างการจอง #${booking.id.slice(0, 8)} สำเร็จ`,
        )
        navigate(ROUTES.bookings.detail(booking.id))
      },
      onError: (error: Error) => {
        toast.error(error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
      },
    })
  })

  return {
    form,
    source,
    paymentMode,
    isSubmitting,
    hasGuest,
    hasValidItems,
    hasPayment,
    canSubmit,
    submitLabel,
    onSubmit,
    selectedCustomer,
    setSelectedCustomer,
    customerModalOpen,
    setCustomerModalOpen,
    handleCustomerSave,
    isCreatingCustomer,
    navigate,
  }
}
