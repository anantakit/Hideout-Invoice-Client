import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ChevronDown, ChevronLeft, Check, Search, X, MapPin } from 'lucide-react'
import { Input } from './input'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command'
import { cn } from '@/shared/utils'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import addressData from '@/shared/data/thai-address.json'

// Data format: [[province, [[amphoe, [[district, zipcode], ...]], ...]], ...]
type DistrictEntry = [string, string]
type AmphoeEntry = [string, DistrictEntry[]]
type ProvinceEntry = [string, AmphoeEntry[]]
const data = addressData as ProvinceEntry[]

export interface ThaiAddress {
  province: string
  amphoe: string
  district: string
  zipcode: string
}

interface ThaiAddressPickerProps {
  value: ThaiAddress
  onChange: (addr: ThaiAddress) => void
}

// ─── Lookup helpers (shared between mobile & desktop) ──────────────────────

function getAmphoes(province: string): string[] {
  if (!province) return []
  const prov = data.find((p) => p[0] === province)
  return prov ? prov[1].map((a) => a[0]) : []
}

function getDistricts(province: string, amphoe: string): { name: string; zip: string }[] {
  if (!province || !amphoe) return []
  const prov = data.find((p) => p[0] === province)
  if (!prov) return []
  const amp = prov[1].find((a) => a[0] === amphoe)
  return amp ? amp[1].map((d) => ({ name: d[0], zip: d[1] })) : []
}

const ALL_PROVINCES = data.map((p) => p[0])

// ─── Main component ───────────────────────────────────────────────────────

export default function ThaiAddressPicker({ value, onChange }: ThaiAddressPickerProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <MobileCascadePicker value={value} onChange={onChange} />
  }

  return <DesktopCascadePicker value={value} onChange={onChange} />
}

// ═══════════════════════════════════════════════════════════════════════════
// MOBILE: Single sheet with 3-step wizard
// ═══════════════════════════════════════════════════════════════════════════

type Step = 'province' | 'amphoe' | 'district'

const STEP_CONFIG: Record<Step, { title: string; searchPlaceholder: string }> = {
  province: { title: 'เลือกจังหวัด', searchPlaceholder: 'ค้นหาจังหวัด…' },
  amphoe: { title: 'เลือกอำเภอ/เขต', searchPlaceholder: 'ค้นหาอำเภอ…' },
  district: { title: 'เลือกตำบล/แขวง', searchPlaceholder: 'ค้นหาตำบล…' },
}

function MobileCascadePicker({ value, onChange }: ThaiAddressPickerProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('province')
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<ThaiAddress>({ province: '', amphoe: '', district: '', zipcode: '' })
  const listRef = useRef<HTMLDivElement>(null)

  // Sync draft from value when opening
  const handleOpen = useCallback(() => {
    setDraft({ ...value })
    // Start at the first empty step
    if (!value.province) setStep('province')
    else if (!value.amphoe) setStep('amphoe')
    else if (!value.district) setStep('district')
    else setStep('province')
    setSearch('')
    setOpen(true)
  }, [value])

  // Reset search when step changes
  useEffect(() => {
    setSearch('')
    // Scroll list to top
    if (listRef.current) listRef.current.scrollTop = 0
  }, [step])

  // Compute items for current step
  const items = useMemo(() => {
    if (step === 'province') return ALL_PROVINCES.map((p) => ({ label: p, sub: '', value: p }))
    if (step === 'amphoe') return getAmphoes(draft.province).map((a) => ({ label: a, sub: '', value: a }))
    return getDistricts(draft.province, draft.amphoe).map((d) => ({ label: d.name, sub: d.zip, value: d.name }))
  }, [step, draft.province, draft.amphoe])

  const filtered = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter((it) => it.label.toLowerCase().includes(q) || it.sub.includes(q))
  }, [items, search])

  const currentValue = step === 'province' ? draft.province : step === 'amphoe' ? draft.amphoe : draft.district

  const handleSelect = useCallback((item: string) => {
    if (step === 'province') {
      setDraft({ province: item, amphoe: '', district: '', zipcode: '' })
      setStep('amphoe') // auto-advance
    } else if (step === 'amphoe') {
      setDraft((d) => ({ ...d, amphoe: item, district: '', zipcode: '' }))
      setStep('district') // auto-advance
    } else {
      // district — find zip and commit
      const districts = getDistricts(draft.province, draft.amphoe)
      const found = districts.find((d) => d.name === item)
      const final: ThaiAddress = { ...draft, district: item, zipcode: found?.zip ?? '' }
      onChange(final)
      setOpen(false)
    }
  }, [step, draft, onChange])

  const handleBack = useCallback(() => {
    if (step === 'district') setStep('amphoe')
    else if (step === 'amphoe') setStep('province')
  }, [step])

  // Display summary for trigger button
  const hasFull = value.province && value.amphoe && value.district
  const hasPartial = value.province && !hasFull

  const config = STEP_CONFIG[step]

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">จังหวัด / อำเภอ / ตำบล</label>
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          'flex h-11 w-full items-center gap-2 radius-button border border-border bg-input px-3 text-sm text-left',
          'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        )}
      >
        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
        {hasFull ? (
          <span className="flex-1 truncate text-foreground">
            ต.{value.district} อ.{value.amphoe} จ.{value.province} {value.zipcode}
          </span>
        ) : hasPartial ? (
          <span className="flex-1 truncate text-muted-foreground">
            จ.{value.province}{value.amphoe ? ` อ.${value.amphoe}` : ''} — กดเพื่อเลือกต่อ
          </span>
        ) : (
          <span className="flex-1 text-muted-foreground">เลือกที่อยู่</span>
        )}
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            )}
          />
          <DialogPrimitive.Content
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 flex flex-col',
              'sheet-mobile rounded-t-2xl border-t border-border bg-card shadow-xl',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
              'data-[state=closed]:duration-200 data-[state=open]:duration-250',
            )}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
            </div>

            {/* Header with back button */}
            <div className="flex items-center gap-2 px-4 pb-3 shrink-0">
              {step !== 'province' ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground shrink-0"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : (
                <div className="w-8" /> // spacer
              )}
              <div className="flex-1 min-w-0">
                <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                  {config.title}
                </DialogPrimitive.Title>
                {/* Breadcrumb showing progress */}
                {step !== 'province' && (
                  <p className="text-micro-sm text-muted-foreground truncate mt-0.5">
                    จ.{draft.province}{step === 'district' ? ` › อ.${draft.amphoe}` : ''}
                  </p>
                )}
              </div>
              <DialogPrimitive.Close className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground shrink-0">
                <X className="h-4 w-4" />
                <span className="sr-only">ปิด</span>
              </DialogPrimitive.Close>
            </div>

            <DialogPrimitive.Description className="sr-only">
              เลือกที่อยู่จากรายการด้านล่าง
            </DialogPrimitive.Description>

            {/* Search */}
            <div className="px-4 pb-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={config.searchPlaceholder}
                  className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoComplete="off"
                  autoCorrect="off"
                />
              </div>
            </div>

            <div className="h-px bg-border shrink-0" />

            {/* Options list */}
            <div
              ref={listRef}
              role="listbox"
              aria-label={config.title}
              className="flex-1 overflow-y-auto overscroll-contain px-2 py-2"
              style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
            >
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Search className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">ไม่พบรายการ</p>
                </div>
              ) : (
                filtered.map((item) => {
                  const isSelected = item.value === currentValue
                  return (
                    <button
                      key={item.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(item.value)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-4 min-h-[3rem] py-3 text-left transition-colors',
                        'active:bg-accent/80',
                        isSelected ? 'bg-primary/10 text-primary' : 'text-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all',
                          isSelected ? 'bg-primary text-primary-foreground' : 'border border-border',
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className="flex-1 text-sm leading-snug">{item.label}</span>
                      {item.sub && (
                        <span className="text-micro-sm text-muted-foreground tabular-nums shrink-0">
                          {item.sub}
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
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
      // Auto-focus amphoe after selecting province
      setTimeout(() => amphoeRef.current?.focus(), 50)
    },
    [onChange],
  )

  const handleAmphoe = useCallback(
    (amp: string) => {
      onChange({ ...value, amphoe: amp, district: '', zipcode: '' })
      // Auto-focus district after selecting amphoe
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

  // Expose focus via ref
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
