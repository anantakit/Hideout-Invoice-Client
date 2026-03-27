import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { customersApi } from '../api'
import { useDeleteCustomer } from '../hooks/useDeleteCustomer'
import { useCreateCustomer, useUpdateCustomer } from '@/shared/hooks/useCustomerMutations'
import CustomerModal from '../components/CustomerModal'
import type { CustomerFormValues } from '../components/CustomerModal'
import { useDataTable } from '@/shared/hooks/useDataTable'
import { DataTableShell } from '@/shared/components/DataTableShell'
import type { Customer } from '../types'
import { formatThaiDate, formatPhone } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
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

export default function Customers() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  const table = useDataTable<Customer>({
    queryKey: 'customers',
    queryFn: customersApi.list,
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

  const handleSaved = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['customers'] })
    handleClose()
  }, [queryClient])

  const { mutate: createCustomer, isPending: isCreating } = useCreateCustomer(handleSaved)
  const { mutate: updateCustomer, isPending: isUpdating } = useUpdateCustomer(handleSaved)
  const isSaving = isCreating || isUpdating

  const handleSave = useCallback((values: CustomerFormValues) => {
    if (editingCustomer) updateCustomer({ id: editingCustomer.id, payload: values })
    else createCustomer(values)
  }, [editingCustomer, createCustomer, updateCustomer])

  return (
    <>
      <DataTableShell
        title="รายการลูกค้า"
        subtitle={table.isLoading ? null : `ลูกค้าทั้งหมด ${table.total} ราย`}
        searchPlaceholder="ค้นหาชื่อ เบอร์โทร หรือเลขผู้เสียภาษี…"
        searchInput={table.searchInput}
        onSearchChange={table.setSearchInput}
        addAction={{ label: 'เพิ่มลูกค้าใหม่', onClick: () => { setEditingCustomer(null); setModalOpen(true) } }}
        isLoading={table.isLoading}
        isFetching={table.isFetching}
        isEmpty={table.isEmpty}
        emptyMessage="ยังไม่มีลูกค้า"
        emptySearchMessage="ไม่พบลูกค้าที่ตรงกับการค้นหา"
        emptyAction={
          <Button variant="outline" size="sm" onClick={() => { setEditingCustomer(null); setModalOpen(true) }}>
            <Plus className="w-4 h-4 mr-1.5" />เพิ่มลูกค้าใหม่
          </Button>
        }
        pagination={table.paginationProps}
      >
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
            {table.items.map((customer) => (
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
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleEdit(customer)} aria-label="แก้ไข">
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
      </DataTableShell>

      <CustomerModal
        open={modalOpen}
        onClose={handleClose}
        onSave={handleSave}
        isPending={isSaving}
        customer={editingCustomer ?? undefined}
      />
    </>
  )
}
