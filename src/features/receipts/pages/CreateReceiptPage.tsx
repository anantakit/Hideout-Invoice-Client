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
import { BottomBar } from '../../../shared/ui/BottomBar'
import { DatePicker } from '../../../shared/ui/DatePicker'
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
  description: z.string().min(1, 'กรุณาระบุเลขห้อง / รายละเอียด'),
  quantity: z.coerce.number().gt(0, 'ต้องมากกว่า 0'),
  unit_price: z.coerce.number().gte(0, 'ต้องไม่ติดลบ'),
})

const receiptSchema = z.object({
  customer_id: z.string().uuid('กรุณาเลือกลูกค้า'),
  issue_date: z.string().min(1, 'กรุณาระบุวันที่ออกเอกสาร'),
  notes: z.string().max(1000),
  items: z.array(itemSchema).min(1, 'กรุณาเพิ่มรายการอย่างน้อย 1 ห้อง'),
  check_in_date: z.string().optional(),
  payment_method: z.string().max(50).optional(),
})

type ReceiptFormValues = z.infer<typeof receiptSchema>

export default function CreateReceipt() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      customer_id: '',
      issue_date: todayISO(),
      notes: '',
      items: [{ description: '', quantity: 1, unit_price: 0 }],
      check_in_date: todayISO(),
      payment_method: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
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
      payment_method: values.payment_method || undefined,
    })
  }

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
      <div className="px-4 md:px-6 py-6 max-w-4xl mx-auto pb-28 md:pb-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">สร้างใบเสร็จใหม่</h1>
          <p className="text-muted-foreground text-sm mt-1">กรอกรายละเอียดด้านล่างเพื่อออกใบเสร็จรับเงิน</p>
        </div>

        <Form {...form}>
          <form id="create-receipt-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="space-y-6">

              {/* Receipt Meta */}
              <Card className="shadow-sm">
                <CardHeader className="px-5 md:px-6 pt-5 pb-3 border-b border-border">
                  <CardTitle className="text-base font-semibold tracking-tight">รายละเอียดใบเสร็จ</CardTitle>
                </CardHeader>
                <CardContent className="p-5 md:p-6 space-y-4">
                  <FormField
                    control={form.control}
                    name="issue_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>วันที่ออกเอกสาร</FormLabel>
                        <DatePicker value={field.value ?? ''} onChange={field.onChange} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Customer */}
              <Card className="shadow-sm">
                <CardHeader className="px-5 md:px-6 pt-5 pb-3 border-b border-border flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base font-semibold tracking-tight">ผู้ชำระเงิน</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCustomerModalOpen(true)}>
                    + เพิ่มลูกค้าใหม่
                  </Button>
                </CardHeader>
                <CardContent className="p-5 md:p-6 space-y-4">
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
                    <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground space-y-1 border border-border">
                      <p className="font-semibold text-foreground">{selectedCustomer.name}</p>
                      {selectedCustomer.address && <p>{selectedCustomer.address}</p>}
                      {selectedCustomer.phone && <p>โทร: {selectedCustomer.phone}</p>}
                      {selectedCustomer.tax_id && <p>เลขผู้เสียภาษี: {selectedCustomer.tax_id}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stay Info */}
              <Card className="shadow-sm">
                <CardHeader className="px-5 md:px-6 pt-5 pb-3 border-b border-border">
                  <CardTitle className="text-base font-semibold tracking-tight">รายละเอียดการเข้าพัก</CardTitle>
                </CardHeader>
                <CardContent className="p-5 md:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="check_in_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>วันที่เข้าพัก</FormLabel>
                          <DatePicker value={field.value ?? ''} onChange={field.onChange} />
                          <FormMessage />
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
                  </div>
                </CardContent>
              </Card>

              {/* Room Items */}
              <Card className="shadow-sm">
                <CardHeader className="px-5 md:px-6 pt-5 pb-3 border-b border-border">
                  <CardTitle className="text-base font-semibold tracking-tight">รายการห้องพัก</CardTitle>
                </CardHeader>
                <CardContent className="p-5 md:p-6 space-y-3">
                  <div className="hidden md:grid grid-cols-[1fr_100px_130px_100px_40px] gap-3 mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                    <span>ห้อง / รายละเอียด</span>
                    <span className="text-center">จำนวนคืน</span>
                    <span className="text-right">ราคาต่อคืน (บาท)</span>
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
                          className="grid grid-cols-1 md:grid-cols-[1fr_100px_130px_100px_40px] gap-3 items-start p-4 bg-background rounded-lg border border-border"
                        >
                          <div>
                            <label className="text-sm font-medium text-foreground md:hidden block mb-1.5">ห้อง / รายละเอียด</label>
                            <Input
                              placeholder="เช่น ห้อง 101"
                              className={form.formState.errors.items?.[index]?.description ? 'border-destructive' : ''}
                              {...form.register(`items.${index}.description`)}
                            />
                            {form.formState.errors.items?.[index]?.description && (
                              <p className="text-xs font-medium text-destructive mt-1">{form.formState.errors.items[index]!.description!.message}</p>
                            )}
                          </div>

                          <div>
                            <label className="text-sm font-medium text-foreground md:hidden block mb-1.5">จำนวนคืน</label>
                            <Input
                              type="number"
                              step="1"
                              min="1"
                              placeholder="1"
                              className={`text-center ${form.formState.errors.items?.[index]?.quantity ? 'border-destructive' : ''}`}
                              {...form.register(`items.${index}.quantity`)}
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium text-foreground md:hidden block mb-1.5">ราคาต่อคืน (บาท)</label>
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
                            <span className="text-sm font-medium text-foreground text-right">{formatTHB(lineTotal)}</span>
                          </div>

                          <div className="flex items-center justify-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-150"
                              onClick={() => remove(index)}
                              disabled={fields.length === 1}
                              title="ลบห้อง"
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
                    className="mt-1"
                    onClick={() => append({ description: '', quantity: 1, unit_price: 0 })}
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มห้อง
                  </Button>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card className="shadow-sm">
                <CardHeader className="px-5 md:px-6 pt-5 pb-3 border-b border-border">
                  <CardTitle className="text-base font-semibold tracking-tight">หมายเหตุ</CardTitle>
                </CardHeader>
                <CardContent className="p-5 md:p-6">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <textarea
                            rows={3}
                            placeholder="หมายเหตุเพิ่มเติม…"
                            className="flex min-h-[80px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary resize-none"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Total */}
              <div className="rounded-xl border border-border bg-muted/30 p-5">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-foreground">ยอดชำระทั้งหมด</span>
                  <span className="text-lg font-semibold text-primary">{formatTHB(total)}</span>
                </div>
              </div>

              {/* Desktop actions */}
              <div className="hidden md:flex justify-end gap-3">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => navigate(-1)}>
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting || createMutation.isPending}
                  className="min-h-[44px] px-6 rounded-xl font-medium"
                >
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

      <BottomBar>
        <Button
          type="submit"
          form="create-receipt-form"
          disabled={form.formState.isSubmitting || createMutation.isPending}
          className="w-full min-h-[52px] rounded-xl font-medium transition-transform duration-150 active:scale-[0.98]"
        >
          {createMutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> กำลังสร้าง…</>
          ) : (
            <><Check className="w-4 h-4" /> สร้างใบเสร็จ</>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="w-full text-muted-foreground"
        >
          ยกเลิก
        </Button>
      </BottomBar>

      <CustomerModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onCreated={handleCustomerCreated}
      />
    </>
  )
}
