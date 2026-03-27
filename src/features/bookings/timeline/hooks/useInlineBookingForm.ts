import { useReducer, useMemo, useCallback } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { todayISO } from '@/shared/utils'
import { useCreateBooking, useAvailabilityGrouped } from '../../hooks'
import { KEY_DEPOSIT_PER_ROOM } from '../../constants'
import type { CreateBookingPrefill } from '../components/OperationsDrawer'

// ── Types ────────────────────────────────────────────────────────────────────

export interface SelectedRoom {
  roomId: string
  roomNumber: string
  roomTypeId: string
  roomTypeName: string
  pricePerNight: number
  chargedPrice?: number
}

export type PaymentMode = 'full' | 'full_deposit' | 'partial' | 'reserve'
export type PaymentMethod = 'CASH' | 'TRANSFER'
export type BookingSource = 'advance' | 'walk_in'

interface FormState {
  source: BookingSource
  guestName: string
  guestPhone: string
  paymentMode: PaymentMode
  paymentAmount: string
  paymentMethod: PaymentMethod
  showRoomPicker: boolean
  selectedRooms: SelectedRoom[]
}

type FormAction =
  | { type: 'SET_SOURCE'; value: BookingSource }
  | { type: 'SET_GUEST_NAME'; value: string }
  | { type: 'SET_GUEST_PHONE'; value: string }
  | { type: 'SET_PAYMENT_MODE'; mode: PaymentMode; totalAmount: number; depositAmount: number }
  | { type: 'SET_PAYMENT_AMOUNT'; value: string }
  | { type: 'SET_PAYMENT_METHOD'; value: PaymentMethod }
  | { type: 'TOGGLE_ROOM_PICKER' }
  | { type: 'TOGGLE_ROOM'; room: SelectedRoom }
  | { type: 'UPDATE_CHARGED_PRICE'; roomId: string; price: number | undefined }
  | { type: 'CLEAR_ALL_CHARGED_PRICES' }

// ── Reducer ──────────────────────────────────────────────────────────────────

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_SOURCE':
      return { ...state, source: action.value }
    case 'SET_GUEST_NAME':
      return { ...state, guestName: action.value }
    case 'SET_GUEST_PHONE':
      return { ...state, guestPhone: action.value.replace(/\D/g, '') }
    case 'SET_PAYMENT_MODE': {
      let paymentAmount = state.paymentAmount
      if (action.mode === 'full') paymentAmount = action.totalAmount.toString()
      else if (action.mode === 'full_deposit') paymentAmount = (action.totalAmount + action.depositAmount).toString()
      else if (action.mode === 'reserve') paymentAmount = ''
      return { ...state, paymentMode: action.mode, paymentAmount }
    }
    case 'SET_PAYMENT_AMOUNT':
      return { ...state, paymentAmount: action.value }
    case 'SET_PAYMENT_METHOD':
      return { ...state, paymentMethod: action.value }
    case 'TOGGLE_ROOM_PICKER':
      return { ...state, showRoomPicker: !state.showRoomPicker }
    case 'TOGGLE_ROOM': {
      const exists = state.selectedRooms.some((r) => r.roomId === action.room.roomId)
      if (exists) {
        if (state.selectedRooms.length <= 1) return state
        return { ...state, selectedRooms: state.selectedRooms.filter((r) => r.roomId !== action.room.roomId) }
      }
      return { ...state, selectedRooms: [...state.selectedRooms, action.room] }
    }
    case 'UPDATE_CHARGED_PRICE':
      return {
        ...state,
        selectedRooms: state.selectedRooms.map((r) =>
          r.roomId === action.roomId ? { ...r, chargedPrice: action.price } : r,
        ),
      }
    case 'CLEAR_ALL_CHARGED_PRICES':
      return {
        ...state,
        selectedRooms: state.selectedRooms.map((r) => ({ ...r, chargedPrice: undefined })),
      }
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useInlineBookingForm(
  prefill: CreateBookingPrefill,
  onBookingCreated?: (bookingId: string) => void,
) {
  const todayDate = todayISO()
  const isToday = prefill.checkIn === todayDate

  const [state, dispatch] = useReducer(formReducer, {
    source: isToday ? 'walk_in' : 'advance',
    guestName: '',
    guestPhone: '',
    paymentMode: 'full',
    paymentAmount: '',
    paymentMethod: 'CASH',
    showRoomPicker: false,
    selectedRooms: [{
      roomId: prefill.roomId,
      roomNumber: prefill.roomNumber,
      roomTypeId: prefill.roomTypeId,
      roomTypeName: prefill.roomTypeName,
      pricePerNight: prefill.pricePerNight,
    }],
  })

  const { selectedRooms, source, guestName, guestPhone, paymentMode, paymentAmount, paymentMethod, showRoomPicker } = state

  const selectedRoomIds = useMemo(() => new Set(selectedRooms.map((r) => r.roomId)), [selectedRooms])
  const { data: availData } = useAvailabilityGrouped(prefill.checkIn, prefill.checkOut, showRoomPicker)
  const createBooking = useCreateBooking()

  const nights = differenceInDays(parseISO(prefill.checkOut), parseISO(prefill.checkIn))
  const totalAmount = useMemo(
    () => selectedRooms.reduce((sum, r) => sum + nights * (r.chargedPrice ?? r.pricePerNight), 0),
    [selectedRooms, nights],
  )
  const depositAmount = KEY_DEPOSIT_PER_ROOM * selectedRooms.length

  const hasGuest = guestName.trim().length > 0
  const hasPayment = paymentMode === 'reserve' || (paymentAmount !== '' && Number(paymentAmount) > 0)
  const canSubmit = hasGuest && hasPayment && !createBooking.isPending

  const roomLabel = selectedRooms.map((r) => r.roomNumber).join(', ')
  const submitLabel =
    source === 'walk_in'
      ? paymentMode === 'reserve' ? 'เช็คอิน (ค้างชำระ)' : 'เช็คอิน & ชำระเงิน'
      : 'ยืนยันการจอง'

  const handlePaymentModeChange = useCallback((mode: PaymentMode) => {
    dispatch({ type: 'SET_PAYMENT_MODE', mode, totalAmount, depositAmount })
  }, [totalAmount, depositAmount])

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return

    const depositStatus = paymentMode === 'full_deposit' ? 'COLLECTED' : 'PENDING'

    const payment =
      paymentMode !== 'reserve' && paymentAmount
        ? {
            amount: Number(paymentAmount),
            method: paymentMethod,
            deposit_amount: paymentMode === 'full_deposit' ? depositAmount : undefined,
          }
        : undefined

    createBooking.mutate(
      {
        source,
        guest_name: guestName.trim(),
        guest_phone: guestPhone.trim(),
        key_deposit_amount: depositAmount,
        deposit_status: depositStatus,
        stays: selectedRooms.map((r) => ({
          room_type_id: r.roomTypeId,
          room_id: r.roomId,
          check_in: prefill.checkIn,
          check_out: prefill.checkOut,
          ...(r.chargedPrice != null ? { charged_price: r.chargedPrice } : {}),
        })),
        payment,
      },
      {
        onSuccess: (booking) => {
          toast.success(
            source === 'walk_in'
              ? `เช็คอิน ห้อง ${roomLabel} สำเร็จ`
              : `สร้างการจอง ห้อง ${roomLabel} สำเร็จ`,
          )
          onBookingCreated?.(booking.id)
        },
        onError: (err: Error) => {
          toast.error(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
        },
      },
    )
  }, [canSubmit, paymentMode, paymentAmount, paymentMethod, depositAmount, source, guestName, guestPhone, selectedRooms, prefill, roomLabel, createBooking, onBookingCreated])

  return {
    // State
    source,
    guestName,
    guestPhone,
    paymentMode,
    paymentAmount,
    paymentMethod,
    showRoomPicker,
    selectedRooms,
    selectedRoomIds,

    // Derived
    nights,
    totalAmount,
    depositAmount,
    canSubmit,
    roomLabel,
    submitLabel,
    availData,
    isPending: createBooking.isPending,

    // Actions
    dispatch,
    handlePaymentModeChange,
    handleSubmit,
  }
}
