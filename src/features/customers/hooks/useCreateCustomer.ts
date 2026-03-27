import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { customersApi } from '../api'
import type { CreateCustomerPayload } from '../types'
import type { Customer } from '../types'

export function useCreateCustomer(onSuccess: (customer: Customer) => void) {
  const { mutate, isPending } = useMutation({
    mutationFn: (payload: CreateCustomerPayload) => customersApi.create(payload),
    onSuccess: (c) => {
      toast.success(`เพิ่มลูกค้า "${c.name}" สำเร็จ`)
      onSuccess(c)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return { mutate, isPending }
}
