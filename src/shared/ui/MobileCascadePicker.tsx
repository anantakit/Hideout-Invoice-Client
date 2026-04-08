import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ChevronDown, ChevronLeft, Check, Search, X, MapPin } from 'lucide-react'
import { cn } from '@/shared/utils'
import type { ThaiAddress } from './thai-address-helpers'
import { ALL_PROVINCES, getAmphoes, getDistricts } from './thai-address-helpers'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'province' | 'amphoe' | 'district'

const STEP_CONFIG: Record<Step, { title: string; searchPlaceholder: string }> = {
  province: { title: 'เลือกจังหวัด', searchPlaceholder: 'ค้นหาจังหวัด…' },
  amphoe: { title: 'เลือกอำเภอ/เขต', searchPlaceholder: 'ค้นหาอำเภอ…' },
  district: { title: 'เลือกตำบล/แขวง', searchPlaceholder: 'ค้นหาตำบล…' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MobileCascadePicker({ value, onChange }: { value: ThaiAddress; onChange: (addr: ThaiAddress) => void }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('province')
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<ThaiAddress>({ province: '', amphoe: '', district: '', zipcode: '' })
  const listRef = useRef<HTMLDivElement>(null)

  const handleOpen = useCallback(() => {
    setDraft({ ...value })
    if (!value.province) setStep('province')
    else if (!value.amphoe) setStep('amphoe')
    else if (!value.district) setStep('district')
    else setStep('province')
    setSearch('')
    setOpen(true)
  }, [value])

  useEffect(() => {
    setSearch('')
    if (listRef.current) listRef.current.scrollTop = 0
  }, [step])

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
      setStep('amphoe')
    } else if (step === 'amphoe') {
      setDraft((d) => ({ ...d, amphoe: item, district: '', zipcode: '' }))
      setStep('district')
    } else {
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

  const hasFull = value.province && value.amphoe && value.district
  const hasPartial = value.province && !hasFull
  const config = STEP_CONFIG[step]
  const isBkk = (p: string) => p === 'กรุงเทพมหานคร'
  const districtLabel = (p: string, d: string) => (isBkk(p) ? `แขวง${d}` : `ต.${d}`)
  const amphoeLabel = (p: string, a: string) => (isBkk(p) ? `เขต${a}` : `อ.${a}`)
  const provinceLabel = (p: string) => (isBkk(p) ? p : `จ.${p}`)

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
            {`${districtLabel(value.province, value.district)} ${amphoeLabel(value.province, value.amphoe)} ${provinceLabel(value.province)} ${value.zipcode}`}
          </span>
        ) : hasPartial ? (
          <span className="flex-1 truncate text-muted-foreground">
            {`${provinceLabel(value.province)}${value.amphoe ? ` ${amphoeLabel(value.province, value.amphoe)}` : ''}`} — กดเพื่อเลือกต่อ
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
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
            </div>

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
                <div className="w-8" />
              )}
              <div className="flex-1 min-w-0">
                <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                  {config.title}
                </DialogPrimitive.Title>
                {step !== 'province' && (
                  <p className="text-micro-sm text-muted-foreground truncate mt-0.5">
                    {`${provinceLabel(draft.province)}${step === 'district' ? ` › ${amphoeLabel(draft.province, draft.amphoe)}` : ''}`}
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
                        'flex w-full items-center gap-3 rounded-xl px-4 min-h-12 py-3 text-left transition-colors',
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
