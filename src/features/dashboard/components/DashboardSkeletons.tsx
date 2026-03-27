import { Skeleton } from '@/shared/ui/skeleton'
import { Card, CardContent } from '@/shared/ui/card'

export function KPICardSkeleton() {
  return (
    <Card>
      <CardContent className="px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-3.5 w-20" />
          </div>
          <Skeleton className="w-8 h-8 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

export function ActionPanelSkeleton() {
  return (
    <Card>
      <CardContent className="px-4 py-3 sm:px-5 sm:py-4">
        <Skeleton className="h-4 w-36 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

export function ChartSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="px-4 py-4 sm:p-5">
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="w-full h-44" />
      </CardContent>
    </Card>
  )
}
