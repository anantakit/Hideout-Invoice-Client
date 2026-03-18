import { useEffect, useState, useCallback, useRef } from 'react'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../shared/ui/form'
import ThaiAddressPicker, { type ThaiAddress } from '../../../shared/ui/ThaiAddressPicker'

const schema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อ'),
  tax_id: z.string().max(50).optional().default(''),
  address: z.string().max(500).optional().default(''),
  phone: z.string()
    .regex(/^\d*$/, 'กรุณากรอกเฉพาะตัวเลข')
    .refine((v) => v === '' || v.length === 10, 'เบอร์โทรศัพท์ต้องมี 10 หลัก')
    .optional()
    .default(''),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (customer: Customer) => void
  customer?: Customer
}

const emptyAddr: ThaiAddress = { province: '', amphoe: '', district: '', zipcode: '' }

function parseAddressToThaiAddr(address: string): { detail: string; thai: ThaiAddress } {
  // Try to parse "detail ต.X อ.Y จ.Z NNNNN" or "detail แขวงX เขตY กรุงเทพมหานคร NNNNN"
  const m = address.match(/^(.*?)\s*(?:ต\.|ตำบล|แขวง)(\S+)\s+(?:อ\.|อำเภอ|เขต)(\S+)\s+(?:จ\.|จังหวัด)?(\S+)\s+(\d{5})\s*$/)
  if (m) {
    return {
      detail: m[1].trim(),
      thai: { district: m[2], amphoe: m[3], province: m[4], zipcode: m[5] },
    }
  }
  return { detail: address, thai: emptyAddr }
}

function buildAddressString(detail: string, thai: ThaiAddress): string {
  if (!thai.district && !thai.amphoe && !thai.province) return detail.trim()
  const parts = [detail.trim()]
  if (thai.district) parts.push(`ต.${thai.district}`)
  if (thai.amphoe) parts.push(`อ.${thai.amphoe}`)
  if (thai.province) parts.push(`จ.${thai.province}`)
  if (thai.zipcode) parts.push(thai.zipcode)
  return parts.filter(Boolean).join(' ')
}

export default function CustomerModal({ open, onClose, onCreated, customer }: Props) {
  const isEditing = !!customer

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', tax_id: '', address: '', phone: '' },
  })

  const [thaiAddr, setThaiAddr] = useState<ThaiAddress>(emptyAddr)
  const [addrDetail, setAddrDetail] = useState('')

  // Refs to read latest state without adding deps to callbacks
  const addrDetailRef = useRef(addrDetail)
  addrDetailRef.current = addrDetail
  const thaiAddrRef = useRef(thaiAddr)
  thaiAddrRef.current = thaiAddr

  const handleThaiAddrChange = useCallback(
    (addr: ThaiAddress) => {
      setThaiAddr(addr)
      form.setValue('address', buildAddressString(addrDetailRef.current, addr))
    },
    [form],
  )

  const handleDetailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const detail = e.target.value
      setAddrDetail(detail)
      form.setValue('address', buildAddressString(detail, thaiAddrRef.current))
    },
    [form],
  )

  useEffect(() => {
    if (open) {
      const vals = customer
        ? { name: customer.name, tax_id: customer.tax_id ?? '', address: customer.address ?? '', phone: customer.phone ?? '' }
        : { name: '', tax_id: '', address: '', phone: '' }
      form.reset(vals)
      const parsed = parseAddressToThaiAddr(vals.address)
      setThaiAddr(parsed.thai)
      setAddrDetail(parsed.detail)
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
      <DialogContent className="sm:max-w-xl">
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
                      <Input
                        placeholder="0812345678"
                        inputMode="tel"
                        maxLength={10}
                        {...field}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '')
                          field.onChange(digits)
                        }}
                      />
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
              {/* ── Address: detail line + cascading Thai address picker ── */}
              <FormField
                control={form.control}
                name="address"
                render={() => (
                  <FormItem>
                    <FormLabel>ที่อยู่</FormLabel>
                    <div className="space-y-3">
                      <Input
                        placeholder="เลขที่ ซอย ถนน (รายละเอียด)"
                        value={addrDetail}
                        onChange={handleDetailChange}
                      />
                      <ThaiAddressPicker value={thaiAddr} onChange={handleThaiAddrChange} />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="touch-target" onClick={onClose}>ยกเลิก</Button>
              <Button type="submit" className="touch-target" disabled={form.formState.isSubmitting || isPending || !form.watch('name')?.trim()}>
                {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก…</> : isEditing ? 'บันทึก' : 'สร้างลูกค้า'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
