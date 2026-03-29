import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  cn,
  formatTHB,
  formatCurrency,
  formatTHBCurrency,
  formatCompactNumber,
  formatCompact,
  formatKPI,
  formatThaiDate,
  formatDate,
  formatDateInput,
  todayISO,
  addDaysISO,
  fmtShort,
  fmtShortWithYear,
  fmtShortISO,
  fmtThaiDate,
  fmtShortBE,
  fmtLongBE,
  formatPhone,
  getErrorMessage,
  isMobileDevice,
  THAI_MONTHS_FULL,
  THAI_MONTHS_SHORT,
  THAI_DAYS,
} from './utils'

// ── cn ──────────────────────────────────────────────────────────

describe('cn', () => {
  it('merges single class', () => {
    expect(cn('px-4')).toBe('px-4')
  })

  it('merges multiple classes', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })

  it('handles conditional classes', () => {
    const hide = false
    const show = true
    expect(cn('px-4', hide && 'hidden', 'py-2')).toBe('px-4 py-2')
    expect(cn('px-4', show && 'hidden', 'py-2')).toBe('px-4 hidden py-2')
  })

  it('resolves tailwind conflicts (last wins)', () => {
    expect(cn('px-4', 'px-8')).toBe('px-8')
  })

  it('returns empty string for no input', () => {
    expect(cn()).toBe('')
  })
})

// ── formatTHB / formatCurrency ──────────────────────────────────

describe('formatTHB', () => {
  it('formats zero', () => {
    expect(formatTHB(0)).toBe('0.00 บาท')
  })

  it('formats positive integer', () => {
    expect(formatTHB(1500)).toBe('1,500.00 บาท')
  })

  it('formats decimal amount', () => {
    expect(formatTHB(1234.5)).toBe('1,234.50 บาท')
  })

  it('formats negative amount', () => {
    expect(formatTHB(-500)).toBe('-500.00 บาท')
  })

  it('formats large number with thousand separator', () => {
    expect(formatTHB(1000000)).toBe('1,000,000.00 บาท')
  })

  it('rounds to 2 decimal places', () => {
    expect(formatTHB(99.999)).toBe('100.00 บาท')
  })
})

describe('formatCurrency', () => {
  it('is an alias for formatTHB', () => {
    expect(formatCurrency).toBe(formatTHB)
  })
})

// ── formatTHBCurrency ───────────────────────────────────────────

describe('formatTHBCurrency', () => {
  it('formats with ฿ symbol', () => {
    const result = formatTHBCurrency(1234)
    expect(result).toContain('1,234.00')
    expect(result).toContain('฿')
  })

  it('formats zero', () => {
    const result = formatTHBCurrency(0)
    expect(result).toContain('0.00')
  })
})

// ── formatCompactNumber / formatCompact / formatKPI ─────────────

describe('formatCompactNumber', () => {
  it('formats zero', () => {
    expect(formatCompactNumber(0)).toBe('0')
  })

  it('formats hundreds without grouping', () => {
    expect(formatCompactNumber(800)).toBe('800')
  })

  it('formats thousands with grouping', () => {
    expect(formatCompactNumber(4500)).toBe('4,500')
  })

  it('formats millions with grouping', () => {
    expect(formatCompactNumber(1200000)).toBe('1,200,000')
  })
})

describe('formatCompact', () => {
  it('formats zero', () => {
    expect(formatCompact(0)).toBe('0')
  })

  it('returns plain number for hundreds', () => {
    expect(formatCompact(800)).toBe('800')
  })

  it('formats thousands with k suffix', () => {
    expect(formatCompact(4500)).toBe('5k')
  })

  it('formats millions with M suffix', () => {
    expect(formatCompact(1200000)).toBe('1.2M')
  })
})

describe('formatKPI', () => {
  it('formats zero', () => {
    expect(formatKPI(0)).toBe('0')
  })

  it('formats hundreds with Thai locale grouping', () => {
    expect(formatKPI(800)).toBe('800')
  })

  it('formats thousands with Thai locale grouping', () => {
    expect(formatKPI(4500)).toBe('4,500')
  })

  it('formats millions with M suffix', () => {
    expect(formatKPI(1200000)).toBe('1.2M')
  })
})

// ── formatThaiDate / formatDate ─────────────────────────────────

describe('formatThaiDate', () => {
  it('formats ISO date string with Buddhist Era year and Thai month', () => {
    expect(formatThaiDate('2024-03-15')).toBe('15 มีนาคม 2567')
  })

  it('formats January date correctly', () => {
    expect(formatThaiDate('2024-01-01')).toBe('1 มกราคม 2567')
  })

  it('formats December date correctly', () => {
    expect(formatThaiDate('2024-12-31')).toBe('31 ธันวาคม 2567')
  })

  it('returns NaN-based string for invalid date (parseISO does not throw)', () => {
    // parseISO returns Invalid Date rather than throwing
    const result = formatThaiDate('not-a-date')
    expect(result).toContain('NaN')
  })
})

describe('formatDate', () => {
  it('is an alias for formatThaiDate', () => {
    expect(formatDate).toBe(formatThaiDate)
  })
})

// ── fmtShort / fmtShortWithYear / fmtShortISO ──────────────────

describe('fmtShort', () => {
  it('formats Date as short Thai date', () => {
    const d = new Date(2024, 2, 15) // March 15, 2024
    expect(fmtShort(d)).toBe('15 มี.ค.')
  })

  it('formats January date', () => {
    const d = new Date(2024, 0, 1)
    expect(fmtShort(d)).toBe('1 ม.ค.')
  })
})

describe('fmtShortWithYear', () => {
  it('formats Date with 4-digit Buddhist Era year', () => {
    const d = new Date(2024, 2, 15)
    expect(fmtShortWithYear(d)).toBe('15 มี.ค. 2567')
  })

  it('formats Date in 2026', () => {
    const d = new Date(2026, 0, 1)
    expect(fmtShortWithYear(d)).toBe('1 ม.ค. 2569')
  })
})

describe('fmtShortISO', () => {
  it('formats ISO string as short Thai date', () => {
    expect(fmtShortISO('2024-03-15')).toBe('15 มี.ค.')
  })

  it('returns NaN-based string for invalid ISO (parseISO does not throw)', () => {
    const result = fmtShortISO('bad')
    expect(result).toContain('NaN')
  })
})

// ── fmtThaiDate / fmtShortBE / fmtLongBE ───────────────────────

describe('fmtThaiDate', () => {
  it('formats ISO as Thai day + short date', () => {
    // 2024-03-15 is a Friday
    expect(fmtThaiDate('2024-03-15')).toBe('ศ. 15 มี.ค.')
  })

  it('formats Sunday correctly', () => {
    // 2024-03-17 is a Sunday
    expect(fmtThaiDate('2024-03-17')).toBe('อา. 17 มี.ค.')
  })

  it('returns NaN-based string for invalid ISO (parseISO does not throw)', () => {
    const result = fmtThaiDate('bad')
    expect(result).toContain('NaN')
  })
})

describe('fmtShortBE', () => {
  it('formats with 2-digit Buddhist Era year', () => {
    expect(fmtShortBE('2024-03-16')).toBe('16 มี.ค. 67')
  })

  it('returns NaN-based string for invalid ISO (parseISO does not throw)', () => {
    const result = fmtShortBE('bad')
    expect(result).toContain('NaN')
  })
})

describe('fmtLongBE', () => {
  it('formats with 4-digit Buddhist Era year', () => {
    expect(fmtLongBE('2024-03-16')).toBe('16 มี.ค. 2567')
  })

  it('returns NaN-based string for invalid ISO (parseISO does not throw)', () => {
    const result = fmtLongBE('bad')
    expect(result).toContain('NaN')
  })
})

// ── formatDateInput ─────────────────────────────────────────────

describe('formatDateInput', () => {
  it('formats ISO string to YYYY-MM-DD', () => {
    expect(formatDateInput('2024-03-15')).toBe('2024-03-15')
  })

  it('pads single-digit month and day', () => {
    expect(formatDateInput('2024-01-05')).toBe('2024-01-05')
  })

  it('returns NaN-based string for invalid date (parseISO does not throw)', () => {
    const result = formatDateInput('not-a-date')
    expect(result).toContain('NaN')
  })
})

// ── todayISO / addDaysISO ───────────────────────────────────────

describe('todayISO', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 2, 15)) // 2024-03-15
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns today in YYYY-MM-DD format', () => {
    expect(todayISO()).toBe('2024-03-15')
  })
})

describe('addDaysISO', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 2, 15)) // 2024-03-15
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds positive days', () => {
    expect(addDaysISO(3)).toBe('2024-03-18')
  })

  it('adds zero days (returns today)', () => {
    expect(addDaysISO(0)).toBe('2024-03-15')
  })

  it('adds negative days', () => {
    expect(addDaysISO(-5)).toBe('2024-03-10')
  })

  it('crosses month boundary', () => {
    expect(addDaysISO(20)).toBe('2024-04-04')
  })
})

// ── formatPhone ─────────────────────────────────────────────────

describe('formatPhone', () => {
  it('formats 10-digit phone number', () => {
    expect(formatPhone('0812345678')).toBe('081-234-5678')
  })

  it('formats 9-digit phone number', () => {
    expect(formatPhone('021234567')).toBe('02-123-4567')
  })

  it('returns empty string for null', () => {
    expect(formatPhone(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(formatPhone(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(formatPhone('')).toBe('')
  })

  it('returns original for non-standard length', () => {
    expect(formatPhone('12345')).toBe('12345')
  })

  it('strips non-digit characters before formatting', () => {
    expect(formatPhone('081-234-5678')).toBe('081-234-5678')
  })
})

// ── getErrorMessage ─────────────────────────────────────────────

describe('getErrorMessage', () => {
  it('extracts message from Error object', () => {
    expect(getErrorMessage(new Error('ข้อมูลไม่ถูกต้อง'))).toBe('ข้อมูลไม่ถูกต้อง')
  })

  it('returns string error as-is', () => {
    expect(getErrorMessage('something went wrong')).toBe('something went wrong')
  })

  it('returns default fallback for unknown type', () => {
    expect(getErrorMessage(42)).toBe('เกิดข้อผิดพลาด กรุณาลองใหม่')
  })

  it('returns custom fallback for unknown type', () => {
    expect(getErrorMessage(null, 'กรุณาลองใหม่อีกครั้ง')).toBe('กรุณาลองใหม่อีกครั้ง')
  })

  it('returns fallback when Error has empty message', () => {
    expect(getErrorMessage(new Error(''))).toBe('เกิดข้อผิดพลาด กรุณาลองใหม่')
  })
})

// ── isMobileDevice ──────────────────────────────────────────────

describe('isMobileDevice', () => {
  it('returns true for coarse pointer + touch device', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 2, configurable: true })
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })

    expect(isMobileDevice()).toBe(true)
  })

  it('returns false for fine pointer (desktop)', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true })
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })

    expect(isMobileDevice()).toBe(false)
  })
})

// ── Exported constants ──────────────────────────────────────────

describe('THAI_MONTHS_FULL', () => {
  it('has 12 months', () => {
    expect(THAI_MONTHS_FULL).toHaveLength(12)
  })

  it('starts with มกราคม and ends with ธันวาคม', () => {
    expect(THAI_MONTHS_FULL[0]).toBe('มกราคม')
    expect(THAI_MONTHS_FULL[11]).toBe('ธันวาคม')
  })
})

describe('THAI_MONTHS_SHORT', () => {
  it('has 12 months', () => {
    expect(THAI_MONTHS_SHORT).toHaveLength(12)
  })

  it('starts with ม.ค. and ends with ธ.ค.', () => {
    expect(THAI_MONTHS_SHORT[0]).toBe('ม.ค.')
    expect(THAI_MONTHS_SHORT[11]).toBe('ธ.ค.')
  })
})

describe('THAI_DAYS', () => {
  it('has 7 days', () => {
    expect(THAI_DAYS).toHaveLength(7)
  })

  it('starts with อา. (Sunday) and ends with ส. (Saturday)', () => {
    expect(THAI_DAYS[0]).toBe('อา.')
    expect(THAI_DAYS[6]).toBe('ส.')
  })
})
