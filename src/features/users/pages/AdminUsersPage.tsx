import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { adminApi } from '../api'
import { useAuth } from '../../../app/providers/AuthProvider'
import UserModal from '../components/UserModal'
import Pagination from '../../../shared/ui/Pagination'
import type { User } from '../../../shared/types/auth'
import { formatThaiDate } from '../../../shared/utils'
import { usePaginatedQuery } from '../../../shared/hooks/usePaginatedQuery'
import { Card } from '../../../shared/ui/card'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { BottomBar } from '../../../shared/ui/BottomBar'
import { Skeleton } from '../../../shared/ui/skeleton'
import { Badge } from '../../../shared/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../shared/ui/table'
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
} from '../../../shared/ui/alert-dialog'

type BadgeVariant = 'blue' | 'green' | 'gray'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  staff: 'Staff',
  viewer: 'Viewer',
}

const ROLE_BADGE_VARIANTS: Record<string, BadgeVariant> = {
  admin: 'blue',
  staff: 'green',
  viewer: 'gray',
}

export default function AdminUsers() {
  const { user: me } = useAuth()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | undefined>()

  const { page, limit, searchInput, params, setPage, setLimit, setSearchInput } = usePaginatedQuery()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => adminApi.listUsers(params),
    placeholderData: (prev) => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      toast.success('ลบผู้ใช้สำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditingUser(undefined)
  }

  const users = data?.data ?? []
  const total = data?.meta.total ?? 0
  const totalPages = data?.meta.total_pages ?? 1

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-28 md:pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-section text-2xl">จัดการผู้ใช้</h1>
            <p className="text-helper mt-1">
              {data ? `ผู้ใช้ทั้งหมด ${total} คน` : 'กำลังโหลด…'}
            </p>
          </div>
          <Button
            onClick={() => { setEditingUser(undefined); setModalOpen(true) }}
            className="hidden md:inline-flex"
          >
            <Plus className="w-4 h-4" />
            เพิ่มผู้ใช้
          </Button>
        </div>

        {/* Search */}
        <div className="bg-card radius-card border border-border p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาชื่อหรือ username…"
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-4 w-24 hidden md:block" />
                  <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">
                {searchInput ? 'ไม่พบผู้ใช้ที่ตรงกับการค้นหา' : 'ยังไม่มีผู้ใช้'}
              </p>
            </div>
          ) : (
            <div className={`transition-opacity duration-150 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ / Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">วันที่สร้าง</TableHead>
                    <TableHead className="text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() => handleEdit(u)}
                            title="แก้ไข"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 radius-button text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-150"
                                disabled={u.id === me?.id}
                                title="ลบ"
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
                                  onClick={() => {
                                    if (u.id === me?.id) {
                                      toast.error('ไม่สามารถลบบัญชีของตนเองได้')
                                      return
                                    }
                                    deleteMutation.mutate(u.id)
                                  }}
                                >
                                  ลบ
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

              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            </div>
          )}
        </Card>
      </div>

      <BottomBar>
        <Button
          onClick={() => { setEditingUser(undefined); setModalOpen(true) }}
          className="w-full min-h-[48px] radius-card font-medium transition-transform duration-150 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          เพิ่มผู้ใช้
        </Button>
      </BottomBar>

      <UserModal open={modalOpen} onClose={handleClose} user={editingUser} />
    </>
  )
}
