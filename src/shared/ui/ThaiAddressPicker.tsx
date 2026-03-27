import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { Input } from './input'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command'
import { cn } from '@/shared/utils'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { type ThaiAddress, ALL_PROVINCES, getAmphoes, getDistricts } from './thai-address-helpers'
import { MobileCascadePicker } from './MobileCascadePicker'

export type { ThaiAddress }

interface ThaiAddressPickerProps {
  value: ThaiAddress
  onChange: (addr: ThaiAddress) => void
}

// ─── Main component ───────────────────────────────────────────────────────

export default function ThaiAddressPicker({ value, onChange }: ThaiAddressPickerProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <MobileCascadePicker value={value} onChange={onChange} />
  }

  return <DesktopCascadePicker value={value} onChange={onChange} />
}

// ═══════════════════════════════════════════════════════════════════════════
// DESKTOP: Inline dropdowns with auto-focus + zip preview
// ═══════════════════════════════════════════════════════════════════════════

function DesktopCascadePicker({ value, onChange }: ThaiAddressPickerProps) {
  const amphoeRef = useRef<HTMLButtonElement>(null)
  const districtRef = useRef<HTMLButtonElement>(null)

  const amphoes = useMemo(() => getAmphoes(value.province), [value.province])
  const districts = useMemo(() => getDistricts(value.province, value.amphoe), [value.province, value.amphoe])

  const handleProvince = useCallback(
    (prov: string) => {
      onChange({ province: prov, amphoe: '', district: '', zipcode: '' })
      setTimeout(() => amphoeRef.current?.focus(), 50)
    },
    [onChange],
  )

  const handleAmphoe = useCallback(
    (amp: string) => {
      onChange({ ...value, amphoe: amp, district: '', zipcode: '' })
      setTimeout(() => districtRef.current?.focus(), 50)
    },
    [onChange, value],
  )

  const handleDistrict = useCallback(
    (dist: string) => {
      const found = districts.find((d) => d.name === dist)
      onChange({ ...value, district: dist, zipcode: found?.zip ?? '' })
    },
    [onChange, value, districts],
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <DesktopComboBox
        label="จังหวัด"
        placeholder="เลือกจังหวัด"
        items={ALL_PROVINCES}
        value={value.province}
        onSelect={handleProvince}
      />
      <DesktopComboBox
        ref={amphoeRef}
        label="อำเภอ/เขต"
        placeholder="เลือกอำเภอ"
        items={amphoes}
        value={value.amphoe}
        onSelect={handleAmphoe}
        disabled={!value.province}
      />
      <DesktopComboBox
        ref={districtRef}
        label="ตำบล/แขวง"
        placeholder="เลือกตำบล"
        items={districts.map((d) => d.name)}
        itemSubs={districts.map((d) => d.zip)}
        value={value.district}
        onSelect={handleDistrict}
        disabled={!value.amphoe}
      />
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">รหัสไปรษณีย์</label>
        <Input value={value.zipcode} readOnly placeholder="—" className="bg-muted/50" />
      </div>
    </div>
  )
}

// ─── Desktop combobox using shadcn Popover + Command ─────────────────────

interface DesktopComboBoxProps {
  label: string
  placeholder: string
  items: string[]
  itemSubs?: string[]
  value: string
  onSelect: (v: string) => void
  disabled?: boolean
}

const DesktopComboBox = ({ label, placeholder, items, itemSubs, value, onSelect, disabled, ref }: DesktopComboBoxProps & { ref?: React.Ref<HTMLButtonElement> }) => {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!ref) return
    if (typeof ref === 'function') ref(triggerRef.current)
    else (ref as React.MutableRefObject<HTMLButtonElement | null>).current = triggerRef.current
  })

  const handleSelect = useCallback((item: string) => {
    setOpen(false)
    onSelect(item)
  }, [onSelect])

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full items-center justify-between radius-button border border-input bg-input px-3 text-sm',
              'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              value ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <span className="truncate">{value || placeholder}</span>
            <ChevronDown className={cn('ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform duration-150', open && 'rotate-180')} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={`ค้นหา${label}…`} />
            <CommandList className="max-h-80">
              <CommandEmpty>ไม่พบผลลัพธ์</CommandEmpty>
              <CommandGroup>
                {items.map((item, idx) => (
                  <CommandItem
                    key={item}
                    value={item}
                    onSelect={handleSelect}
                    className="flex items-center gap-2"
                  >
                    <Check className={cn('h-4 w-4 shrink-0', value === item ? 'opacity-100' : 'opacity-0')} />
                    <span className="flex-1">{item}</span>
                    {itemSubs?.[idx] && (
                      <span className="text-micro-sm text-muted-foreground tabular-nums shrink-0">{itemSubs[idx]}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
