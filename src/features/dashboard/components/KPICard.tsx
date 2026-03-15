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
  const hasChange = change !== undefined && isFinite(change) && change !== -1 && change !== 0
  const isPositive = hasChange && change > 0
  const isNegative = hasChange && change < 0

  return (
    <Card>
      <CardContent className="px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs text-muted-foreground font-medium">{title}</p>
            <p className="mt-1 text-lg sm:text-2xl font-semibold tabular-nums tracking-tight text-foreground leading-none">
              {value}
            </p>
            <div className="mt-1.5 space-y-0.5">
              {hasChange ? (
                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-md ${
                    isPositive ? 'text-success bg-success/10' :
                    isNegative ? 'text-destructive bg-destructive/10' :
                    'text-muted-foreground bg-muted'
                  }`}>
                    {isPositive ? <TrendingUp className="w-3 h-3" /> :
                     isNegative ? <TrendingDown className="w-3 h-3" /> :
                     <Minus className="w-3 h-3" />}
                    {change > 0 ? '+' : ''}{(change * 100).toFixed(0)}%
                  </span>
                  {changeLabel && (
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">{changeLabel}</span>
                  )}
                </div>
              ) : changeLabel && change === undefined ? (
                <span className="text-[11px] text-muted-foreground">{changeLabel}</span>
              ) : null}
              {subtitle && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">{subtitle}</p>
              )}
            </div>
          </div>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconClassName}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
