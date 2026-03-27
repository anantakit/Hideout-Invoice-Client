import { useFormContext } from 'react-hook-form'
import { X } from 'lucide-react'
import { formatPhone } from '@/shared/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form'
import { Input } from '@/shared/ui/input'
import SearchableComboBox from '@/shared/ui/SearchableComboBox'
import { customersApi } from '@/shared/api/customers'
import CustomerModal, { type CustomerFormValues } from '@/shared/components/CustomerModal'
import type { Customer } from '@/shared/types/customer'
import type { CreateBookingFormValues } from '../utils/createBookingSchema'

function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '')
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 10)}`
}

interface BookingGuestSectionProps {
  selectedCustomer: Customer | null
  setSelectedCustomer: (customer: Customer | null) => void
  customerModalOpen: boolean
  setCustomerModalOpen: (open: boolean) => void
  handleCustomerSave: (values: CustomerFormValues) => void
  isCreatingCustomer: boolean
}

export function BookingGuestSection({
  selectedCustomer,
  setSelectedCustomer,
  customerModalOpen,
  setCustomerModalOpen,
  handleCustomerSave,
  isCreatingCustomer,
}: BookingGuestSectionProps) {
  const form = useFormContext<CreateBookingFormValues>()

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ข้อมูลผู้เข้าพัก</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <FormField
            control={form.control}
            name="guest_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ชื่อผู้เข้าพัก</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="เช่น สมชาย ใจดี" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="guest_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>เบอร์โทรศัพท์</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="tel"
                    maxLength={12}
                    placeholder="081-234-5678"
                    value={formatPhoneDisplay(field.value)}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* ── Customer link (optional) ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">ผู้ชำระเงิน (ไม่บังคับ)</label>
              <Button type="button" variant="outline" size="sm" onClick={() => setCustomerModalOpen(true)}>
                + สร้างลูกค้า
              </Button>
            </div>
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <SearchableComboBox<Customer>
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onSelectItem={(item) => setSelectedCustomer(item)}
                  fetchFunction={(params) => customersApi.list(params)}
                  valueKey="id"
                  labelKey="name"
                  displayValue={selectedCustomer?.name}
                  placeholder="ค้นหาลูกค้า..."
                  sheetTitle="เลือกผู้ชำระเงิน"
                />
              )}
            />
            {selectedCustomer && (
              <div className="flex items-start justify-between">
                <div className="text-xs text-muted-foreground space-y-0.5 pl-1">
                  <p className="font-semibold text-foreground">{selectedCustomer.name}</p>
                  {selectedCustomer.phone && <p>โทร: {formatPhone(selectedCustomer.phone)}</p>}
                  {selectedCustomer.tax_id && <p>เลขผู้เสียภาษี: {selectedCustomer.tax_id}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null)
                    form.setValue('customer_id', undefined)
                  }}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="ยกเลิกเลือกผู้ชำระเงิน"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <CustomerModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSave={handleCustomerSave}
        isPending={isCreatingCustomer}
      />
    </>
  )
}
