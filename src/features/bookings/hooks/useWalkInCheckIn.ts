import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingsApi } from '../api'
import type { BookingResponse } from '../types'

export interface WalkInPayload {
  guest_name: string
  phone: string
  room_type_id: string
  check_in: string  // YYYY-MM-DD
  check_out: string // YYYY-MM-DD
}

export function useWalkInCheckIn() {
  const queryClient = useQueryClient()

  const mutation = useMutation<BookingResponse, Error, WalkInPayload>({
    mutationFn: ({ guest_name, phone, room_type_id, check_in, check_out }) =>
      bookingsApi.create({
        guest_name,
        guest_phone: phone,
        room_requests: [
          {
            room_type_id,
            quantity: 1,
            check_in: `${check_in}T00:00:00Z`,
            check_out: `${check_out}T00:00:00Z`,
          },
        ],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })

  return {
    mutate: mutation.mutate,
    loading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
