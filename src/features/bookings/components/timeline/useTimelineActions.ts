import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { bookingsApi } from '../../api'

export function useTimelineActions() {
  const qc = useQueryClient()

  const invalidateAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['bookings'] })
    qc.invalidateQueries({ queryKey: ['availability'] })
    qc.invalidateQueries({ queryKey: ['availability-grouped'] })
    qc.invalidateQueries({ queryKey: ['timeline'] })
  }, [qc])

  const checkIn = useMutation({
    mutationFn: ({
      bookingId,
      roomStayId,
      roomId,
    }: {
      bookingId: string
      roomStayId: string
      roomId: string
    }) =>
      bookingsApi.checkInRooms(bookingId, [
        { room_stay_id: roomStayId, room_id: roomId },
      ]),
    onSuccess: () => {
      toast.success('เช็คอินสำเร็จ')
      invalidateAll()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? 'เช็คอินไม่สำเร็จ')
    },
  })

  const checkOut = useMutation({
    mutationFn: ({
      bookingId,
      roomStayId,
    }: {
      bookingId: string
      roomStayId: string
    }) => bookingsApi.checkoutRooms(bookingId, [roomStayId]),
    onSuccess: () => {
      toast.success('เช็คเอาท์สำเร็จ')
      invalidateAll()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? 'เช็คเอาท์ไม่สำเร็จ')
    },
  })

  const cancelStay = useMutation({
    mutationFn: ({
      bookingId,
      stayId,
    }: {
      bookingId: string
      stayId: string
    }) => bookingsApi.cancelStay(bookingId, stayId),
    onSuccess: () => {
      toast.success('ยกเลิกการจองสำเร็จ')
      invalidateAll()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? 'ยกเลิกไม่สำเร็จ')
    },
  })

  return {
    checkIn: checkIn.mutate,
    checkOut: checkOut.mutate,
    cancelStay: cancelStay.mutate,
    isLoading:
      checkIn.isPending || checkOut.isPending || cancelStay.isPending,
  }
}
