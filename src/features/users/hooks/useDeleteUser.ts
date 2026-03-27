import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminApi } from '../api'

export function useDeleteUser() {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      toast.success('ลบผู้ใช้สำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return { mutate, isPending }
}
