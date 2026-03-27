import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Search } from 'lucide-react'
import { receiptsApi, type ReceiptQueryParams } from '../api'
import type { Receipt } from '../types'
import { usePaginatedQuery } from '@/shared/hooks/usePaginatedQuery'
import Pagination from '@/shared/ui/Pagination'
import { Card } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { DateRangeFilter } from '@/shared/components/DateRangeFilter'
import { Fab } from '@/shared/ui/Fab'
import { Skeleton } from '@/shared/ui/skeleton'
import { ReceiptTable } from '../components/ReceiptTable'
import { useDeleteReceipt } from '../hooks/useDeleteReceipt'

async function downloadReceipt(receipt: Receipt) {
  try {
    await receiptsApi.download(receipt)
  } catch {
    toast.error('ดาวน์โหลด PDF ไม่สำเร็จ')
  }
}

export default function ReceiptHistory() {

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

  const deleteMutation = useDeleteReceipt()

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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อลูกค้า, เลขห้อง หรือเลขที่ใบเสร็จ"
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <DateRangeFilter startDate={startDate} endDate={endDate} onRangeChange={handleDateRangeChange} />
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setSearchInput(''); setStartDate(''); setEndDate(''); setPage(1) }}
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
            <ReceiptTable
              receipts={data.data}
              downloadingId={downloadingId}
              onDownload={handleDownload}
              onDelete={(id) => deleteMutation.mutate(id)}
              isDeleting={deleteMutation.isPending}
            />
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
