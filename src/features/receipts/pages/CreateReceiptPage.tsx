import { useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, AlertTriangle } from 'lucide-react'
import { formatTHB, todayISO } from '@/shared/utils'
import CustomerModal, { type CustomerFormValues } from '@/shared/components/CustomerModal'
import type { Customer } from '@/shared/types/customer'
import { useCreateCustomer } from '@/shared/hooks/useCustomerMutations'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { DatePicker } from '@/shared/ui/DatePicker'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form'
import { receiptSchema, type ReceiptFormValues } from '../schemas'
import { useReceiptPrefill } from '../hooks/useReceiptPrefill'
import { ReceiptLineItems } from '../components/ReceiptLineItems'
import { CustomerSection } from '../components/CustomerSection'
import { useCreateReceipt } from '../hooks/useCreateReceipt'

export default function CreateReceipt() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const bookingId = searchParams.get('booking_id') || undefined
  const prefillMode = (searchParams.get('mode') as 'booking' | 'stay' | 'night') || undefined
  const prefillStayIds = searchParams.get('stay_ids')?.split(',').filter(Boolean) || undefined
  const prefillDate = searchParams.get('date') || undefined
  const [customerModalOpen, setCustomerModalOpen] = useState(false)

  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      customer_id: '',
      issue_date: todayISO(),
      notes: '',
      items: [{ description: '', quantity: 1, unit_price: 0 }],
      check_in_date: todayISO(),
    },
  })

  const {
    prefill, coverage, selectedCustomer, setSelectedCustomer, priceMode, setPriceMode,
  } = useReceiptPrefill({ bookingId, prefillMode, prefillStayIds, prefillDate, form })

  const fieldArray = useFieldArray({ control: form.control, name: 'items' })
  const watchedItems = form.watch('items')
  const total = watchedItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0,
  )

  const createMutation = useCreateReceipt()

  const onSubmit = (values: ReceiptFormValues) => {
    createMutation.mutate({
      customer_id: values.customer_id,
      booking_id: bookingId,
      issue_date: new Date(values.issue_date).toISOString(),
      notes: values.notes,
      items: values.items.map((item) => ({
        description: item.description, quantity: Number(item.quantity), unit_price: Number(item.unit_price),
      })),
      check_in_date: values.check_in_date ? new Date(values.check_in_date).toISOString() : undefined,
      covered_stays: prefill?.covered_stays,
    })
  }

  const handleCustomerCreated = useCallback(
    (customer: Customer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setSelectedCustomer(customer)
      form.setValue('customer_id', customer.id, { shouldValidate: true })
      setCustomerModalOpen(false)
    },
    [queryClient, form, setSelectedCustomer],
  )

  const { mutate: createCustomer, isPending: isCreatingCustomer } = useCreateCustomer(handleCustomerCreated)

  const handleCustomerSave = useCallback(
    (values: CustomerFormValues) => createCustomer(values),
    [createCustomer],
  )

  return (
    <>
      <div className="px-4 md:px-6 py-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-h1 text-xl sm:text-2xl">สร้างใบเสร็จใหม่</h1>
          <p className="text-muted-foreground text-sm mt-1">กรอกรายละเอียดด้านล่างเพื่อออกใบเสร็จรับเงิน</p>
          {bookingId && (
            <div className="mt-3 space-y-2">
              <div className="rounded-lg border border-info/30 bg-info-muted px-3 py-2 text-sm text-info-muted-foreground">
                ออกใบเสร็จจากการจอง #{bookingId.slice(0, 8).toUpperCase()}
                {prefill && ` · ${prefill.guest_name}`}
              </div>
              {coverage && (() => {
                const invoicedNights = coverage.stays.flatMap((s) => s.nights.filter((n) => n.invoiced))
                if (invoicedNights.length === 0) return null
                const totalNights = coverage.stays.reduce((sum, s) => sum + s.nights.length, 0)
                return (
                  <div className="rounded-lg border border-warning/30 bg-warning-muted px-3 py-2 text-sm text-warning-muted-foreground flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>การจองนี้มีใบเสร็จแล้ว {invoicedNights.length}/{totalNights} คืน — ตรวจสอบให้แน่ใจว่าไม่ออกซ้ำ</span>
                  </div>
                )
              })()}
            </div>
          )}
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
                  <FormField control={form.control} name="issue_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>วันที่ออกเอกสาร</FormLabel>
                      <DatePicker value={field.value ?? ''} onChange={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* Customer */}
              <CustomerSection
                control={form.control}
                errors={form.formState.errors}
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
                onAddCustomer={() => setCustomerModalOpen(true)}
              />

              {/* Stay Info */}
              <Card className="shadow-sm">
                <CardHeader className="px-5 md:px-6 pt-5 pb-3 border-b border-border">
                  <CardTitle className="text-base font-semibold tracking-tight">รายละเอียดการเข้าพัก</CardTitle>
                </CardHeader>
                <CardContent className="p-5 md:p-6">
                  <FormField control={form.control} name="check_in_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>วันที่เข้าพัก</FormLabel>
                      <DatePicker value={field.value ?? ''} onChange={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* Room Items */}
              <ReceiptLineItems
                form={form} fieldArray={fieldArray} watchedItems={watchedItems}
                bookingId={bookingId} priceMode={priceMode} onPriceModeChange={setPriceMode}
              />

              {/* Notes */}
              <Card className="shadow-sm">
                <CardHeader className="px-5 md:px-6 pt-5 pb-3 border-b border-border">
                  <CardTitle className="text-base font-semibold tracking-tight">หมายเหตุ</CardTitle>
                </CardHeader>
                <CardContent className="p-5 md:p-6">
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea rows={3} placeholder="หมายเหตุเพิ่มเติม…" {...field} />
                      </FormControl>
                    </FormItem>
                  )} />
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
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => navigate('/receipts')}>ยกเลิก</Button>
                <Button type="submit" disabled={!selectedCustomer || createMutation.isPending} className="touch-target px-6 rounded-xl font-medium">
                  {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังสร้าง…</> : <><Check className="w-4 h-4" /> สร้างใบเสร็จ</>}
                </Button>
              </div>

              {/* Mobile actions */}
              <div className="pt-2 md:hidden space-y-2">
                <Button type="submit" disabled={!selectedCustomer || createMutation.isPending} className="w-full min-h-13 rounded-xl font-medium">
                  {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังสร้าง…</> : <><Check className="w-4 h-4" /> สร้างใบเสร็จ</>}
                </Button>
                <Button type="button" variant="ghost" onClick={() => navigate('/receipts')} className="w-full touch-target text-muted-foreground">ยกเลิก</Button>
              </div>
            </div>
          </form>
        </Form>
      </div>

      <CustomerModal open={customerModalOpen} onClose={() => setCustomerModalOpen(false)} onSave={handleCustomerSave} isPending={isCreatingCustomer} />
    </>
  )
}
