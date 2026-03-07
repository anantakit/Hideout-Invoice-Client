/**
 * Timeline layout tokens (JavaScript mirror of CSS custom properties).
 *
 * These numeric values MUST stay in sync with the CSS custom properties
 * declared in index.css:
 *   --timeline-cell-width:     7.5rem  → 120 px (at base font-size 16 px)
 *   --timeline-row-height:     3.5rem  → 56 px
 *   --timeline-room-col-width: 8.75rem → 140 px
 *
 * They are consumed by @tanstack/react-virtual, which requires numeric
 * row sizes. The CSS properties remain the single source of truth for
 * visual sizing; these constants exist only to bridge the gap between
 * CSS and JS virtualization math.
 */

const BASE_FONT_PX = 16

export const TIMELINE_CELL_WIDTH_PX = 7.5 * BASE_FONT_PX     // 120
export const TIMELINE_ROW_HEIGHT_PX  = 3.5 * BASE_FONT_PX   // 56
export const TIMELINE_ROOM_COL_PX   = 8.75 * BASE_FONT_PX   // 140

/** Number of days shown in a single window. */
export const TIMELINE_WINDOW_DAYS = 7

/** Rows rendered outside the visible viewport to reduce blank flicker. */
export const TIMELINE_OVERSCAN_ROWS = 5

/** Height of a single booking block when stacked (px). */
export const TIMELINE_BLOCK_HEIGHT_PX = 40

/** Vertical gap between stacked booking blocks (px). */
export const TIMELINE_BLOCK_GAP_PX = 4

/** Top/bottom padding inside the booking area (px). */
export const TIMELINE_BLOCK_PADDING_PX = 4

/**
 * Compute the row height for a room with the given number of booking layers.
 * Single-layer rooms use the standard row height; multi-layer rooms expand.
 */
export function computeRowHeight(layerCount: number): number {
  if (layerCount <= 1) return TIMELINE_ROW_HEIGHT_PX
  return (
    TIMELINE_BLOCK_PADDING_PX * 2 +
    layerCount * TIMELINE_BLOCK_HEIGHT_PX +
    (layerCount - 1) * TIMELINE_BLOCK_GAP_PX
  )
}
