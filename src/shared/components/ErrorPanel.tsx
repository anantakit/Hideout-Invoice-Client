import { AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '../ui/button'

interface ErrorPanelProps {
  message?: string
  onRetry?: () => void
}

/**
 * Inline error panel for partial page failures.
 * Uses design tokens — works in both dark and light mode.
 */
export default function ErrorPanel({
  message = 'ไม่สามารถโหลดข้อมูลได้',
  onRetry,
}: ErrorPanelProps) {
  return (
    <div className="rounded-xl border border-border bg-card error-card-enter">
      <div className="flex flex-col items-center gap-3 px-6 py-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted">
          <AlertCircle className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        </div>

        <p className="max-w-70 text-sm leading-relaxed text-muted-foreground">
          {message}
        </p>

        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
            <RotateCcw className="h-3 w-3" />
            ลองใหม่
          </Button>
        )}
      </div>
    </div>
  )
}
