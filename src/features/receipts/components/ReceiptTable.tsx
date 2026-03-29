import { Link } from 'react-router'
import { Eye } from 'lucide-react'
import type { Receipt } from '../types'
import { formatTHB, formatThaiDate } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/ui/table'
import { DownloadButton } from './DownloadButton'
import { DeleteReceiptDialog } from './DeleteReceiptDialog'

interface ReceiptTableProps {
  receipts: Receipt[]
  downloadingId: string | null
  onDownload: (receipt: Receipt) => void
  onDelete: (id: string) => void
  isDeleting: boolean
}

export function ReceiptTable({ receipts, downloadingId, onDownload, onDelete, isDeleting }: ReceiptTableProps) {
  return (
    <>
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
            {receipts.map((receipt) => (
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
                    <DownloadButton receipt={receipt} downloadingId={downloadingId} onDownload={onDownload} />
                    <DeleteReceiptDialog
                      invoiceNumber={receipt.invoice_number}
                      onConfirm={() => onDelete(receipt.id)}
                      isPending={isDeleting}
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
        {receipts.map((receipt) => (
          <div key={receipt.id} className="px-4 py-4 flex items-center justify-between gap-3">
            <Link to={`/receipts/${receipt.id}`} className="flex-1 min-w-0">
              <p className="font-semibold text-primary text-sm truncate">{receipt.invoice_number}</p>
              <p className="text-sm text-foreground/80 truncate break-all mt-0.5">{receipt.customer?.name ?? '—'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatThaiDate(receipt.issue_date)}</p>
            </Link>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className="font-bold text-foreground text-sm">{formatTHB(receipt.total)}</span>
              <div className="flex gap-1">
                <DownloadButton receipt={receipt} downloadingId={downloadingId} onDownload={onDownload} />
                <DeleteReceiptDialog
                  invoiceNumber={receipt.invoice_number}
                  onConfirm={() => onDelete(receipt.id)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
