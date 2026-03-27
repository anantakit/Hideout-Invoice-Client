import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminApi } from '../api'
import type { UpdateUserPayload } from '@/shared/types/auth'

export function useUpdateUser(onSuccess: () => void) {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      adminApi.updateUser(id, payload),
    onSuccess: () => {
      toast.success('อัปเดตผู้ใช้สำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      onSuccess()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return { mutate, isPending }
}
