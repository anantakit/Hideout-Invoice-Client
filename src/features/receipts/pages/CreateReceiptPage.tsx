import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, X, Check, Loader2 } from 'lucide-react'
import { receiptsApi } from '../api'
import { customersApi } from '../../customers/api'
import { formatTHB, todayISO } from '../../../shared/utils'
import CustomerModal from '../../customers/components/CustomerModal'
import SearchableComboBox from '../../../shared/ui/SearchableComboBox'
import type { Customer } from '../../customers/types'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../shared/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../shared/ui/select'

const itemSchema = z.object({
  description: z.string().min(1, 'กรุณาระบุรายละเอียด'),
  quantity: z.coerce.number().gt(0, 'ต้องมากกว่า 0'),
  unit_price: z.coerce.number().gte(0, 'ต้องไม่ติดลบ'),
})

const receiptSchema = z.object({
  customer_id: z.string().uuid('กรุณาเลือกลูกค้า'),
  issue_date: z.string().min(1, 'กรุณาระบุวันที่ออกเอกสาร'),
  notes: z.string().max(1000),
  items: z.array(itemSchema).min(1, 'กรุณาเพิ่มรายการอย่างน้อย 1 รายการ'),
  check_in_date: z.string().optional(),
  check_out_date: z.string().optional(),
  nights: z.coerce.number().int().min(0).optional(),
  room_number: z.string().max(50).optional(),
  payment_method: z.string().max(50).optional(),
})

type ReceiptFormValues = z.infer<typeof receiptSchema>

const ROOM_TYPE_TEMPLATES = {
  เตียงเดี่ยว: { description: 'ค่าห้องพัก', quantity: 1, unit_price: 500 },
  เตียงคู่: { description: 'ค่าห้องพัก', quantity: 1, unit_price: 650 },
} as const

type RoomType = keyof typeof ROOM_TYPE_TEMPLATES | ''

export default function CreateReceipt() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [roomType, setRoomType] = useState<RoomType>('')

  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      customer_id: '',
      issue_date: todayISO(),
      notes: '',
      items: [{ description: 'ค่าห้องพัก', quantity: 1, unit_price: 0 }],
      check_in_date: todayISO(),
      room_number: '',
      payment_method: '',
    },
  })

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const watchedItems = form.watch('items')
  const total = watchedItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0,
  )

  const createMutation = useMutation({
    mutationFn: receiptsApi.create,
    onSuccess: (receipt) => {
      toast.success(`สร้างใบเสร็จ ${receipt.invoice_number} สำเร็จ`)
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
      navigate(`/receipts/${receipt.id}`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const onSubmit = (values: ReceiptFormValues) => {
    createMutation.mutate({
      customer_id: values.customer_id,
      issue_date: new Date(values.issue_date).toISOString(),
      notes: values.notes,
      items: values.items.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
      })),
      check_in_date: values.check_in_date ? new Date(values.check_in_date).toISOString() : undefined,
      check_out_date: values.check_out_date ? new Date(values.check_out_date).toISOString() : undefined,
      nights: values.nights || undefined,
      room_number: values.room_number || undefined,
      payment_method: values.payment_method || undefined,
    })
  }

  const handleRoomTypeChange = useCallback(
    (type: RoomType) => {
      setRoomType(type)
      if (type && ROOM_TYPE_TEMPLATES[type]) {
        replace([{ ...ROOM_TYPE_TEMPLATES[type] }])
      }
    },
    [replace],
  )

  const handleCustomerCreated = useCallback(
    (customer: Customer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setSelectedCustomer(customer)
      form.setValue('customer_id', customer.id, { shouldValidate: true })
      setCustomerModalOpen(false)
    },
    [queryClient, form],
  )

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">สร้างใบเสร็จใหม่</h1>
          <p className="text-muted-foreground text-sm mt-1">กรอกรายละเอียดด้านล่างเพื่อออกใบเสร็จรับเงิน</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="space-y-5">
              {/* Receipt Meta */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">รายละเอียดใบเสร็จ</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="issue_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>วันที่ออกเอกสาร</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Customer */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm">ผู้ชำระเงิน</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCustomerModalOpen(true)}>
                    + เพิ่มลูกค้าใหม่
                  </Button>
                </CardHeader>
                <CardContent>
                  <Controller
                    name="customer_id"
                    control={form.control}
                    render={({ field }) => (
                      <SearchableComboBox<Customer>
                        value={field.value}
                        onChange={(id) => field.onChange(id)}
                        onSelectItem={(item) => setSelectedCustomer(item)}
                        fetchFunction={(params) => customersApi.list(params)}
                        labelKey="name"
                        valueKey="id"
                        displayValue={selectedCustomer?.name}
                        placeholder="ค้นหาลูกค้า…"
                        error={!!form.formState.errors.customer_id}
                      />
                    )}
                  />
                  {form.formState.errors.customer_id && (
                    <p className="text-xs font-medium text-destructive mt-1.5">{form.formState.errors.customer_id.message}</p>
                  )}

                  {selectedCustomer && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground space-y-1 border border-border">
                      <p className="font-semibold text-foreground">{selectedCustomer.name}</p>
                      {selectedCustomer.address && <p>{selectedCustomer.address}</p>}
                      {selectedCustomer.phone && <p>โทร: {selectedCustomer.phone}</p>}
                      {selectedCustomer.tax_id && <p>เลขผู้เสียภาษี: {selectedCustomer.tax_id}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Hotel Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">รายละเอียดการเข้าพัก</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="room_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>เลขห้อง</FormLabel>
                          <FormControl><Input placeholder="101" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="payment_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>วิธีชำระเงิน</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="เลือกวิธีชำระเงิน…" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="เงินสด">เงินสด</SelectItem>
                              <SelectItem value="โอนเงิน">โอนเงิน</SelectItem>
                              <SelectItem value="บัตรเครดิต">บัตรเครดิต</SelectItem>
                              <SelectItem value="บัตรเดบิต">บัตรเดบิต</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="check_in_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>วันที่เข้าพัก</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="check_out_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>วันที่ออก</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="md:col-span-2">
                      <FormItem>
                        <FormLabel>ประเภทห้องพัก (ไม่บังคับ)</FormLabel>
                        <Select onValueChange={(v) => handleRoomTypeChange(v as RoomType)} value={roomType}>
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกประเภทห้อง (ใส่รายการอัตโนมัติ)…" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(ROOM_TYPE_TEMPLATES).map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">เลือกเพื่อใส่รายการสินค้าตัวอย่างอัตโนมัติ — แก้ไขได้ภายหลัง</p>
                      </FormItem>
                    </div>
                    <FormField
                      control={form.control}
                      name="nights"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>จำนวนคืน</FormLabel>
                          <FormControl><Input type="number" min="0" placeholder="1" {...field} /></FormControl>
                          <p className="text-xs text-muted-foreground mt-1">หากระบุวันเข้า-ออก ระบบจะคำนวณให้อัตโนมัติ</p>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">รายการสินค้า</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="hidden md:grid grid-cols-[1fr_100px_120px_100px_40px] gap-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                    <span>รายละเอียด</span>
                    <span className="text-center">จำนวน</span>
                    <span className="text-right">ราคาต่อหน่วย</span>
                    <span className="text-right">รวมเงิน</span>
                    <span />
                  </div>

                  <div className="space-y-2">
                    {fields.map((field, index) => {
                      const qty = Number(watchedItems[index]?.quantity) || 0
                      const price = Number(watchedItems[index]?.unit_price) || 0
                      const lineTotal = qty * price

                      return (
                        <div
                          key={field.id}
                          className="grid grid-cols-1 md:grid-cols-[1fr_100px_120px_100px_40px] gap-2 items-start p-3 bg-muted/30 rounded-lg border border-border"
                        >
                          <div>
                            <label className="text-sm font-medium text-foreground md:hidden block mb-1.5">รายละเอียด</label>
                            <textarea
                              rows={2}
                              placeholder="ชื่อสินค้า/บริการ…"
                              className={`flex min-h-[60px] w-full rounded-lg border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary resize-none ${form.formState.errors.items?.[index]?.description ? 'border-destructive' : 'border-input'}`}
                              {...form.register(`items.${index}.description`)}
                            />
                            {form.formState.errors.items?.[index]?.description && (
                              <p className="text-xs font-medium text-destructive mt-1">{form.formState.errors.items[index]!.description!.message}</p>
                            )}
                          </div>

                          <div>
                            <label className="text-sm font-medium text-foreground md:hidden block mb-1.5">จำนวน</label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="1"
                              className={`text-center ${form.formState.errors.items?.[index]?.quantity ? 'border-destructive' : ''}`}
                              {...form.register(`items.${index}.quantity`)}
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium text-foreground md:hidden block mb-1.5">ราคาต่อหน่วย</label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className={`text-right ${form.formState.errors.items?.[index]?.unit_price ? 'border-destructive' : ''}`}
                              {...form.register(`items.${index}.unit_price`)}
                            />
                          </div>

                          <div className="flex items-center justify-end">
                            <span className="text-sm font-semibold text-foreground">{formatTHB(lineTotal)}</span>
                          </div>

                          <div className="flex items-center justify-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => remove(index)}
                              disabled={fields.length === 1}
                              title="ลบรายการ"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {form.formState.errors.items?.root && (
                    <p className="text-xs font-medium text-destructive mt-2">{form.formState.errors.items.root.message}</p>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => append({ description: '', quantity: 1, unit_price: 0 })}
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มรายการ
                  </Button>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardContent className="pt-5">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>หมายเหตุ (ไม่บังคับ)</FormLabel>
                        <FormControl>
                          <textarea
                            rows={3}
                            placeholder="หมายเหตุเพิ่มเติม…"
                            className="flex min-h-[80px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary resize-none"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Summary */}
              <Card>
                <CardContent className="pt-5">
                  <div className="max-w-xs ml-auto">
                    <div className="flex justify-between">
                      <span className="font-bold text-foreground">ยอดชำระทั้งหมด</span>
                      <span className="font-bold text-lg text-primary">{formatTHB(total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>ยกเลิก</Button>
                <Button type="submit" disabled={form.formState.isSubmitting || createMutation.isPending}>
                  {createMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> กำลังสร้าง…</>
                  ) : (
                    <><Check className="w-4 h-4" /> สร้างใบเสร็จ</>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>

      <CustomerModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onCreated={handleCustomerCreated}
      />
    </>
  )
}
