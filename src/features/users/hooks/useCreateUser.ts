import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminApi } from '../api'
import type { CreateUserPayload } from '@/shared/types/auth'

export function useCreateUser(onSuccess: () => void) {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: CreateUserPayload) => adminApi.createUser(payload),
    onSuccess: () => {
      toast.success('สร้างผู้ใช้สำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      onSuccess()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return { mutate, isPending }
}
