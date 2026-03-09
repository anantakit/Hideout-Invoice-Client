import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/shared/ui/form'
import type { RoomType } from '../types'

const schema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อประเภทห้อง').max(100),
  price_per_night: z.coerce.number().min(0, 'ราคาต้องไม่ต่ำกว่า 0'),
})

type FormValues = z.infer<typeof schema>

interface RoomTypeModalProps {
  open: boolean
  onClose: () => void
  roomType?: RoomType
  onSubmit: (values: FormValues) => void
  isLoading?: boolean
}

export default function RoomTypeModal({
  open,
  onClose,
  roomType,
  onSubmit,
  isLoading,
}: RoomTypeModalProps) {
  const isEdit = !!roomType

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', price_per_night: 0 },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        roomType
          ? { name: roomType.name, price_per_night: roomType.price_per_night }
          : { name: '', price_per_night: 0 },
      )
    }
  }, [open, roomType, form])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'แก้ไขประเภทห้อง' : 'เพิ่มประเภทห้อง'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อประเภท *</FormLabel>
                  <FormControl>
                    <Input placeholder="เช่น เตียงเดี่ยว, เตียงคู่" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price_per_night"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ราคา/คืน (บาท) *</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'กำลังบันทึก…' : isEdit ? 'บันทึก' : 'เพิ่ม'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
