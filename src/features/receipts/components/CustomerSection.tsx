import { Controller } from 'react-hook-form'
import type { Control, FieldErrors } from 'react-hook-form'
import { formatPhone, formatAddressForDisplay } from '@/shared/utils'
import SearchableComboBox from '@/shared/ui/SearchableComboBox'
import { customersApi } from '@/shared/api/customers'
import type { Customer } from '@/shared/types/customer'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import type { ReceiptFormValues } from '../schemas'

interface CustomerSectionProps {
  control: Control<ReceiptFormValues>
  errors: FieldErrors<ReceiptFormValues>
  selectedCustomer: Customer | null | undefined
  onSelectCustomer: (item: Customer | null) => void
  onAddCustomer: () => void
}

export function CustomerSection({
  control,
  errors,
  selectedCustomer,
  onSelectCustomer,
  onAddCustomer,
}: CustomerSectionProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="px-5 md:px-6 pt-5 pb-3 border-b border-border flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold tracking-tight">ผู้ชำระเงิน</CardTitle>
        <Button type="button" variant="outline" size="sm" className="touch-target" onClick={onAddCustomer}>
          + เพิ่มลูกค้าใหม่
        </Button>
      </CardHeader>
      <CardContent className="p-5 md:p-6 space-y-4">
        <Controller
          name="customer_id"
          control={control}
          render={({ field }) => (
            <SearchableComboBox<Customer>
              value={field.value}
              onChange={(id) => field.onChange(id)}
              onSelectItem={(item) => onSelectCustomer(item)}
              fetchFunction={(params) => customersApi.list(params)}
              labelKey="name"
              valueKey="id"
              displayValue={selectedCustomer?.name}
              placeholder="ค้นหาลูกค้า…"
              error={!!errors.customer_id}
              sheetTitle="เลือกผู้ชำระเงิน"
            />
          )}
        />
        {errors.customer_id && (
          <p className="text-xs font-medium text-destructive mt-1.5">{errors.customer_id.message}</p>
        )}
        {selectedCustomer && (
          <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground space-y-1 border border-border">
            <p className="font-semibold text-foreground">{selectedCustomer.name}</p>
            {selectedCustomer.address && <p>{formatAddressForDisplay(selectedCustomer.address)}</p>}
            {selectedCustomer.phone && <p>โทร: {formatPhone(selectedCustomer.phone)}</p>}
            {selectedCustomer.tax_id && <p>เลขผู้เสียภาษี: {selectedCustomer.tax_id}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
