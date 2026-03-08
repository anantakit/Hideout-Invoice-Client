import { AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '../ui/button'

interface ErrorPanelProps {
  message?: string
  onRetry?: () => void
}

/**
 * Inline error panel — calm, minimal SaaS style.
 * Used when a section fails but the rest of the page still works.
 */
export default function ErrorPanel({
  message = 'ไม่สามารถโหลดข้อมูลได้',
  onRetry,
}: ErrorPanelProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-card backdrop-blur-md shadow-lg shadow-black/20 error-card-enter">
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="flex flex-col items-center gap-3 px-6 py-6 text-center">
        {/* Icon with soft glow */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-gradient-radial from-primary/[0.15] to-primary/[0.03]">
          <AlertCircle className="h-4 w-4 text-primary" strokeWidth={1.5} />
        </div>

        <p className="max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">
          {message}
        </p>

        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-0.5 h-8 gap-1.5 rounded-lg border-white/[0.08] bg-white/[0.04] px-3.5 text-xs font-medium text-secondary-foreground hover:bg-white/[0.08] hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            ลองใหม่
          </Button>
        )}
      </div>
    </div>
  )
}
