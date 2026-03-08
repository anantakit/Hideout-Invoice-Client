import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '../ui/button'

interface ErrorPanelProps {
  message?: string
  onRetry?: () => void
}

/**
 * Inline error panel — premium glass style.
 * Used when a section fails but the rest of the page still works.
 */
export default function ErrorPanel({
  message = 'ไม่สามารถโหลดข้อมูลได้',
  onRetry,
}: ErrorPanelProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-card/60 backdrop-blur-md">
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

      <div className="flex flex-col items-center gap-3 px-6 py-6 text-center">
        {/* Icon with ring */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04]">
          <AlertTriangle className="h-4.5 w-4.5 text-amber-400" strokeWidth={1.5} />
        </div>

        <p className="max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">
          {message}
        </p>

        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-0.5 h-8 gap-1.5 rounded-lg border-white/[0.08] bg-white/[0.03] px-3.5 text-xs font-medium text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            ลองใหม่
          </Button>
        )}
      </div>
    </div>
  )
}
