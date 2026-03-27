import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { customersApi } from '../api'

export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: customersApi.delete,
    onSuccess: () => {
      toast.success('ลบลูกค้าสำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return { mutate, isPending }
}
