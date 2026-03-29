import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import toast from 'react-hot-toast'
import { receiptsApi } from '../api'

export function useDeleteReceipt(options?: { navigateTo?: string }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { mutate, isPending } = useMutation({
    mutationFn: receiptsApi.delete,
    onSuccess: () => {
      toast.success('ลบใบเสร็จสำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
      if (options?.navigateTo) navigate(options.navigateTo)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return { mutate, isPending }
}
