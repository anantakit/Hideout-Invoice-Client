import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import toast from 'react-hot-toast'
import { receiptsApi } from '../api'

export function useCreateReceipt() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { mutate, isPending } = useMutation({
    mutationFn: receiptsApi.create,
    onSuccess: (receipt) => {
      toast.success(`สร้างใบเสร็จ ${receipt.invoice_number} สำเร็จ`)
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
      navigate(`/receipts/${receipt.id}`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return { mutate, isPending }
}
