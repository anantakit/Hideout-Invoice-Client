import { useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Trash2 } from 'lucide-react'
import { adminApi } from '../api'
import { useDeleteUser } from '../hooks/useDeleteUser'
import { useAuth } from '@/app/providers/AuthProvider'
import UserModal from '../components/UserModal'
import { useDataTable } from '@/shared/hooks/useDataTable'
import { DataTableShell } from '@/shared/components/DataTableShell'
import type { User } from '@/shared/types/auth'
import { formatThaiDate } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
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

type BadgeVariant = 'blue' | 'green' | 'gray'

const ROLE_LABELS: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ',
  staff: 'พนักงาน',
  viewer: 'ผู้ชม',
}

const ROLE_BADGE_VARIANTS: Record<string, BadgeVariant> = {
  admin: 'blue',
  staff: 'green',
  viewer: 'gray',
}

export default function AdminUsers() {
  const { user: me } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | undefined>()

  const table = useDataTable<User>({
    queryKey: 'admin-users',
    queryFn: adminApi.listUsers,
  })

  const deleteMutation = useDeleteUser()

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditingUser(undefined)
  }

  return (
    <>
      <DataTableShell
        title="จัดการผู้ใช้"
        subtitle={table.isLoading ? null : `ผู้ใช้ทั้งหมด ${table.total} คน`}
        searchPlaceholder="ค้นหาชื่อหรือ username…"
        searchInput={table.searchInput}
        onSearchChange={table.setSearchInput}
        addAction={{ label: 'เพิ่มผู้ใช้', onClick: () => { setEditingUser(undefined); setModalOpen(true) } }}
        isLoading={table.isLoading}
        isFetching={table.isFetching}
        isEmpty={table.isEmpty}
        emptyMessage="ยังไม่มีผู้ใช้"
        emptySearchMessage="ไม่พบผู้ใช้ที่ตรงกับการค้นหา"
        pagination={table.paginationProps}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อ / ชื่อผู้ใช้</TableHead>
              <TableHead>บทบาท</TableHead>
              <TableHead className="hidden md:table-cell">วันที่สร้าง</TableHead>
              <TableHead className="text-center">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.items.map((u) => (
              <TableRow key={u.id} className="hover:bg-muted/50 transition-colors">
                <TableCell>
                  <p className="font-medium text-foreground">{u.full_name}</p>
                  <p className="text-helper mt-0.5">@{u.username}</p>
                  {u.must_change_password && (
                    <span className="text-xs text-warning">ต้องเปลี่ยนรหัสผ่าน</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={ROLE_BADGE_VARIANTS[u.role] ?? 'blue'}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">
                  {formatThaiDate(u.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleEdit(u)} aria-label="แก้ไข">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 radius-button text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-150"
                          disabled={u.id === me?.id}
                          aria-label="ลบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>ลบผู้ใช้?</AlertDialogTitle>
                          <AlertDialogDescription>
                            ลบผู้ใช้ "{u.full_name}" ({u.username})?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (u.id === me?.id) {
                                toast.error('ไม่สามารถลบบัญชีของตนเองได้')
                                return
                              }
                              deleteMutation.mutate(u.id)
                            }}
                          >
                            {deleteMutation.isPending ? 'กำลังลบ…' : 'ลบ'}
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
      </DataTableShell>

      <UserModal open={modalOpen} onClose={handleClose} user={editingUser} />
    </>
  )
}
