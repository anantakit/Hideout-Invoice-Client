/**
 * useAvailability
 *
 * Fetches availability for a room type over a date range with:
 *   • 300 ms debounce  — avoids a request on every keystroke / calendar hover
 *   • AbortController  — cancels the in-flight HTTP request when params change
 *   • Stale-response guard — ignores responses that arrive after cleanup
 *
 * Returns a derived, component-ready status instead of the raw API shape.
 */

import { useState, useEffect } from 'react'
import axios from 'axios'
import { apiClient } from '@/shared/api/client'
import type { AvailabilityResponse } from '@/features/bookings/types'
import type { ApiResponse } from '@/shared/types/api'

// ─── Public API ───────────────────────────────────────────────────────────────

export type AvailabilityStatus = 'idle' | 'available' | 'limited' | 'full'

export interface UseAvailabilityParams {
  roomTypeId: string
  checkIn:    string  // YYYY-MM-DD
  checkOut:   string  // YYYY-MM-DD
}

export interface UseAvailabilityResult {
  /** Derived status.
   *  - 'idle'      → params incomplete, no request made
   *  - 'available' → rooms open
   *  - 'limited'   → ≤ LIMITED_THRESHOLD rooms left
   *  - 'full'      → no rooms available
   */
  status:    AvailabilityStatus
  /** Number of rooms currently available (0 when status is idle or full). */
  remaining: number
  loading:   boolean
}

// ─── Internal constants ───────────────────────────────────────────────────────

const DEBOUNCE_MS = 300

/**
 * Rooms at or below this count are considered "limited".
 * Matches the existing threshold used in the StayCard availability badge.
 */
const LIMITED_THRESHOLD = 2

// ─── Status derivation ────────────────────────────────────────────────────────

function deriveStatus(available: number): AvailabilityStatus {
  if (available === 0) return 'full'
  if (available <= LIMITED_THRESHOLD) return 'limited'
  return 'available'
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAvailability({
  roomTypeId,
  checkIn,
  checkOut,
}: UseAvailabilityParams): UseAvailabilityResult {
  const [status,    setStatus]    = useState<AvailabilityStatus>('idle')
  const [remaining, setRemaining] = useState(0)
  const [loading,   setLoading]   = useState(false)

  useEffect(() => {
    // ── Guard: missing params → reset to idle immediately, no request ──────
    if (!roomTypeId || !checkIn || !checkOut) {
      setStatus('idle')
      setRemaining(0)
      setLoading(false)
      return
    }

    // `cancelled` prevents state mutation after this effect's cleanup runs.
    // This covers two scenarios:
    //   1. Params changed before the 300 ms debounce fired   (timer still pending)
    //   2. Params changed after the request was sent          (response in-flight)
    let cancelled = false
    let controller: AbortController | null = null

    setLoading(true)

    const timer = setTimeout(async () => {
      if (cancelled) return

      controller = new AbortController()

      try {
        const { data } = await apiClient.get<ApiResponse<AvailabilityResponse>>(
          '/availability',
          {
            params: {
              room_type_id: roomTypeId,
              check_in:     checkIn,
              check_out:    checkOut,
            },
            signal: controller.signal,
          },
        )

        // Guard again: effect may have been cleaned up while we were awaiting.
        if (cancelled) return

        const { available } = data.data
        setRemaining(available)
        setStatus(deriveStatus(available))
      } catch (err) {
        // Aborted requests are intentional — ignore them silently.
        if (cancelled || axios.isCancel(err)) return
        // Network / server errors: fall back to idle so the UI doesn't block.
        setStatus('idle')
        setRemaining(0)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, DEBOUNCE_MS)

    // ── Cleanup: runs when params change OR component unmounts ─────────────
    return () => {
      cancelled = true
      clearTimeout(timer)
      controller?.abort()
    }
  }, [roomTypeId, checkIn, checkOut])

  return { status, remaining, loading }
}
