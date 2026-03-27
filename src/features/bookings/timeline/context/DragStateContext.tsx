import { createContext, useContext } from 'react'
import type { DragState, DragPreviewPosition } from '../hooks/useTimelineDrag'
import type { DrawPreviewPosition } from '../hooks/useTimelineDraw'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DragStateContextValue {
  dragState: DragState | null
  previewPos: DragPreviewPosition | null
  isDragging: boolean
  drawPreview: DrawPreviewPosition | null
}

// ─── Context ──────────────────────────────────────────────────────────────────

const DragStateContext = createContext<DragStateContextValue | null>(null)

export const DragStateProvider = DragStateContext.Provider

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDragStateContext(): DragStateContextValue {
  const ctx = useContext(DragStateContext)
  if (!ctx) throw new Error('useDragStateContext must be used within DragStateProvider')
  return ctx
}
