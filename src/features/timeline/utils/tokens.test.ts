import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getCellWidthPx,
  computeRowHeight,
  TIMELINE_CELL_WIDTH_PX,
  TIMELINE_ROW_HEIGHT_PX,
  TIMELINE_BLOCK_HEIGHT_PX,
  TIMELINE_BLOCK_GAP_PX,
  TIMELINE_BLOCK_PADDING_PX,
} from './tokens'

// ─── getCellWidthPx ─────────────────────────────────────────────────────────

describe('getCellWidthPx', () => {
  let getPropertyValueSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    getPropertyValueSpy = vi.fn().mockReturnValue('')
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: getPropertyValueSpy,
    } as unknown as CSSStyleDeclaration)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns default when CSS property is empty', () => {
    getPropertyValueSpy.mockReturnValue('')
    expect(getCellWidthPx()).toBe(TIMELINE_CELL_WIDTH_PX)
  })

  it('parses rem value from CSS property', () => {
    getPropertyValueSpy.mockReturnValue('10rem')
    expect(getCellWidthPx()).toBe(160) // 10 * 16
  })

  it('parses px value from CSS property', () => {
    getPropertyValueSpy.mockReturnValue('200px')
    expect(getCellWidthPx()).toBe(200)
  })

  it('returns default for unrecognized unit', () => {
    getPropertyValueSpy.mockReturnValue('10em')
    expect(getCellWidthPx()).toBe(TIMELINE_CELL_WIDTH_PX)
  })
})

// ─── computeRowHeight ───────────────────────────────────────────────────────

describe('computeRowHeight', () => {
  it('returns standard row height for 0 layers', () => {
    expect(computeRowHeight(0)).toBe(TIMELINE_ROW_HEIGHT_PX)
  })

  it('returns standard row height for 1 layer', () => {
    expect(computeRowHeight(1)).toBe(TIMELINE_ROW_HEIGHT_PX)
  })

  it('computes correct height for 2 layers', () => {
    const expected =
      TIMELINE_BLOCK_PADDING_PX * 2 +
      2 * TIMELINE_BLOCK_HEIGHT_PX +
      1 * TIMELINE_BLOCK_GAP_PX
    expect(computeRowHeight(2)).toBe(expected)
  })

  it('computes correct height for 3 layers', () => {
    const expected =
      TIMELINE_BLOCK_PADDING_PX * 2 +
      3 * TIMELINE_BLOCK_HEIGHT_PX +
      2 * TIMELINE_BLOCK_GAP_PX
    expect(computeRowHeight(3)).toBe(expected)
  })

  it('scales linearly with layer count', () => {
    const h2 = computeRowHeight(2)
    const h3 = computeRowHeight(3)
    const diff = h3 - h2
    expect(diff).toBe(TIMELINE_BLOCK_HEIGHT_PX + TIMELINE_BLOCK_GAP_PX)
  })
})
