import { AlertTriangle, AlertOctagon, Lightbulb, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import type { InsightEntry } from '../types'

interface Props {
  data: InsightEntry[]
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertOctagon,
    bg: 'bg-destructive/8',
    border: 'border-destructive/20',
    text: 'text-destructive',
    iconColor: 'text-destructive',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-warning/8',
    border: 'border-warning/20',
    text: 'text-warning',
    iconColor: 'text-warning',
  },
  info: {
    icon: Lightbulb,
    bg: 'bg-info/8',
    border: 'border-info/20',
    text: 'text-info',
    iconColor: 'text-info',
  },
  success: {
    icon: CheckCircle2,
    bg: 'bg-success/8',
    border: 'border-success/20',
    text: 'text-success',
    iconColor: 'text-success',
  },
} as const

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  success: 3,
}

export function OwnerInsights({ data }: Props) {
  if (!data || data.length === 0) return null

  const sorted = [...data].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
  )

  return (
    <Card>
      <CardHeader className="px-5 py-3 pb-0">
        <CardTitle className="text-section">สรุปสถานการณ์วันนี้</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4 pt-3">
        <div className="space-y-1.5">
          {sorted.map((insight, i) => {
            const config = SEVERITY_CONFIG[insight.severity] ?? SEVERITY_CONFIG.info
            const Icon = config.icon
            return (
              <div
                key={i}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${config.bg} ${config.border}`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${config.iconColor}`} />
                <span className={`text-[13px] leading-snug ${config.text}`}>
                  {insight.message}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
