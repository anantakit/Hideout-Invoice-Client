import { describe, it, expect } from 'vitest'
import { parseAddressToThaiAddr, buildAddressString, emptyAddr } from './addressUtils'

// ── parseAddressToThaiAddr ──────────────────────────────────────

describe('parseAddressToThaiAddr', () => {
  it('parses standard Thai address with ต./อ./จ.', () => {
    const result = parseAddressToThaiAddr('123/4 หมู่ 5 ต.ในเมือง อ.เมือง จ.เชียงใหม่ 50000')
    expect(result.detail).toBe('123/4 หมู่ 5')
    expect(result.thai).toEqual({
      district: 'ในเมือง',
      amphoe: 'เมือง',
      province: 'เชียงใหม่',
      zipcode: '50000',
    })
  })

  it('parses address with ตำบล/อำเภอ/จังหวัด', () => {
    const result = parseAddressToThaiAddr('99 ตำบลช้างคลาน อำเภอเมือง จังหวัดเชียงใหม่ 50100')
    expect(result.detail).toBe('99')
    expect(result.thai).toEqual({
      district: 'ช้างคลาน',
      amphoe: 'เมือง',
      province: 'เชียงใหม่',
      zipcode: '50100',
    })
  })

  it('parses Bangkok-style address with แขวง/เขต', () => {
    const result = parseAddressToThaiAddr('55 ถนนสุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพมหานคร 10110')
    expect(result.detail).toBe('55 ถนนสุขุมวิท')
    expect(result.thai).toEqual({
      district: 'คลองตัน',
      amphoe: 'คลองเตย',
      province: 'กรุงเทพมหานคร',
      zipcode: '10110',
    })
  })

  it('returns full string as detail when unparseable', () => {
    const result = parseAddressToThaiAddr('some random address')
    expect(result.detail).toBe('some random address')
    expect(result.thai).toEqual(emptyAddr)
  })

  it('returns empty detail and empty thai for empty string', () => {
    const result = parseAddressToThaiAddr('')
    expect(result.detail).toBe('')
    expect(result.thai).toEqual(emptyAddr)
  })
})

// ── buildAddressString ──────────────────────────────────────────

describe('buildAddressString', () => {
  it('builds full address string with all parts', () => {
    const result = buildAddressString('123/4 หมู่ 5', {
      district: 'ในเมือง',
      amphoe: 'เมือง',
      province: 'เชียงใหม่',
      zipcode: '50000',
    })
    expect(result).toBe('123/4 หมู่ 5 ต.ในเมือง อ.เมือง จ.เชียงใหม่ 50000')
  })

  it('builds address with partial thai parts', () => {
    const result = buildAddressString('123', {
      district: '',
      amphoe: 'เมือง',
      province: 'เชียงใหม่',
      zipcode: '',
    })
    expect(result).toBe('123 อ.เมือง จ.เชียงใหม่')
  })

  it('returns detail only when all thai parts are empty', () => {
    const result = buildAddressString('123 Main St', emptyAddr)
    expect(result).toBe('123 Main St')
  })

  it('trims whitespace from detail', () => {
    const result = buildAddressString('  123  ', {
      district: 'ในเมือง',
      amphoe: 'เมือง',
      province: 'เชียงใหม่',
      zipcode: '50000',
    })
    expect(result).toBe('123 ต.ในเมือง อ.เมือง จ.เชียงใหม่ 50000')
  })

  it('roundtrips with parseAddressToThaiAddr', () => {
    const original = '123/4 หมู่ 5 ต.ในเมือง อ.เมือง จ.เชียงใหม่ 50000'
    const parsed = parseAddressToThaiAddr(original)
    const rebuilt = buildAddressString(parsed.detail, parsed.thai)
    expect(rebuilt).toBe(original)
  })
})
