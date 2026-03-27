import { useQuery } from '@tanstack/react-query'
import { roomsApi } from '../api'
import RoomTypeModal from '../components/RoomTypeModal'
import RoomModal from '../components/RoomModal'
import { Fab } from '@/shared/ui/Fab'
import { RoomTypeSection } from '../components/RoomTypeSection'
import { RoomTableSection } from '../components/RoomTableSection'
import { useRoomPageState } from '../hooks/useRoomPageState'
import { useRoomTypeMutations } from '../hooks/useRoomTypeMutations'
import { useRoomMutations } from '../hooks/useRoomMutations'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminRoomsPage() {
  const {
    rtModalOpen, editingRt, roomModalOpen, editingRoom, filterTypeId,
    openRtModal, closeRtModal, openRoomModal, closeRoomModal, setFilterTypeId,
  } = useRoomPageState()

  // ── Queries ──
  const { data: roomTypes = [], isLoading: rtLoading } = useQuery({
    queryKey: ['admin-room-types'],
    queryFn: roomsApi.listRoomTypes,
  })

  const { data: rooms = [], isLoading: roomsLoading, isFetching } = useQuery({
    queryKey: ['admin-rooms', filterTypeId],
    queryFn: () => roomsApi.listRooms(filterTypeId === 'all' ? undefined : filterTypeId),
  })

  // ── Mutations ──
  const { createRtMutation, updateRtMutation, deleteRtMutation } =
    useRoomTypeMutations({ onSuccess: closeRtModal })

  const { createRoomMutation, updateRoomMutation, deleteRoomMutation } =
    useRoomMutations({ onSuccess: closeRoomModal })

  // ── Handlers ──
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
          onAdd={() => openRtModal()}
          onEdit={(rt) => openRtModal(rt)}
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
          onAdd={() => openRoomModal()}
          onEdit={(room) => openRoomModal(room)}
          onDelete={(id) => deleteRoomMutation.mutate(id)}
          isDeleting={deleteRoomMutation.isPending}
        />
      </div>

      <Fab
        onClick={() => openRoomModal()}
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
