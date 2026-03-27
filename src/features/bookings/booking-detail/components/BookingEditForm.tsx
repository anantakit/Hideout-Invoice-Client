import { X } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import SearchableComboBox from '@/shared/ui/SearchableComboBox'
import { customersApi } from '@/shared/api/customers'
import type { Customer } from '@/shared/types/customer'

export interface BookingEditFields {
  name: string
  phone: string
  discount: string
  customerId?: string
  customerLabel?: string
}

interface BookingEditFormProps {
  fields: BookingEditFields
  onFieldChange: <K extends keyof BookingEditFields>(key: K, value: BookingEditFields[K]) => void
  isPending: boolean
  onCancel: () => void
  onSave: () => void
}

export function BookingEditForm({
  fields, onFieldChange,
  isPending, onCancel, onSave,
}: BookingEditFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="edit-name" className="text-caption block mb-1">ชื่อผู้เข้าพัก</label>
          <Input id="edit-name" value={fields.name} onChange={(e) => onFieldChange('name', e.target.value)} placeholder="ชื่อ-สกุล" />
        </div>
        <div>
          <label htmlFor="edit-phone" className="text-caption block mb-1">เบอร์โทร</label>
          <Input
            id="edit-phone"
            value={fields.phone}
            onChange={(e) => { onFieldChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10)) }}
            placeholder="0812345678"
            inputMode="tel"
          />
        </div>
      </div>
      <div>
        <label htmlFor="edit-discount" className="text-caption block mb-1">ส่วนลด (฿)</label>
        <Input
          id="edit-discount" type="number" min="0" step="0.01"
          value={fields.discount} onChange={(e) => onFieldChange('discount', e.target.value)}
          placeholder="0" inputMode="decimal"
        />
      </div>
      <div>
        <label className="text-caption block mb-1">ผู้ชำระเงิน</label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchableComboBox<Customer>
              value={fields.customerId ?? ''}
              onChange={(val) => onFieldChange('customerId', val || undefined)}
              onSelectItem={(item) => onFieldChange('customerLabel', item?.name)}
              fetchFunction={(params) => customersApi.list(params)}
              valueKey="id" labelKey="name"
              displayValue={fields.customerLabel}
              placeholder="ค้นหาลูกค้า..."
              sheetTitle="เลือกผู้ชำระเงิน"
            />
          </div>
          {fields.customerId && (
            <Button
              variant="ghost" size="icon"
              className="text-destructive/70 shrink-0"
              aria-label="ล้างผู้ชำระเงิน"
              onClick={() => { onFieldChange('customerId', undefined); onFieldChange('customerLabel', undefined) }}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" className="flex-1" disabled={isPending} onClick={onCancel}>ยกเลิก</Button>
        <Button size="sm" className="flex-1" disabled={!fields.name.trim() || !fields.phone.trim() || isPending} onClick={onSave}>
          {isPending ? 'กำลังบันทึก…' : 'บันทึก'}
        </Button>
      </div>
    </div>
  )
}
