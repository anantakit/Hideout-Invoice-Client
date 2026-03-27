import { createContext, useContext } from 'react'
import type { DrawerMode, CreateBookingPrefill } from '../components/OperationsDrawer'
import type { SelectedBookingContext } from '@/features/timeline/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DrawerContextValue {
  drawerMode: DrawerMode
  onCloseDrawer: () => void
  selectedBooking: SelectedBookingContext | null
  createBookingPrefill: CreateBookingPrefill | null
  onBookingCreated: (bookingId: string) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const DrawerContext = createContext<DrawerContextValue | null>(null)

export const DrawerProvider = DrawerContext.Provider

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDrawerContext(): DrawerContextValue {
  const ctx = useContext(DrawerContext)
  if (!ctx) throw new Error('useDrawerContext must be used within DrawerProvider')
  return ctx
}
