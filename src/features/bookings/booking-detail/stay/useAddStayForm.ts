import { useState, useMemo, useReducer, useCallback } from 'react'
import { useQueries } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { todayISO, addDaysISO } from '@/shared/utils'
import { useRoomTypes, useAddStays, AVAILABILITY_GROUPED_KEY } from '../../hooks'
import { bookingsApi } from '../../api'
import type { AvailabilityGroupedResponse } from '../../types'
import {
  calculateStayTotalPrice,
  isRoomTakenByOtherRow as isRoomTakenPure,
  deduplicateDatePairs,
  buildStayPayloads,
} from '../../domain/stayManagement'

// ── Types & Reducer ─────────────────────────────────────────────────────────

export interface StayDraft {
  key: string
  checkIn: string
  checkOut: string
  roomTypeId: string
  roomId: string | null
  chargedPrice?: number
}

export type Action =
  | { type: 'ADD_ROW'; checkIn: string; checkOut: string }
  | { type: 'REMOVE_ROW'; key: string }
  | { type: 'UPDATE_DATES'; key: string; checkIn: string; checkOut: string }
  | { type: 'UPDATE_ROOM_TYPE'; key: string; roomTypeId: string }
  | { type: 'UPDATE_ROOM'; key: string; roomId: string | null }
  | { type: 'UPDATE_CHARGED_PRICE'; key: string; chargedPrice?: number }
  | { type: 'RESET' }

function makeRow(checkIn: string, checkOut: string): StayDraft {
  return { key: crypto.randomUUID(), checkIn, checkOut, roomTypeId: '', roomId: null }
}

function reducer(state: StayDraft[], action: Action): StayDraft[] {
  switch (action.type) {
    case 'ADD_ROW': {
      return [...state, makeRow(action.checkIn, action.checkOut)]
    }
    case 'REMOVE_ROW':
      return state.length <= 1 ? state : state.filter((d) => d.key !== action.key)
    case 'UPDATE_DATES':
      return state.map((d) =>
        d.key === action.key
          ? { ...d, checkIn: action.checkIn, checkOut: action.checkOut, roomId: null }
          : d,
      )
    case 'UPDATE_ROOM_TYPE':
      return state.map((d) =>
        d.key === action.key ? { ...d, roomTypeId: action.roomTypeId, roomId: null } : d,
      )
    case 'UPDATE_ROOM':
      return state.map((d) =>
        d.key === action.key ? { ...d, roomId: action.roomId } : d,
      )
    case 'UPDATE_CHARGED_PRICE':
      return state.map((d) =>
        d.key === action.key ? { ...d, chargedPrice: action.chargedPrice } : d,
      )
    case 'RESET':
      return [makeRow(todayISO(), addDaysISO(1))]
    default:
      return state
  }
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useAddStayForm(bookingId: string) {
  const [open, setOpen] = useState(false)
  const [drafts, dispatch] = useReducer(reducer, null, () => [
    makeRow(todayISO(), addDaysISO(1)),
  ])

  const { data: roomTypes } = useRoomTypes()
  const addStays = useAddStays(bookingId)

  // ── Multi-availability queries (deduplicated by date pair) ───────────
  const uniqueDatePairs = useMemo(() => deduplicateDatePairs(drafts), [drafts])

  const availQueries = useQueries({
    queries: open
      ? uniqueDatePairs.map(({ checkIn, checkOut }) => ({
          queryKey: AVAILABILITY_GROUPED_KEY(checkIn, checkOut),
          queryFn: () => bookingsApi.getAvailabilityGrouped(checkIn, checkOut),
          staleTime: 30_000,
        }))
      : [],
  })

  const availMap = useMemo(() => {
    const map = new Map<string, { data?: AvailabilityGroupedResponse; isLoading: boolean }>()
    uniqueDatePairs.forEach((pair, i) => {
      const key = `${pair.checkIn}|${pair.checkOut}`
      map.set(key, { data: availQueries[i]?.data, isLoading: availQueries[i]?.isLoading ?? false })
    })
    return map
  }, [uniqueDatePairs, availQueries])

  // ── Rooms already selected in other rows with overlapping dates ─────
  const isRoomTakenByOtherRow = useCallback(
    (currentKey: string, roomId: string, checkIn: string, checkOut: string) =>
      isRoomTakenPure(currentKey, roomId, checkIn, checkOut, drafts),
    [drafts],
  )

  // ── Price computation ───────────────────────────────────────────────
  const totalPrice = useMemo(
    () => calculateStayTotalPrice(drafts, roomTypes ?? []),
    [drafts, roomTypes],
  )

  const canSubmit =
    drafts.length > 0 &&
    drafts.every((d) => d.checkIn && d.checkOut && d.checkOut > d.checkIn && d.roomTypeId) &&
    !addStays.isPending

  // ── Handlers ────────────────────────────────────────────────────────
  function handleAddRow() {
    const last = drafts[drafts.length - 1]
    dispatch({ type: 'ADD_ROW', checkIn: last.checkIn, checkOut: last.checkOut })
  }

  function handleSubmit() {
    if (!canSubmit) return
    addStays.mutate(
      { stays: buildStayPayloads(drafts) },
      {
        onSuccess: () => {
          toast.success(
            drafts.length === 1
              ? 'เพิ่มห้องพักสำเร็จ'
              : `เพิ่มห้องพัก ${drafts.length} รายการสำเร็จ`,
          )
          dispatch({ type: 'RESET' })
          setOpen(false)
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
          const msg = err?.response?.data?.message || err.message || 'เกิดข้อผิดพลาด'
          toast.error(msg)
        },
      },
    )
  }

  function handleClose() {
    setOpen(false)
    dispatch({ type: 'RESET' })
  }

  return {
    open,
    setOpen,
    drafts,
    dispatch,
    roomTypes: roomTypes ?? [],
    availMap,
    isRoomTakenByOtherRow,
    totalPrice,
    canSubmit,
    isPending: addStays.isPending,
    handleAddRow,
    handleSubmit,
    handleClose,
  }
}
