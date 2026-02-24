import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { customersApi } from '../api/customers'
import type { Customer } from '../types/customer'

const schema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อ'),
  tax_id: z.string().max(50).optional().default(''),
  address: z.string().max(500).optional().default(''),
  phone: z.string().max(50).optional().default(''),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (customer: Customer) => void
  customer?: Customer
}

export default function CustomerModal({ open, onClose, onCreated, customer }: Props) {
  const isEditing = !!customer

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', tax_id: '', address: '', phone: '' },
  })

  useEffect(() => {
    if (open) {
      reset(
        customer
          ? { name: customer.name, tax_id: customer.tax_id ?? '', address: customer.address ?? '', phone: customer.phone ?? '' }
          : { name: '', tax_id: '', address: '', phone: '' }
      )
    }
  }, [open, customer, reset])

  const createMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: (c) => { toast.success(`เพิ่มลูกค้า "${c.name}" สำเร็จ`); onCreated(c) },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) => customersApi.update(customer!.id, values),
    onSuccess: (c) => { toast.success(`แก้ไขข้อมูล "${c.name}" สำเร็จ`); onCreated(c) },
    onError: (err: Error) => toast.error(err.message),
  })

  const onSubmit = (values: FormValues) => {
    if (isEditing) updateMutation.mutate(values)
    else createMutation.mutate(values)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isEditing ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="label">ชื่อ *</label>
              <input type="text" placeholder="ชื่อบริษัทหรือชื่อลูกค้า" className={errors.name ? 'input-error' : 'input'} {...register('name')} />
              {errors.name && <p className="field-error">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">เบอร์โทรศัพท์</label>
              <input type="text" placeholder="081-234-5678" className="input" {...register('phone')} />
            </div>
            <div>
              <label className="label">เลขประจำตัวผู้เสียภาษี</label>
              <input type="text" placeholder="0123456789012" className="input" {...register('tax_id')} />
            </div>
            <div>
              <label className="label">ที่อยู่</label>
              <textarea rows={3} placeholder="เลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์" className="input resize-none" {...register('address')} />
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">ยกเลิก</button>
            <button type="submit" disabled={isSubmitting || isPending} className="btn-primary">
              {isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  กำลังบันทึก…
                </>
              ) : isEditing ? 'บันทึก' : 'สร้างลูกค้า'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
