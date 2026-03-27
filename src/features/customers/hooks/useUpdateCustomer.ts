import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { customersApi } from '../api'
import type { Customer, UpdateCustomerPayload } from '../types'

export function useUpdateCustomer(onSuccess: (customer: Customer) => void) {
  const { mutate, isPending } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCustomerPayload }) =>
      customersApi.update(id, payload),
    onSuccess: (c) => {
      toast.success(`แก้ไขข้อมูล "${c.name}" สำเร็จ`)
      onSuccess(c)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return { mutate, isPending }
}
