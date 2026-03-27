import { Download } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { Receipt } from '../types'

export function DownloadButton({
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
