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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/shared/ui/form'
import type { Room, RoomType } from '../types'

const schema = z.object({
  number: z.string().min(1, 'กรุณากรอกเลขห้อง').max(20),
  room_type_id: z.string().min(1, 'กรุณาเลือกประเภทห้อง'),
})

type FormValues = z.infer<typeof schema>

interface RoomModalProps {
  open: boolean
  onClose: () => void
  room?: Room
  roomTypes: RoomType[]
  onSubmit: (values: FormValues) => void
  isLoading?: boolean
}

export default function RoomModal({
  open,
  onClose,
  room,
  roomTypes,
  onSubmit,
  isLoading,
}: RoomModalProps) {
  const isEdit = !!room

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { number: '', room_type_id: '' },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        room
          ? { number: room.number, room_type_id: room.room_type_id }
          : { number: '', room_type_id: roomTypes[0]?.id ?? '' },
      )
    }
  }, [open, room, roomTypes, form])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'แก้ไขห้อง' : 'เพิ่มห้อง'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6">
            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>เลขห้อง *</FormLabel>
                  <FormControl>
                    <Input placeholder="เช่น 101, 102" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="room_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ประเภทห้อง *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกประเภทห้อง" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roomTypes.map((rt) => (
                        <SelectItem key={rt.id} value={rt.id}>
                          {rt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
