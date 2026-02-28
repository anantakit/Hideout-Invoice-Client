import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Search, Eye, Download, Trash2 } from 'lucide-react'
import { receiptsApi, type ReceiptQueryParams } from '../api'
import { formatTHB, formatThaiDate } from '../../../shared/utils'
import { usePaginatedQuery } from '../../../shared/hooks/usePaginatedQuery'
import Pagination from '../../../shared/ui/Pagination'
import { Card, CardContent } from '../../../shared/ui/card'
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

async function downloadReceipt(id: string, number: string) {
  try {
    await receiptsApi.download(id, `${number}.pdf`)
  } catch {
    toast.error('ดาวน์โหลดไม่สำเร็จ')
  }
}

export default function ReceiptHistory() {
  const queryClient = useQueryClient()

  const { page, limit, searchInput, params: paginationParams, setPage, setLimit, setSearchInput } =
    usePaginatedQuery({ defaultLimit: 20 })

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleDownload = async (id: string, number: string) => {
    setDownloadingId(id)
    await downloadReceipt(id, number)
    setDownloadingId(null)
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

  const handleFilterChange = (fn: () => void) => {
    fn()
    setPage(1)
  }

  const meta = data?.meta
  const totalPages = meta?.total_pages ?? 1
  const total = meta?.total ?? 0

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">รายการใบเสร็จ</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data ? `ใบเสร็จทั้งหมด ${total} รายการ` : 'กำลังโหลด…'}
          </p>
        </div>
        <Button asChild className="hidden sm:inline-flex">
          <Link to="/receipts/new">
            <Plus className="w-4 h-4" />
            สร้างใบเสร็จ
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-5">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อลูกค้า, เลขห้อง หรือเลขที่ใบเสร็จ"
                className="pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 w-full lg:w-auto lg:min-w-[320px]">
              <span className="text-sm font-medium text-muted-foreground">ช่วงวันที่ออกใบเสร็จ</span>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleFilterChange(() => setStartDate(e.target.value))}
                />
                <span className="hidden sm:block text-muted-foreground">—</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleFilterChange(() => setEndDate(e.target.value))}
                />
              </div>
            </div>
          </div>

          {(searchInput || startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('')
                setStartDate('')
                setEndDate('')
                setPage(1)
              }}
              className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
            >
              ล้างตัวกรอง
            </button>
          )}
        </CardContent>
      </Card>

      {/* Content */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">
              {searchInput || startDate || endDate ? 'ไม่พบใบเสร็จที่ตรงกับเงื่อนไข' : 'ยังไม่มีใบเสร็จ'}
            </p>
            {!searchInput && !startDate && !endDate && (
              <Button asChild className="mt-4" size="sm">
                <Link to="/receipts/new">สร้างใบเสร็จแรก</Link>
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
                    <TableHead className="text-right">ยอดรวม</TableHead>
                    <TableHead className="text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell>
                        <Link to={`/receipts/${receipt.id}`} className="font-semibold text-primary hover:text-primary/80">
                          {receipt.invoice_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-foreground/80">{receipt.customer?.name ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">{formatThaiDate(receipt.issue_date)}</TableCell>
                      <TableCell className="text-right font-semibold text-foreground">{formatTHB(receipt.total)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="w-8 h-8" asChild title="ดูรายละเอียด">
                            <Link to={`/receipts/${receipt.id}`}><Eye className="w-4 h-4" /></Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() => handleDownload(receipt.id, receipt.invoice_number)}
                            disabled={downloadingId === receipt.id}
                            title="ดาวน์โหลด PDF"
                          >
                            {downloadingId === receipt.id ? (
                              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="ลบ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>ลบใบเสร็จ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ลบใบเสร็จ {receipt.invoice_number}? การกระทำนี้ไม่สามารถย้อนกลับได้
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(receipt.id)}>ลบ</AlertDialogAction>
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

            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-border/50">
              {data.data.map((receipt) => (
                <div key={receipt.id} className="px-4 py-4 flex items-center justify-between gap-3">
                  <Link to={`/receipts/${receipt.id}`} className="flex-1 min-w-0">
                    <p className="font-semibold text-primary text-sm truncate">{receipt.invoice_number}</p>
                    <p className="text-sm text-foreground/80 truncate mt-0.5">{receipt.customer?.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatThaiDate(receipt.issue_date)}</p>
                  </Link>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="font-bold text-foreground text-sm">{formatTHB(receipt.total)}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => handleDownload(receipt.id, receipt.invoice_number)}
                        disabled={downloadingId === receipt.id}
                      >
                        {downloadingId === receipt.id ? (
                          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>ลบใบเสร็จ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              ลบใบเสร็จ {receipt.invoice_number}? การกระทำนี้ไม่สามารถย้อนกลับได้
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(receipt.id)}>ลบ</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
  )
}
