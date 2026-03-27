import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getErrorMessage } from '@/shared/utils'
import { bookingsApi } from '../../api'
import type { AutoAssignResponse } from '../../types'

export function useAutoAssignRooms(options?: { onSettled?: () => void }) {
  const qc = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: (date?: string) => bookingsApi.autoAssignRooms(date),
    onSuccess: (resp: AutoAssignResponse) => {
      qc.invalidateQueries({ queryKey: ['timeline'] })
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['availability'] })
      qc.invalidateQueries({ queryKey: ['availability-grouped'] })

      if (resp.assigned_count > 0 && resp.skipped_count === 0) {
        toast.success(`มอบหมายห้องสำเร็จ ${resp.assigned_count} รายการ`)
      } else if (resp.assigned_count > 0 && resp.skipped_count > 0) {
        toast.success(
          `มอบหมายสำเร็จ ${resp.assigned_count} รายการ, ข้าม ${resp.skipped_count} รายการ`,
        )
      } else if (resp.assigned_count === 0 && resp.skipped_count > 0) {
        toast.error(`ไม่สามารถมอบหมายห้องได้ — ${resp.skipped[0]?.reason ?? 'ไม่มีห้องว่าง'}`)
      } else {
        toast('ไม่มีรายการที่ต้องมอบหมาย')
      }

      options?.onSettled?.()
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, 'มอบหมายห้องอัตโนมัติไม่สำเร็จ'))
      options?.onSettled?.()
    },
  })

  return { mutate, isPending }
}
