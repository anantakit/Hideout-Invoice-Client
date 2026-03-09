import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { customersApi } from '../api'
import type { Customer } from '../types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../shared/ui/dialog'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Textarea } from '../../../shared/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../shared/ui/form'

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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', tax_id: '', address: '', phone: '' },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        customer
          ? { name: customer.name, tax_id: customer.tax_id ?? '', address: customer.address ?? '', phone: customer.phone ?? '' }
          : { name: '', tax_id: '', address: '', phone: '' }
      )
    }
  }, [open, customer, form])

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

  const isPending = createMutation.isPending || updateMutation.isPending

  const onSubmit = (values: FormValues) => {
    if (isEditing) updateMutation.mutate(values)
    else createMutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="px-6 py-4 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อ *</FormLabel>
                    <FormControl>
                      <Input placeholder="ชื่อบริษัทหรือชื่อลูกค้า" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เบอร์โทรศัพท์</FormLabel>
                    <FormControl>
                      <Input placeholder="081-234-5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tax_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เลขประจำตัวผู้เสียภาษี</FormLabel>
                    <FormControl>
                      <Input placeholder="0123456789012" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ที่อยู่</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="เลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
              <Button type="submit" disabled={form.formState.isSubmitting || isPending}>
                {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก…</> : isEditing ? 'บันทึก' : 'สร้างลูกค้า'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
