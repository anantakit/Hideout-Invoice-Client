import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ChevronDown, Check, Search, X } from 'lucide-react'
import { Input } from './input'
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

export default function ThaiAddressPicker({ value, onChange }: ThaiAddressPickerProps) {
  const provinces = useMemo(() => data.map((p) => p[0]), [])

  const amphoes = useMemo(() => {
    if (!value.province) return []
    const prov = data.find((p) => p[0] === value.province)
    return prov ? prov[1].map((a) => a[0]) : []
  }, [value.province])

  const districts = useMemo(() => {
    if (!value.province || !value.amphoe) return []
    const prov = data.find((p) => p[0] === value.province)
    if (!prov) return []
    const amp = prov[1].find((a) => a[0] === value.amphoe)
    return amp ? amp[1].map((d) => ({ name: d[0], zip: d[1] })) : []
  }, [value.province, value.amphoe])

  const handleProvince = useCallback(
    (prov: string) => {
      onChange({ province: prov, amphoe: '', district: '', zipcode: '' })
    },
    [onChange]
  )

  const handleAmphoe = useCallback(
    (amp: string) => {
      onChange({ ...value, amphoe: amp, district: '', zipcode: '' })
    },
    [onChange, value]
  )

  const handleDistrict = useCallback(
    (dist: string) => {
      const found = districts.find((d) => d.name === dist)
      onChange({ ...value, district: dist, zipcode: found?.zip ?? '' })
    },
    [onChange, value, districts]
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <LocalComboBox
        label="จังหวัด"
        placeholder="เลือกจังหวัด"
        sheetTitle="เลือกจังหวัด"
        items={provinces}
        value={value.province}
        onSelect={handleProvince}
      />
      <LocalComboBox
        label="อำเภอ/เขต"
        placeholder="เลือกอำเภอ"
        sheetTitle="เลือกอำเภอ/เขต"
        items={amphoes}
        value={value.amphoe}
        onSelect={handleAmphoe}
        disabled={!value.province}
      />
      <LocalComboBox
        label="ตำบล/แขวง"
        placeholder="เลือกตำบล"
        sheetTitle="เลือกตำบล/แขวง"
        items={districts.map((d) => d.name)}
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

/* ─── Lightweight local-data combobox ─────────────────────── */

interface LocalComboBoxProps {
  label: string
  placeholder: string
  sheetTitle: string
  items: string[]
  value: string
  onSelect: (v: string) => void
  disabled?: boolean
}

const TRIGGER_BASE =
  'flex h-10 w-full items-center justify-between radius-button border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50'

function LocalComboBox({ label, placeholder, sheetTitle, items, value, onSelect, disabled }: LocalComboBoxProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <MobileComboBox
        label={label}
        placeholder={placeholder}
        sheetTitle={sheetTitle}
        items={items}
        value={value}
        onSelect={onSelect}
        disabled={disabled}
      />
    )
  }

  return (
    <DesktopComboBox
      label={label}
      placeholder={placeholder}
      items={items}
      value={value}
      onSelect={onSelect}
      disabled={disabled}
    />
  )
}

/* ─── Desktop: inline dropdown with search ──────────────────── */

const MAX_DROPDOWN_H = 192

function DesktopComboBox({ label, placeholder, items, value, onSelect, disabled }: Omit<LocalComboBoxProps, 'sheetTitle'>) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0, openUp: false })

  useEffect(() => {
    if (!open) setSearch(value)
  }, [value, open])

  useEffect(() => {
    if (!value && !open) setSearch('')
  }, [value, open])

  const filtered = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter((it) => it.toLowerCase().includes(q))
  }, [items, search])

  useEffect(() => {
    setHighlightIdx(-1)
  }, [filtered])

  useEffect(() => {
    if (highlightIdx < 0 || !listRef.current) return
    const el = listRef.current.children[highlightIdx] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlightIdx])

  useLayoutEffect(() => {
    if (!open || !inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const openUp = spaceBelow < MAX_DROPDOWN_H && rect.top > spaceBelow
    setDropdownPos({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      openUp,
    })
  }, [open, filtered])

  const handleSelect = (item: string) => {
    setSearch(item)
    setOpen(false)
    onSelect(item)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true)
        e.preventDefault()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIdx >= 0 && highlightIdx < filtered.length) {
        handleSelect(filtered[highlightIdx])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setSearch(value)
    }
  }

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        listRef.current && !listRef.current.contains(target)
      ) {
        setOpen(false)
        setSearch(value)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, value])

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={open ? search : value || ''}
          onChange={(e) => {
            setSearch(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => {
            setOpen(true)
            setSearch('')
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          className="pr-8"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
          <ChevronDown className={cn('w-4 h-4 transition-transform duration-150', open && 'rotate-180')} />
        </span>
      </div>
      {open &&
        createPortal(
          <div
            ref={listRef}
            role="listbox"
            className="fixed z-[9999] bg-card border border-border radius-card shadow-popover max-h-48 overflow-y-auto"
            style={{
              left: dropdownPos.left,
              width: Math.max(dropdownPos.width, 220),
              ...(dropdownPos.openUp
                ? { bottom: window.innerHeight - dropdownPos.top }
                : { top: dropdownPos.top }),
            }}
          >
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">ไม่พบผลลัพธ์</div>
            ) : (
              filtered.map((item, idx) => (
                <button
                  key={item}
                  type="button"
                  role="option"
                  aria-selected={item === value}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlightIdx(idx)}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    'w-full text-left px-4 py-2 text-sm transition-colors',
                    item === value && 'text-primary font-medium',
                    idx === highlightIdx ? 'bg-accent/60' : 'hover:bg-muted'
                  )}
                >
                  {item}
                </button>
              ))
            )}
          </div>,
          document.body
        )}
    </div>
  )
}

/* ─── Mobile: bottom sheet (same pattern as select.tsx) ──────── */

function MobileComboBox({
  label,
  placeholder,
  sheetTitle,
  items,
  value,
  onSelect,
  disabled,
}: LocalComboBoxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selectedRef = useRef<HTMLButtonElement>(null)

  const filtered = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter((it) => it.toLowerCase().includes(q))
  }, [items, search])

  // Reset search on close
  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  // Auto-scroll to selected item
  useEffect(() => {
    if (open && selectedRef.current) {
      const timer = setTimeout(() => {
        selectedRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 280)
      return () => clearTimeout(timer)
    }
  }, [open])

  const handleSelect = useCallback(
    (item: string) => {
      onSelect(item)
      setOpen(false)
    },
    [onSelect],
  )

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <button
        type="button"
        disabled={disabled}
        className={cn(TRIGGER_BASE, 'pr-8')}
        onClick={() => setOpen(true)}
      >
        {value ? (
          <span className="truncate">{value}</span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          {/* Backdrop */}
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            )}
          />

          {/* Sheet */}
          <DialogPrimitive.Content
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 flex flex-col',
              'max-h-[85vh] rounded-t-2xl border-t border-border bg-card shadow-xl',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
              'data-[state=closed]:duration-200 data-[state=open]:duration-250',
            )}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 shrink-0">
              <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                {sheetTitle}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">ปิด</span>
              </DialogPrimitive.Close>
            </div>

            <DialogPrimitive.Description className="sr-only">
              เลือกตัวเลือกจากรายการด้านล่าง
            </DialogPrimitive.Description>

            {/* Search */}
            <div className="px-4 pb-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหา…"
                  className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoComplete="off"
                  autoCorrect="off"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border shrink-0" />

            {/* Options list */}
            <div
              role="listbox"
              aria-label={sheetTitle}
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
                  const isSelected = item === value
                  return (
                    <button
                      key={item}
                      ref={isSelected ? selectedRef : undefined}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(item)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-4 min-h-[3rem] py-3 text-left transition-colors',
                        'active:bg-accent/80',
                        isSelected
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border',
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className="flex-1 text-[15px] leading-snug">{item}</span>
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
