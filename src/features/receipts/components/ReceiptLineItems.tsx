import React from 'react'
import type { UseFormReturn, UseFieldArrayReturn } from 'react-hook-form'
import { Plus, X, DollarSign, Tag } from 'lucide-react'
import { formatTHB } from '@/shared/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ToggleGroup } from '@/shared/ui/ToggleGroup'
import type { ReceiptFormValues } from '../schemas'

// ── ReceiptItemRow ──────────────────

interface ReceiptItemRowProps {
  fieldId: string
  index: number
  form: UseFormReturn<ReceiptFormValues>
  watchedItem: { quantity?: number; unit_price?: number }
  onRemove: (index: number) => void
  canRemove: boolean
}

const ReceiptItemRow = React.memo(function ReceiptItemRow({
  fieldId,
  index,
  form,
  watchedItem,
  onRemove,
  canRemove,
}: ReceiptItemRowProps) {
  const qty = Number(watchedItem?.quantity) || 0
  const price = Number(watchedItem?.unit_price) || 0
  const lineTotal = qty * price
  const itemErrors = form.formState.errors?.items?.[index]

  return (
    <div
      key={fieldId}
      className="grid grid-cols-1 md:grid-cols-[1fr_100px_130px_100px_44px] gap-3 items-start md:items-center p-4 bg-background rounded-lg border border-border"
    >
      <div>
        <label htmlFor={`item-desc-${index}`} className="text-sm font-medium text-foreground md:hidden block mb-1.5">รายละเอียด</label>
        <Input
          id={`item-desc-${index}`}
          placeholder="เช่น ห้อง 101, ค่าซักรีด"
          className={itemErrors?.description ? 'border-destructive' : ''}
          {...form.register(`items.${index}.description`)}
        />
        {itemErrors?.description && (
          <p className="text-xs font-medium text-destructive mt-1">{itemErrors.description.message}</p>
        )}
      </div>

      <div>
        <label htmlFor={`item-qty-${index}`} className="text-sm font-medium text-foreground md:hidden block mb-1.5">จำนวนคืน</label>
        <Input
          id={`item-qty-${index}`}
          type="number"
          step="1"
          min="1"
          placeholder="1"
          inputMode="numeric"
          className={`text-center ${itemErrors?.quantity ? 'border-destructive' : ''}`}
          {...form.register(`items.${index}.quantity`)}
        />
      </div>

      <div>
        <label htmlFor={`item-price-${index}`} className="text-sm font-medium text-foreground md:hidden block mb-1.5">ราคาต่อคืน (บาท)</label>
        <Input
          id={`item-price-${index}`}
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          inputMode="decimal"
          className={`text-right ${itemErrors?.unit_price ? 'border-destructive' : ''}`}
          {...form.register(`items.${index}.unit_price`)}
        />
      </div>

      <div className="flex items-center justify-between md:justify-end">
        <span className="text-sm text-muted-foreground md:hidden">รวม</span>
        <span className="text-sm font-medium text-foreground text-right">{formatTHB(lineTotal)}</span>
      </div>

      <div className="flex items-center justify-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="touch-target-square text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-150"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          aria-label="ลบรายการ"
          title="ลบรายการ"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
})

// ── ReceiptLineItems ──────────────────

interface ReceiptLineItemsProps {
  form: UseFormReturn<ReceiptFormValues>
  fieldArray: UseFieldArrayReturn<ReceiptFormValues, 'items'>
  watchedItems: ReceiptFormValues['items']
  bookingId: string | undefined
  priceMode: 'rack' | 'charged'
  onPriceModeChange: (m: 'rack' | 'charged') => void
}

export function ReceiptLineItems({
  form,
  fieldArray,
  watchedItems,
  bookingId,
  priceMode,
  onPriceModeChange,
}: ReceiptLineItemsProps) {
  const { fields, append, remove } = fieldArray

  return (
    <Card className="shadow-sm">
      <CardHeader className="px-5 md:px-6 pt-5 pb-3 border-b border-border">
        <CardTitle className="text-base font-semibold tracking-tight">รายการ</CardTitle>
      </CardHeader>
      <CardContent className="p-5 md:p-6 space-y-3">
        {bookingId && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">ราคา:</span>
            <ToggleGroup
              compact
              options={[
                { value: 'rack' as const, label: 'ราคาปกติ', Icon: DollarSign },
                { value: 'charged' as const, label: 'ราคาจริง', Icon: Tag },
              ]}
              value={priceMode}
              onChange={onPriceModeChange}
              className="flex gap-2"
            />
          </div>
        )}
        <div className="hidden md:grid grid-cols-[1fr_100px_130px_100px_44px] gap-3 mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
          <span>รายละเอียด</span>
          <span className="text-center">จำนวนคืน</span>
          <span className="text-right">ราคาต่อคืน (บาท)</span>
          <span className="text-right">รวมเงิน</span>
          <span />
        </div>

        <div className="space-y-2">
          {fields.map((field, index) => (
            <ReceiptItemRow
              key={field.id}
              fieldId={field.id}
              index={index}
              form={form}
              watchedItem={watchedItems[index]}
              onRemove={remove}
              canRemove={fields.length > 1}
            />
          ))}
        </div>

        {form.formState.errors.items?.root && (
          <p className="text-xs font-medium text-destructive mt-2">{form.formState.errors.items.root.message}</p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 touch-target"
          onClick={() => append({ description: '', quantity: 1, unit_price: 0 })}
        >
          <Plus className="w-4 h-4" />
          เพิ่มรายการ
        </Button>
      </CardContent>
    </Card>
  )
}
