import { CalendarX } from 'lucide-react'
import ErrorPanel from '@/shared/components/ErrorPanel'
import { Card, CardContent } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

// ── Loading ─────────────────────────────────────────────────────────────────

export function LoadingState() {
  return (
    <div className="space-y-4 px-4 py-6">
      {/* Mobile card skeletons */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Desktop table skeletons */}
      <div className="hidden md:block space-y-3 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-24 ml-auto rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Error ───────────────────────────────────────────────────────────────────

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorPanel
      message="โหลดข้อมูลการจองไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ"
      onRetry={onRetry}
    />
  )
}

// ── Empty ───────────────────────────────────────────────────────────────────

export function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-4">
      <CalendarX className="w-10 h-10 text-muted-foreground/50" />
      <div>
        <p className="font-medium text-foreground">
          {hasFilters ? 'ไม่พบรายการที่ตรงกัน' : 'ยังไม่มีรายการจอง'}
        </p>
        <p className="text-helper mt-1">
          {hasFilters ? 'ลองเปลี่ยนตัวกรอง หรือคำค้นหา' : 'กดปุ่ม "สร้างการจอง" เพื่อเริ่มต้น'}
        </p>
      </div>
    </div>
  )
}
