import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ChevronLeft, Download, Trash2, Loader2, ExternalLink } from 'lucide-react'
import { Skeleton } from '@/shared/ui/skeleton'
import { receiptsApi } from '../api'
import ErrorPage from '@/shared/components/ErrorPage'
import { formatThaiDate, formatPhone } from '@/shared/utils'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'
import { ReceiptItemsCard } from '../components/ReceiptItemsCard'
import { useDeleteReceipt } from '../hooks/useDeleteReceipt'

export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>()
  const [downloading, setDownloading] = useState(false)

  const { data: receipt, isLoading, error } = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => receiptsApi.getById(id!),
    enabled: !!id,
  })

  const deleteMutation = useDeleteReceipt({ navigateTo: '/receipts' })

  const handleDownload = async () => {
    if (!receipt) return
    setDownloading(true)
    try { await receiptsApi.download(receipt) } catch { toast.error('ดาวน์โหลด PDF ไม่สำเร็จ') } finally { setDownloading(false) }
  }

  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-5 w-16" />
        <div className="space-y-2"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-64" /></div>
        <Skeleton className="h-28 rounded-xl" /><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (error || !receipt) {
    return <ErrorPage variant="error" title="ไม่พบใบเสร็จ" description="ใบเสร็จนี้อาจถูกลบไปแล้ว หรือเกิดข้อผิดพลาดในการโหลดข้อมูล" />
  }

  const hasStayInfo = receipt.check_in_date || receipt.payment_method

  const deleteDialog = (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4" />ลบใบเสร็จ</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>ลบใบเสร็จ?</AlertDialogTitle><AlertDialogDescription>ลบใบเสร็จ {receipt.invoice_number}? การกระทำนี้ไม่สามารถย้อนกลับได้</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>ยกเลิก</AlertDialogCancel><AlertDialogAction disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(id!)}>{deleteMutation.isPending ? 'กำลังลบ…' : 'ลบ'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return (
    <div className="px-4 py-6 sm:px-8 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="mb-8">
        <Link to="/receipts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 touch-target">
          <ChevronLeft className="w-4 h-4" />กลับ
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-section">{receipt.invoice_number}</h1>
            <p className="text-helper mt-1">ออกเมื่อ {formatThaiDate(receipt.issue_date)} · สร้าง {formatThaiDate(receipt.created_at)}</p>
          </div>
          <div className="hidden md:flex md:flex-row gap-3">
            <Button onClick={handleDownload} disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}ดาวน์โหลด PDF
            </Button>
            {deleteDialog}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Customer */}
        <Card className="transition-shadow duration-200 md:hover:shadow-md">
          <CardContent className="p-5 md:p-8 space-y-4">
            <p className="text-helper uppercase tracking-wide">ผู้ชำระเงิน</p>
            <div>
              <p className="text-base font-medium text-foreground">{receipt.customer.name}</p>
              <div className="mt-1.5 space-y-1 text-sm text-muted-foreground">
                {receipt.customer.address && <p>{receipt.customer.address}</p>}
                {receipt.customer.phone && <p>โทร: {formatPhone(receipt.customer.phone)}</p>}
                {receipt.customer.tax_id && <p>เลขผู้เสียภาษี: {receipt.customer.tax_id}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stay Info */}
        {hasStayInfo && (
          <Card className="transition-shadow duration-200 md:hover:shadow-md">
            <CardContent className="p-5 md:p-8 space-y-4">
              <p className="text-helper uppercase tracking-wide">รายละเอียดการเข้าพัก</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {receipt.check_in_date && (
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">วันที่เข้าพัก</span><span className="text-sm font-medium text-foreground">{formatThaiDate(receipt.check_in_date)}</span></div>
                )}
                {receipt.payment_method && (
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">วิธีชำระเงิน</span><span className="text-sm font-medium text-foreground">{receipt.payment_method}</span></div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items */}
        <ReceiptItemsCard items={receipt.items} total={receipt.total} />

        {/* Notes */}
        {receipt.notes && (
          <Card className="transition-shadow duration-200 md:hover:shadow-md">
            <CardContent className="p-5 md:p-8 space-y-2">
              <p className="text-helper uppercase tracking-wide">หมายเหตุ</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{receipt.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Booking link */}
        {receipt.booking_id && (
          <Card className="transition-shadow duration-200 md:hover:shadow-md">
            <CardContent className="p-5 md:p-8">
              <p className="text-helper uppercase tracking-wide mb-2">การจองที่เกี่ยวข้อง</p>
              <Link to={`/bookings/${receipt.booking_id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors touch-target">
                <ExternalLink className="w-3.5 h-3.5" />ดูการจอง #{receipt.booking_id.slice(0, 8).toUpperCase()}
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Mobile actions */}
        <div className="pt-2 md:hidden space-y-2">
          <Button onClick={handleDownload} disabled={downloading} className="w-full touch-target">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}ดาวน์โหลด PDF
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" disabled={deleteMutation.isPending} className="w-full touch-target text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />ลบใบเสร็จ
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>ลบใบเสร็จ?</AlertDialogTitle><AlertDialogDescription>ลบใบเสร็จ {receipt.invoice_number}? การกระทำนี้ไม่สามารถย้อนกลับได้</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>ยกเลิก</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(id!)}>ลบ</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
