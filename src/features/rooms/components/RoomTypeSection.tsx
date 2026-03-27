import { Pencil, Trash2, Plus } from 'lucide-react'
import { Skeleton } from '@/shared/ui/skeleton'
import { formatTHB } from '@/shared/utils'
import type { RoomType } from '../types'
import { Card } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'

interface RoomTypeSectionProps {
  roomTypes: RoomType[]
  isLoading: boolean
  onAdd: () => void
  onEdit: (rt: RoomType) => void
  onDelete: (id: string) => void
  isDeleting: boolean
}

export function RoomTypeSection({
  roomTypes,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
  isDeleting,
}: RoomTypeSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-section text-2xl">จัดการห้องพัก</h1>
          <p className="text-helper mt-1">ประเภทห้องและห้องพักทั้งหมด</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-section text-base">ประเภทห้อง</h2>
        <Button size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4" />
          เพิ่มประเภท
        </Button>
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
                        onClick={() => onEdit(rt)}
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
                            <AlertDialogAction disabled={isDeleting} onClick={() => onDelete(rt.id)}>
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
        )}
      </Card>
    </section>
  )
}
