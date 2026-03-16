import { useCallback, useSyncExternalStore } from 'react'

// ─── Tiny external store for hovered booking ID ───────────────────────────────
// Using an external store (useSyncExternalStore) instead of useState means
// only the BookingBlock components that read the value will re-render —
// parent RoomRow components are completely unaffected by hover changes.

type Listener = () => void

let _hoveredId: string | null = null
const _listeners = new Set<Listener>()

function subscribe(listener: Listener) {
  _listeners.add(listener)
  return () => { _listeners.delete(listener) }
}

function getSnapshot() {
  return _hoveredId
}

function setHoveredBookingId(id: string | null) {
  if (_hoveredId === id) return
  _hoveredId = id
  _listeners.forEach((l) => l())
}

// ─── React hook to read hovered booking ID ────────────────────────────────────

export function useHoveredBookingId(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

// ─── Stable callbacks (no re-render on call) ──────────────────────────────────

export function useBookingHoverHandlers() {
  const onHoverStart = useCallback((id: string) => setHoveredBookingId(id), [])
  const onHoverEnd = useCallback(() => setHoveredBookingId(null), [])
  return { onHoverStart, onHoverEnd } as const
}
