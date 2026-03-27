import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Search, Eye, Download, Trash2 } from 'lucide-react'
import { receiptsApi, type ReceiptQueryParams } from '../api'
import type { Receipt } from '../types'
import { formatTHB, formatThaiDate } from '../../../shared/utils'
import { usePaginatedQuery } from '../../../shared/hooks/usePaginatedQuery'
import Pagination from '../../../shared/ui/Pagination'
import { Card } from '../../../shared/ui/card'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
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
import { DateRangeFilter } from '@/shared/components/DateRangeFilter'
import { Fab } from '../../../shared/ui/Fab'
import { Skeleton } from '../../../shared/ui/skeleton'

async function downloadReceipt(receipt: Receipt) {
  try {
    await receiptsApi.download(receipt)
  } catch {
    toast.error('ดาวน์โหลด PDF ไม่สำเร็จ')
  }
}

/** Download button with loading spinner. */
function DownloadButton({
  receipt,
  downloadingId,
  onDownload,
}: {
  receipt: Receipt
  downloadingId: string | null
  onDownload: (receipt: Receipt) => void
}) {
  const isLoading = downloadingId === receipt.id
  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-8 h-8"
      onClick={() => onDownload(receipt)}
      disabled={isLoading}
      title="ดาวน์โหลด PDF"
    >
      {isLoading ? (
        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
    </Button>
  )
}

/** Confirm-delete dialog for a receipt. */
function DeleteReceiptDialog({
  invoiceNumber,
  onConfirm,
  isPending,
}: {
  invoiceNumber: string
  onConfirm: () => void
  isPending?: boolean
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-150"
          aria-label="ลบ"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ลบใบเสร็จ?</AlertDialogTitle>
          <AlertDialogDescription>
            ลบใบเสร็จ {invoiceNumber}? การกระทำนี้ไม่สามารถย้อนกลับได้
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={onConfirm}>{isPending ? 'กำลังลบ…' : 'ลบ'}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default function ReceiptHistory() {
  const queryClient = useQueryClient()

  const { page, limit, searchInput, params: paginationParams, setPage, setLimit, setSearchInput } =
    usePaginatedQuery({ defaultLimit: 20 })

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleDownload = async (receipt: Receipt) => {
    setDownloadingId(receipt.id)
    await downloadReceipt(receipt)
    setDownloadingId(null)
  }

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
    setPage(1)
  }

  const params: ReceiptQueryParams = {
    ...paginationParams,
    ...(startDate && { start_date: startDate }),
    ...(endDate && { end_date: endDate }),
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['receipts', params],
    queryFn: () => receiptsApi.list(params),
    placeholderData: (prev) => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: receiptsApi.delete,
    onSuccess: () => {
      toast.success('ลบใบเสร็จสำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const meta = data?.meta
  const totalPages = meta?.total_pages ?? 1
  const total = meta?.total ?? 0
  const hasFilters = !!(searchInput || startDate || endDate)

  return (
    <>
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-24 md:pb-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h1 text-xl sm:text-2xl">รายการใบเสร็จ</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data ? `ใบเสร็จทั้งหมด ${total} รายการ` : 'กำลังโหลด…'}
          </p>
        </div>
        <Button asChild className="hidden md:inline-flex">
          <Link to="/receipts/new">
            <Plus className="w-4 h-4" />
            สร้างใบเสร็จ
          </Link>
        </Button>
      </div>

      {/* Filter card */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-4 mb-6">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อลูกค้า, เลขห้อง หรือเลขที่ใบเสร็จ"
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* Date range picker */}
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onRangeChange={handleDateRangeChange}
        />

        {/* Clear all filters link */}
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setSearchInput('')
              setStartDate('')
              setEndDate('')
              setPage(1)
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Content */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32 hidden sm:block" />
                <Skeleton className="h-4 w-28 hidden md:block" />
                <Skeleton className="h-4 w-20 ml-auto" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            ))}
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <p className="text-sm">
              {hasFilters ? 'ไม่พบใบเสร็จที่ตรงกับเงื่อนไข' : 'ยังไม่มีใบเสร็จ'}
            </p>
            {!hasFilters && (
              <Button asChild variant="outline" size="sm">
                <Link to="/receipts/new"><Plus className="w-4 h-4 mr-1.5" />สร้างใบเสร็จใหม่</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className={`transition-opacity duration-150 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>

            {/* Desktop table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่ใบเสร็จ</TableHead>
                    <TableHead>ลูกค้า</TableHead>
                    <TableHead className="hidden md:table-cell">วันที่ออกเอกสาร</TableHead>
                    <TableHead className="hidden lg:table-cell">การจอง</TableHead>
                    <TableHead className="text-right">ยอดรวม</TableHead>
                    <TableHead className="text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((receipt) => (
                    <TableRow key={receipt.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <Link to={`/receipts/${receipt.id}`} className="font-semibold text-primary hover:text-primary/80">
                          {receipt.invoice_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-foreground/80">{receipt.customer?.name ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">
                        {formatThaiDate(receipt.issue_date)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {receipt.booking_id ? (
                          <Link
                            to={`/bookings/${receipt.booking_id}`}
                            className="text-xs font-medium text-primary hover:text-primary/80"
                          >
                            #{receipt.booking_id.slice(0, 8).toUpperCase()}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        {formatTHB(receipt.total)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="w-8 h-8" asChild aria-label="ดูรายละเอียด">
                            <Link to={`/receipts/${receipt.id}`}><Eye className="w-4 h-4" /></Link>
                          </Button>
                          <DownloadButton
                            receipt={receipt}
                            downloadingId={downloadingId}
                            onDownload={handleDownload}
                          />
                          <DeleteReceiptDialog
                            invoiceNumber={receipt.invoice_number}
                            onConfirm={() => deleteMutation.mutate(receipt.id)}
                            isPending={deleteMutation.isPending}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-border/50">
              {data.data.map((receipt) => (
                <div key={receipt.id} className="px-4 py-4 flex items-center justify-between gap-3">
                  <Link to={`/receipts/${receipt.id}`} className="flex-1 min-w-0">
                    <p className="font-semibold text-primary text-sm truncate">{receipt.invoice_number}</p>
                    <p className="text-sm text-foreground/80 truncate break-all mt-0.5">{receipt.customer?.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatThaiDate(receipt.issue_date)}</p>
                  </Link>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="font-bold text-foreground text-sm">{formatTHB(receipt.total)}</span>
                    <div className="flex gap-1">
                      <DownloadButton
                        receipt={receipt}
                        downloadingId={downloadingId}
                        onDownload={handleDownload}
                      />
                      <DeleteReceiptDialog
                        invoiceNumber={receipt.invoice_number}
                        onConfirm={() => deleteMutation.mutate(receipt.id)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

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

    <Fab to="/receipts/new" label="สร้างใบเสร็จ" />
    </>
  )
}
