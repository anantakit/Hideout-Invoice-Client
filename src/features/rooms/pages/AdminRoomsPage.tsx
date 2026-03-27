import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { roomsApi } from '../api'
import type { RoomType, Room } from '../types'
import RoomTypeModal from '../components/RoomTypeModal'
import RoomModal from '../components/RoomModal'
import { Fab } from '@/shared/ui/Fab'
import { RoomTypeSection } from '../components/RoomTypeSection'
import { RoomTableSection } from '../components/RoomTableSection'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminRoomsPage() {
  const queryClient = useQueryClient()

  // ── Room Type state ──
  const [rtModalOpen, setRtModalOpen] = useState(false)
  const [editingRt, setEditingRt] = useState<RoomType | undefined>()

  // ── Room state ──
  const [roomModalOpen, setRoomModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | undefined>()
  const [filterTypeId, setFilterTypeId] = useState<string>('all')

  // ── Queries ──
  const { data: roomTypes = [], isLoading: rtLoading } = useQuery({
    queryKey: ['admin-room-types'],
    queryFn: roomsApi.listRoomTypes,
  })

  const { data: rooms = [], isLoading: roomsLoading, isFetching } = useQuery({
    queryKey: ['admin-rooms', filterTypeId],
    queryFn: () => roomsApi.listRooms(filterTypeId === 'all' ? undefined : filterTypeId),
  })

  // ── Room Type mutations ──
  const createRtMutation = useMutation({
    mutationFn: roomsApi.createRoomType,
    onSuccess: () => {
      toast.success('เพิ่มประเภทห้องสำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-room-types'] })
      closeRtModal()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateRtMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name: string; price_per_night: number } }) =>
      roomsApi.updateRoomType(id, payload),
    onSuccess: () => {
      toast.success('แก้ไขประเภทห้องสำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-room-types'] })
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
      closeRtModal()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteRtMutation = useMutation({
    mutationFn: roomsApi.deleteRoomType,
    onSuccess: () => {
      toast.success('ลบประเภทห้องสำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-room-types'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // ── Room mutations ──
  const createRoomMutation = useMutation({
    mutationFn: roomsApi.createRoom,
    onSuccess: () => {
      toast.success('เพิ่มห้องสำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
      closeRoomModal()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateRoomMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { number: string; room_type_id: string } }) =>
      roomsApi.updateRoom(id, payload),
    onSuccess: () => {
      toast.success('แก้ไขห้องสำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
      closeRoomModal()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteRoomMutation = useMutation({
    mutationFn: roomsApi.deleteRoom,
    onSuccess: () => {
      toast.success('ลบห้องสำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // ── Handlers ──
  const closeRtModal = () => { setRtModalOpen(false); setEditingRt(undefined) }
  const closeRoomModal = () => { setRoomModalOpen(false); setEditingRoom(undefined) }

  const handleRtSubmit = (values: { name: string; price_per_night: number }) => {
    if (editingRt) {
      updateRtMutation.mutate({ id: editingRt.id, payload: values })
    } else {
      createRtMutation.mutate(values)
    }
  }

  const handleRoomSubmit = (values: { number: string; room_type_id: string }) => {
    if (editingRoom) {
      updateRoomMutation.mutate({ id: editingRoom.id, payload: values })
    } else {
      createRoomMutation.mutate(values)
    }
  }

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-24 md:pb-6 space-y-8">
        <RoomTypeSection
          roomTypes={roomTypes}
          isLoading={rtLoading}
          onAdd={() => { setEditingRt(undefined); setRtModalOpen(true) }}
          onEdit={(rt) => { setEditingRt(rt); setRtModalOpen(true) }}
          onDelete={(id) => deleteRtMutation.mutate(id)}
          isDeleting={deleteRtMutation.isPending}
        />

        <RoomTableSection
          rooms={rooms}
          roomTypes={roomTypes}
          isLoading={rtLoading || roomsLoading}
          isFetching={isFetching}
          filterTypeId={filterTypeId}
          onFilterChange={setFilterTypeId}
          onAdd={() => { setEditingRoom(undefined); setRoomModalOpen(true) }}
          onEdit={(room) => { setEditingRoom(room); setRoomModalOpen(true) }}
          onDelete={(id) => deleteRoomMutation.mutate(id)}
          isDeleting={deleteRoomMutation.isPending}
        />
      </div>

      <Fab
        onClick={() => { setEditingRoom(undefined); setRoomModalOpen(true) }}
        disabled={roomTypes.length === 0}
        label="เพิ่มห้อง"
      />

      {/* Modals */}
      <RoomTypeModal
        open={rtModalOpen}
        onClose={closeRtModal}
        roomType={editingRt}
        onSubmit={handleRtSubmit}
        isLoading={createRtMutation.isPending || updateRtMutation.isPending}
      />

      <RoomModal
        open={roomModalOpen}
        onClose={closeRoomModal}
        room={editingRoom}
        roomTypes={roomTypes}
        onSubmit={handleRoomSubmit}
        isLoading={createRoomMutation.isPending || updateRoomMutation.isPending}
      />
    </>
  )
}
