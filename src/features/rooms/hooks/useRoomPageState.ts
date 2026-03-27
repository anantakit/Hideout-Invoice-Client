import { useReducer } from 'react'
import type { RoomType, Room } from '../types'

// ── State ────────────────────────────────────────────────────────────────────

interface RoomPageState {
  rtModalOpen: boolean
  editingRt: RoomType | undefined
  roomModalOpen: boolean
  editingRoom: Room | undefined
  filterTypeId: string
}

const initialState: RoomPageState = {
  rtModalOpen: false,
  editingRt: undefined,
  roomModalOpen: false,
  editingRoom: undefined,
  filterTypeId: 'all',
}

// ── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'OPEN_RT_MODAL'; roomType?: RoomType }
  | { type: 'CLOSE_RT_MODAL' }
  | { type: 'OPEN_ROOM_MODAL'; room?: Room }
  | { type: 'CLOSE_ROOM_MODAL' }
  | { type: 'SET_FILTER_TYPE_ID'; value: string }

function reducer(state: RoomPageState, action: Action): RoomPageState {
  switch (action.type) {
    case 'OPEN_RT_MODAL':
      return { ...state, rtModalOpen: true, editingRt: action.roomType }
    case 'CLOSE_RT_MODAL':
      return { ...state, rtModalOpen: false, editingRt: undefined }
    case 'OPEN_ROOM_MODAL':
      return { ...state, roomModalOpen: true, editingRoom: action.room }
    case 'CLOSE_ROOM_MODAL':
      return { ...state, roomModalOpen: false, editingRoom: undefined }
    case 'SET_FILTER_TYPE_ID':
      return { ...state, filterTypeId: action.value }
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useRoomPageState() {
  const [state, dispatch] = useReducer(reducer, initialState)

  return {
    ...state,
    openRtModal: (roomType?: RoomType) => dispatch({ type: 'OPEN_RT_MODAL', roomType }),
    closeRtModal: () => dispatch({ type: 'CLOSE_RT_MODAL' }),
    openRoomModal: (room?: Room) => dispatch({ type: 'OPEN_ROOM_MODAL', room }),
    closeRoomModal: () => dispatch({ type: 'CLOSE_ROOM_MODAL' }),
    setFilterTypeId: (value: string) => dispatch({ type: 'SET_FILTER_TYPE_ID', value }),
  }
}
