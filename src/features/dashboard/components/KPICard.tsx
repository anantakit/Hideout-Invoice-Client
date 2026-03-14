import { Card, CardContent } from '../../../shared/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string
  subtitle?: string
  change?: number
  changeLabel?: string
  icon: React.ElementType
  iconClassName?: string
}

export function KPICard({ title, value, subtitle, change, changeLabel, icon: Icon, iconClassName }: KPICardProps) {
  // Only show change badge when the comparison is meaningful:
  // - change must be a finite number and non-zero
  // - skip if change is -1 (i.e. -100%) — means "yesterday was > 0 but today is 0", not a real decline
  // - skip if change is 0 — "- 0%" is confusing, just show the label
  const hasChange = change !== undefined && isFinite(change) && change !== -1 && change !== 0
  const isPositive = hasChange && change > 0
  const isNegative = hasChange && change < 0
  const isNeutral = false

  return (
    <Card>
      <CardContent className="px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="mt-1.5 text-xl sm:text-2xl font-semibold tabular-nums tracking-tight text-foreground leading-none">
              {value}
            </p>
            <div className="mt-2 space-y-0.5">
              {hasChange ? (
                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-md ${
                    isPositive ? 'text-success bg-success/10' :
                    isNegative ? 'text-destructive bg-destructive/10' :
                    'text-muted-foreground bg-muted'
                  }`}>
                    {isPositive ? <TrendingUp className="w-3 h-3" /> :
                     isNegative ? <TrendingDown className="w-3 h-3" /> :
                     <Minus className="w-3 h-3" />}
                    {isNeutral ? '0%' : `${change > 0 ? '+' : ''}${(change * 100).toFixed(0)}%`}
                  </span>
                  {changeLabel && (
                    <span className="text-xs text-muted-foreground">{changeLabel}</span>
                  )}
                </div>
              ) : changeLabel && change === undefined ? (
                // changeLabel without change — just show the label
                <span className="text-xs text-muted-foreground">{changeLabel}</span>
              ) : null}
              {subtitle && (
                <p className="text-xs text-muted-foreground leading-relaxed">{subtitle}</p>
              )}
            </div>
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClassName}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
