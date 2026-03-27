import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import { receiptsApi } from '../api'
import type { Receipt } from '../types'
import { useDataTable } from '@/shared/hooks/useDataTable'
import { DataTableShell } from '@/shared/components/DataTableShell'
import { DateRangeFilter } from '@/shared/components/DateRangeFilter'
import { Button } from '@/shared/ui/button'
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
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const table = useDataTable<Receipt>({
    queryKey: 'receipts',
    queryFn: receiptsApi.list,
    defaultLimit: 20,
    extraParams: {
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate }),
    },
  })

  const deleteMutation = useDeleteReceipt()

  const handleDownload = async (receipt: Receipt) => {
    setDownloadingId(receipt.id)
    await downloadReceipt(receipt)
    setDownloadingId(null)
  }

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
    table.setPage(1)
  }

  const hasFilters = !!(table.searchInput || startDate || endDate)

  return (
    <DataTableShell
      title="รายการใบเสร็จ"
      subtitle={table.isLoading ? null : `ใบเสร็จทั้งหมด ${table.total} รายการ`}
      searchPlaceholder="ค้นหาชื่อลูกค้า, เลขห้อง หรือเลขที่ใบเสร็จ"
      searchInput={table.searchInput}
      onSearchChange={table.setSearchInput}
      addAction={{ label: 'สร้างใบเสร็จ', to: '/receipts/new' }}
      isLoading={table.isLoading}
      isFetching={table.isFetching}
      isEmpty={table.isEmpty}
      emptyMessage="ยังไม่มีใบเสร็จ"
      emptySearchMessage="ไม่พบใบเสร็จที่ตรงกับเงื่อนไข"
      emptyAction={
        <Button asChild variant="outline" size="sm">
          <Link to="/receipts/new"><Plus className="w-4 h-4 mr-1.5" />สร้างใบเสร็จใหม่</Link>
        </Button>
      }
      filterSlot={
        <>
          <DateRangeFilter startDate={startDate} endDate={endDate} onRangeChange={handleDateRangeChange} />
          {hasFilters && (
            <button
              type="button"
              onClick={() => { table.setSearchInput(''); setStartDate(''); setEndDate(''); table.setPage(1) }}
              className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
            >
              ล้างตัวกรอง
            </button>
          )}
        </>
      }
      pagination={table.paginationProps}
    >
      <ReceiptTable
        receipts={table.items}
        downloadingId={downloadingId}
        onDownload={handleDownload}
        onDelete={(id) => deleteMutation.mutate(id)}
        isDeleting={deleteMutation.isPending}
      />
    </DataTableShell>
  )
}
