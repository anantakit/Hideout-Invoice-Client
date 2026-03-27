import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { todayISO, addDaysISO } from '@/shared/utils'
import { useCreateBooking } from '../../hooks'
import { KEY_DEPOSIT_PER_ROOM } from '../../constants'
import { createBookingSchema } from '../utils/createBookingSchema'
import type { CreateBookingFormValues } from '../utils/createBookingSchema'
import { expandGroupedStays } from '../utils/expandGroupedStays'
import { ROUTES } from '@/app/routes'
import type { Customer } from '../../../customers/types'

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

  const hasGuest = guestName.trim().length > 0
  const hasValidItems = items.every(
    (item) => item.room_type_id && item.check_in && item.check_out && item.check_out > item.check_in,
  )
  const hasPayment = paymentMode === 'reserve' || (paymentAmount != null && paymentAmount > 0)
  const canSubmit = hasGuest && hasValidItems && hasPayment && !isSubmitting

  const handleCustomerCreated = useCallback(
    (customer: Customer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setSelectedCustomer(customer)
      form.setValue('customer_id', customer.id)
      setCustomerModalOpen(false)
      toast.success(`เพิ่มลูกค้า "${customer.name}" สำเร็จ`)
    },
    [queryClient, form],
  )

  const submitLabel =
    source === 'walk_in'
      ? paymentMode === 'reserve'
        ? 'เช็คอิน (ค้างชำระ)'
        : 'เช็คอิน & ชำระเงิน'
      : 'ยืนยันการจอง'

  const onSubmit = form.handleSubmit((values) => {
    const stays = expandGroupedStays(values.items)

    const totalRooms = values.items.reduce((s, i) => s + Math.max(1, i.quantity ?? 1), 0)
    const depositAmount = KEY_DEPOSIT_PER_ROOM * totalRooms
    const depositStatus = values.payment_mode === 'full_deposit' ? 'COLLECTED' : 'PENDING'

    const payment =
      values.payment_mode !== 'reserve' && values.payment_amount
        ? {
            amount: values.payment_amount,
            method: values.payment_method,
            deposit_amount: values.payment_mode === 'full_deposit' ? depositAmount : undefined,
          }
        : undefined

    createBooking.mutate(
      {
        source: values.source,
        guest_name: values.guest_name,
        guest_phone: values.guest_phone,
        customer_id: values.customer_id || undefined,
        key_deposit_amount: depositAmount,
        deposit_status: depositStatus,
        stays,
        payment,
      },
      {
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
      },
    )
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
    handleCustomerCreated,
    navigate,
  }
}
