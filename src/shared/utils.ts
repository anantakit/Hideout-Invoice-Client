import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { parseISO } from 'date-fns'

export { formatAddressForDisplay } from './utils/addressUtils'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Hoisted formatter — avoids re-creating Intl.NumberFormat on every call
const thbFormatter = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// Thai Baht formatting — matches backend locale.FormatTHB convention
export function formatTHB(amount: number): string {
  return thbFormatter.format(amount) + ' บาท'
}

// Kept as alias so existing call-sites still compile
export const formatCurrency = formatTHB

export const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

// Kept as private alias for internal use
const thaiMonths = THAI_MONTHS_FULL

// Formats an ISO date string as Buddhist Era Thai date: "23 กุมภาพันธ์ 2569"
export function formatThaiDate(dateString: string): string {
  try {
    const d = parseISO(dateString)
    const day = d.getDate()
    const month = thaiMonths[d.getMonth()]
    const year = d.getFullYear() + 543
    return `${day} ${month} ${year}`
  } catch {
    return dateString
  }
}

// Kept for backward-compat; now delegates to Thai format
export const formatDate = formatThaiDate

export function formatDateInput(dateString: string): string {
  try {
    const d = parseISO(dateString)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  } catch {
    return dateString
  }
}

export function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// ─── Short Thai date helpers (shared across many components) ──────────────

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

export const THAI_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

/** Format a Date object as short Thai date: "15 มี.ค." */
export function fmtShort(d: Date): string {
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`
}

/** Format a Date object as short Thai + 4-digit BE year: "15 มี.ค. 2569" */
export function fmtShortWithYear(d: Date): string {
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`
}

/** Format an ISO string as short Thai date: "15 มี.ค." */
export function fmtShortISO(iso: string): string {
  try {
    const d = parseISO(iso)
    return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`
  } catch { return iso }
}

/** Format an ISO string as Thai day + short date: "จ. 15 มี.ค." */
export function fmtThaiDate(iso: string): string {
  try {
    const d = parseISO(iso)
    return `${THAI_DAYS[d.getDay()]} ${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`
  } catch { return iso }
}

/** Format ISO/YYYY-MM-DD as short Thai + 2-digit BE year: "16 มี.ค. 69" */
export function fmtShortBE(iso: string): string {
  try {
    const d = parseISO(iso)
    return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${(d.getFullYear() + 543) % 100}`
  } catch { return iso }
}

/** Format ISO/YYYY-MM-DD as short Thai + 4-digit BE year: "16 มี.ค. 2569" */
export function fmtLongBE(iso: string): string {
  try {
    const d = parseISO(iso)
    return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`
  } catch { return iso }
}

// Hoisted currency formatter for the OperationsDrawer/DesktopPanel (style: currency)
const thbCurrencyFormatter = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 2,
})

/** Format as ฿1,234.00 (currency symbol, no "บาท" suffix) */
export function formatTHBCurrency(amount: number): string {
  return thbCurrencyFormatter.format(amount)
}

// Hoisted compact number formatter (no decimals, no currency symbol)
const compactFormatter = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** Format number with Thai locale grouping, no decimals: "1,234" */
export function formatCompactNumber(n: number): string {
  return compactFormatter.format(n)
}

/** Format number with M/k suffix for compact display: 1200000 → "1.2M", 4500 → "4500k", 800 → "800" */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return n.toFixed(0)
}

/** Format number for KPI display: M suffix for millions, else Thai locale grouping */
export function formatKPI(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  return formatCompactNumber(n)
}

/** Format Thai phone number: 0812345678 → 081-234-5678 */
export function formatPhone(phone: string | undefined | null): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
  return phone
}

/** Extract a user-friendly error message from unknown error types */
export function getErrorMessage(err: unknown, fallback = 'เกิดข้อผิดพลาด กรุณาลองใหม่'): string {
  if (err instanceof Error) return err.message || fallback
  if (typeof err === 'string') return err
  return fallback
}

export function addDaysISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Detect mobile/touch device for share vs copy behavior. */
export const isMobileDevice = () =>
  window.matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0
