import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { customersApi } from '../api'
import { useDeleteCustomer } from '../hooks/useDeleteCustomer'
import CustomerModal from '../components/CustomerModal'
import Pagination from '../../../shared/ui/Pagination'
import type { Customer } from '../types'
import { formatThaiDate, formatPhone } from '../../../shared/utils'
import { usePaginatedQuery } from '../../../shared/hooks/usePaginatedQuery'
import { Card } from '../../../shared/ui/card'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Fab } from '../../../shared/ui/Fab'
import { Skeleton } from '../../../shared/ui/skeleton'
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

export default function Customers() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  const { page, limit, searchInput, params, setPage, setLimit, setSearchInput } = usePaginatedQuery()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
    placeholderData: (prev) => prev,
  })

  const deleteMutation = useDeleteCustomer()

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditingCustomer(null)
  }

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['customers'] })
    handleClose()
  }

  const total = data?.meta.total ?? 0
  const totalPages = data?.meta.total_pages ?? 1

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-24 md:pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-section text-2xl">รายการลูกค้า</h1>
            <p className="text-helper mt-1">
              {data ? `ลูกค้าทั้งหมด ${total} ราย` : 'กำลังโหลด…'}
            </p>
          </div>
          <Button
            onClick={() => { setEditingCustomer(null); setModalOpen(true) }}
            className="hidden md:inline-flex"
          >
            <Plus className="w-4 h-4" />
            เพิ่มลูกค้าใหม่
          </Button>
        </div>

        {/* Search */}
        <div className="bg-card radius-card border border-border p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาชื่อ เบอร์โทร หรือเลขผู้เสียภาษี…"
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24 hidden sm:block" />
                  <Skeleton className="h-4 w-20 hidden md:block" />
                  <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                </div>
              ))}
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <p className="text-sm">
                {searchInput ? 'ไม่พบลูกค้าที่ตรงกับการค้นหา' : 'ยังไม่มีลูกค้า'}
              </p>
              {!searchInput && (
                <Button variant="outline" size="sm" onClick={() => { setEditingCustomer(null); setModalOpen(true) }}>
                  <Plus className="w-4 h-4 mr-1.5" />เพิ่มลูกค้าใหม่
                </Button>
              )}
            </div>
          ) : (
            <div className={`transition-opacity duration-150 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead className="hidden sm:table-cell">เบอร์โทรศัพท์</TableHead>
                    <TableHead className="hidden md:table-cell">เลขผู้เสียภาษี</TableHead>
                    <TableHead className="hidden lg:table-cell">วันที่เพิ่ม</TableHead>
                    <TableHead className="text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <p className="font-medium text-foreground">{customer.name}</p>
                        {customer.phone && <p className="text-helper mt-0.5 sm:hidden">{formatPhone(customer.phone)}</p>}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">{formatPhone(customer.phone) || '—'}</TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">{customer.tax_id || '—'}</TableCell>
                      <TableCell className="text-muted-foreground hidden lg:table-cell">{formatThaiDate(customer.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() => handleEdit(customer)}
                            aria-label="แก้ไข"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 radius-button text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-150"
                                aria-label="ลบ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>ลบลูกค้า?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ลบลูกค้า "{customer.name}"? ใบเสร็จที่เชื่อมกับลูกค้านี้จะไม่ถูกลบ
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                <AlertDialogAction disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(customer.id)}>
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

      <Fab
        onClick={() => { setEditingCustomer(null); setModalOpen(true) }}
        label="เพิ่มลูกค้าใหม่"
      />

      <CustomerModal
        open={modalOpen}
        onClose={handleClose}
        onCreated={handleSaved}
        customer={editingCustomer ?? undefined}
      />
    </>
  )
}
