import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Skeleton } from '@/shared/ui/skeleton'
import { roomsApi } from '../api'
import { formatTHB } from '@/shared/utils'
import type { RoomType, Room } from '../types'
// status labels used inline in RoomStatusSelect
import RoomTypeModal from '../components/RoomTypeModal'
import RoomModal from '../components/RoomModal'
import { Card } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Fab } from '@/shared/ui/Fab'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'

// ─── Room Status Select ──────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'พร้อม' },
  { value: 'CLEANING', label: 'ทำความสะอาด' },
  { value: 'MAINTENANCE', label: 'ปรับปรุง' },
]

function RoomStatusSelect({ room }: { room: Room }) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (status: string) =>
      roomsApi.updateRoomStatus(room.id, { status: status as 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE' }),
    onSuccess: () => {
      toast.success('เปลี่ยนสถานะสำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const currentStatus = room.status === 'ACTIVE' ? 'AVAILABLE' : room.status

  return (
    <Select
      value={currentStatus}
      onValueChange={(v) => mutation.mutate(v)}
      disabled={mutation.isPending}
    >
      <SelectTrigger className="h-10 w-[110px] md:h-8 md:w-[130px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent side="bottom" align="start" sideOffset={4}>
        {STATUS_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value} className="py-3 md:py-2">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

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

  const isLoading = rtLoading || roomsLoading

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-24 md:pb-6 space-y-8">
        {/* ═══════════════════════════════════════════════════════
            Section 1: Room Types
            ═══════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-section text-2xl">จัดการห้องพัก</h1>
              <p className="text-helper mt-1">ประเภทห้องและห้องพักทั้งหมด</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-section text-base">ประเภทห้อง</h2>
            <Button
              size="sm"
              onClick={() => { setEditingRt(undefined); setRtModalOpen(true) }}
            >
              <Plus className="w-4 h-4" />
              เพิ่มประเภท
            </Button>
          </div>

          <Card className="overflow-hidden">
            {rtLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                  </div>
                ))}
              </div>
            ) : roomTypes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">ยังไม่มีประเภทห้อง</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อประเภท</TableHead>
                    <TableHead className="text-right">ราคา/คืน</TableHead>
                    <TableHead className="text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roomTypes.map((rt) => (
                    <TableRow key={rt.id}>
                      <TableCell className="font-medium text-foreground">{rt.name}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatTHB(rt.price_per_night)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() => { setEditingRt(rt); setRtModalOpen(true) }}
                            aria-label="แก้ไข"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                aria-label="ลบ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>ลบประเภทห้อง?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ลบประเภท "{rt.name}"? จะลบได้ก็ต่อเมื่อไม่มีห้องอยู่ในประเภทนี้
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                <AlertDialogAction disabled={deleteRtMutation.isPending} onClick={() => deleteRtMutation.mutate(rt.id)}>
                                  {deleteRtMutation.isPending ? 'กำลังลบ…' : 'ลบ'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </section>

        {/* ═══════════════════════════════════════════════════════
            Section 2: Rooms
            ═══════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-3 gap-3">
            <h2 className="text-section text-base">ห้องพัก</h2>
            <div className="flex items-center gap-2">
              <Select value={filterTypeId} onValueChange={setFilterTypeId}>
                <SelectTrigger className="h-9 w-[160px] text-sm">
                  <SelectValue placeholder="ทุกประเภท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกประเภท</SelectItem>
                  {roomTypes.map((rt) => (
                    <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => { setEditingRoom(undefined); setRoomModalOpen(true) }}
                disabled={roomTypes.length === 0}
                className="hidden md:inline-flex"
              >
                <Plus className="w-4 h-4" />
                เพิ่มห้อง
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                  </div>
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">
                  {roomTypes.length === 0
                    ? 'กรุณาเพิ่มประเภทห้องก่อน'
                    : 'ยังไม่มีห้องพัก'}
                </p>
              </div>
            ) : (
              <div className={`transition-opacity duration-150 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>เลขห้อง</TableHead>
                      <TableHead>ประเภท</TableHead>
                      <TableHead className="hidden md:table-cell">ราคา/คืน</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="text-center">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-semibold tabular-nums text-foreground">
                          {room.number}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {room.room_type.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground tabular-nums hidden md:table-cell">
                          {formatTHB(room.room_type.price_per_night)}
                        </TableCell>
                        <TableCell>
                          <RoomStatusSelect room={room} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8"
                              onClick={() => { setEditingRoom(room); setRoomModalOpen(true) }}
                              aria-label="แก้ไข"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  aria-label="ลบ"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>ลบห้อง?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    ลบห้อง "{room.number}" ({room.room_type.name})?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                  <AlertDialogAction disabled={deleteRoomMutation.isPending} onClick={() => deleteRoomMutation.mutate(room.id)}>
                                    {deleteRoomMutation.isPending ? 'กำลังลบ…' : 'ลบ'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </section>
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
