import { Pencil, Trash2, Plus } from 'lucide-react'
import { Skeleton } from '@/shared/ui/skeleton'
import { formatTHB } from '@/shared/utils'
import type { RoomType, Room } from '../types'
import { Card } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'
import { RoomStatusSelect } from './RoomStatusSelect'

interface RoomTableSectionProps {
  rooms: Room[]
  roomTypes: RoomType[]
  isLoading: boolean
  isFetching: boolean
  filterTypeId: string
  onFilterChange: (typeId: string) => void
  onAdd: () => void
  onEdit: (room: Room) => void
  onDelete: (id: string) => void
  isDeleting: boolean
}

export function RoomTableSection({
  rooms,
  roomTypes,
  isLoading,
  isFetching,
  filterTypeId,
  onFilterChange,
  onAdd,
  onEdit,
  onDelete,
  isDeleting,
}: RoomTableSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 className="text-section text-base">ห้องพัก</h2>
        <div className="flex items-center gap-2">
          <Select value={filterTypeId} onValueChange={onFilterChange}>
            <SelectTrigger className="h-9 w-40 text-sm">
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
            onClick={onAdd}
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
                          onClick={() => onEdit(room)}
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
                              <AlertDialogAction disabled={isDeleting} onClick={() => onDelete(room.id)}>
                                {isDeleting ? 'กำลังลบ…' : 'ลบ'}
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
  )
}
