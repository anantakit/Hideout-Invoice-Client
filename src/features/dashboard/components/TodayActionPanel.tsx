import { Link } from 'react-router-dom'
import { LogIn, LogOut, SprayCan, ChevronRight, AlertCircle, Wallet, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '../../../shared/ui/card'
import type { TodayActions } from '../types'

interface Props {
  data: TodayActions
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

// ── Action item definition for urgency-based rendering ──

interface ActionItem {
  key: string
  to: string
  icon: React.ElementType
  count: number
  label: string
  /** Higher = more urgent, rendered first */
  urgency: number
  /** Tailwind classes for background */
  bgClass: string
  hoverBgClass: string
  iconBgClass: string
  iconColorClass: string
  warning?: string
}

function buildActionItems(data: TodayActions): ActionItem[] {
  const items: ActionItem[] = []

  // Departures with owing → RED urgency (money at risk)
  if (data.departures_today > 0 || data.departures_owing > 0) {
    items.push({
      key: 'departures',
      to: '/bookings?status=CHECKED_IN',
      icon: LogOut,
      count: data.departures_today,
      label: 'เช็คเอาท์',
      urgency: data.departures_owing > 0 ? 100 : 10,
      bgClass: data.departures_owing > 0 ? 'bg-warning-muted/50' : 'bg-muted/50',
      hoverBgClass: data.departures_owing > 0 ? 'hover:bg-warning-muted' : 'hover:bg-muted',
      iconBgClass: data.departures_owing > 0 ? 'bg-warning-muted' : 'bg-muted',
      iconColorClass: data.departures_owing > 0 ? 'text-warning-muted-foreground' : 'text-muted-foreground',
      warning: data.departures_owing > 0 ? `${data.departures_owing} ยังค้างเงิน` : undefined,
    })
  }

  // Arrivals with unassigned → ORANGE urgency (guest waiting, no room)
  if (data.arrivals_total > 0 || data.arrivals_unassigned > 0) {
    items.push({
      key: 'arrivals',
      to: '/timeline',
      icon: LogIn,
      count: data.arrivals_total,
      label: 'เช็คอิน',
      urgency: data.arrivals_unassigned > 0 ? 80 : 5,
      bgClass: data.arrivals_unassigned > 0 ? 'bg-warning-muted/50' : 'bg-info-muted/50',
      hoverBgClass: data.arrivals_unassigned > 0 ? 'hover:bg-warning-muted' : 'hover:bg-info-muted',
      iconBgClass: data.arrivals_unassigned > 0 ? 'bg-warning-muted' : 'bg-info-muted',
      iconColorClass: data.arrivals_unassigned > 0 ? 'text-warning-muted-foreground' : 'text-info-muted-foreground',
      warning: data.arrivals_unassigned > 0 ? `${data.arrivals_unassigned} ยังไม่ assign ห้อง` : undefined,
    })
  }

  // Rooms cleaning → YELLOW urgency (blocks new check-ins)
  if (data.rooms_cleaning > 0) {
    items.push({
      key: 'cleaning',
      to: '/rooms',
      icon: SprayCan,
      count: data.rooms_cleaning,
      label: 'รอทำความสะอาด',
      urgency: 30,
      bgClass: 'bg-muted/50',
      hoverBgClass: 'hover:bg-muted',
      iconBgClass: 'bg-muted',
      iconColorClass: 'text-muted-foreground',
    })
  }

  // Sort by urgency descending
  items.sort((a, b) => b.urgency - a.urgency)
  return items
}

export function TodayActionPanel({ data }: Props) {
  const hasOwing = data.owing_departures.length > 0
  const hasCollection = data.collection_expected > 0
  const collectionRate = hasCollection
    ? Math.round((data.collection_received / data.collection_expected) * 100)
    : 0

  const actionItems = buildActionItems(data)
  const isAllClear = actionItems.length === 0 && !hasOwing

  return (
    <Card>
      <CardContent className="px-4 py-4 sm:px-5 sm:py-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-foreground">สิ่งที่ต้องดูแลวันนี้</h2>
        </div>

        {/* Zero state — all clear */}
        {isAllClear ? (
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-success-muted/50">
            <div className="w-8 h-8 rounded-lg bg-success-muted flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-success-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-success">วันนี้ไม่มีงานเร่งด่วน</p>
          </div>
        ) : (
          <>
            {/* Action items — sorted by urgency */}
            {actionItems.length > 0 && (
              <div className={`grid grid-cols-1 ${actionItems.length >= 3 ? 'sm:grid-cols-3' : actionItems.length === 2 ? 'sm:grid-cols-2' : ''} gap-2 sm:gap-3`}>
                {actionItems.map((item) => (
                  <Link
                    key={item.key}
                    to={item.to}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer group ${item.bgClass} ${item.hoverBgClass}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.iconBgClass}`}>
                      <item.icon className={`w-4 h-4 ${item.iconColorClass}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-semibold tabular-nums text-foreground">{item.count}</span>
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                      </div>
                      {item.warning && (
                        <p className="text-[11px] text-warning font-medium">{item.warning}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Cash collection rate */}
        {hasCollection && (
          <div className={`${actionItems.length > 0 || isAllClear ? 'mt-3 pt-3 border-t border-border' : ''}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-success-muted flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4 text-success-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs text-muted-foreground">เก็บเงินได้</span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatCompact(data.collection_received)}
                  </span>
                  <span className="text-xs text-muted-foreground">/</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatCompact(data.collection_expected)} ฿
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      collectionRate >= 80
                        ? 'bg-success'
                        : collectionRate >= 50
                          ? 'bg-warning'
                          : 'bg-destructive'
                    }`}
                    style={{ width: `${Math.min(collectionRate, 100)}%` }}
                  />
                </div>
              </div>
              <span className={`text-sm font-semibold tabular-nums shrink-0 ${
                collectionRate >= 80
                  ? 'text-success'
                  : collectionRate >= 50
                    ? 'text-warning'
                    : 'text-destructive'
              }`}>
                {collectionRate}%
              </span>
            </div>
          </div>
        )}

        {/* Owing departures alert — compact, max 2 shown */}
        {hasOwing && (() => {
          const MAX_OWING = 2
          const displayed = data.owing_departures.slice(0, MAX_OWING)
          const remaining = data.owing_departures.length - displayed.length
          const totalOwing = data.owing_departures.reduce((s, d) => s + d.balance, 0)
          return (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-warning" />
                  <span className="text-xs font-semibold text-warning">เช็คเอาท์วันนี้ที่ยังค้างเงิน</span>
                </div>
                <span className="text-xs font-semibold tabular-nums text-warning">{formatCompact(totalOwing)} ฿</span>
              </div>
              <div className="space-y-0.5">
                {displayed.map((d) => (
                  <Link
                    key={d.booking_id}
                    to={`/bookings/${d.booking_id}`}
                    className="flex items-center justify-between py-1 px-2 -mx-2 rounded-md hover:bg-warning-muted/30 transition-colors cursor-pointer group"
                  >
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors truncate">
                      {d.guest_name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 ml-3">
                      <span className="text-sm font-semibold tabular-nums text-warning">{formatCompact(d.balance)} ฿</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
              {remaining > 0 && (
                <Link
                  to="/bookings?status=CHECKED_IN"
                  className="block text-center text-[11px] text-primary hover:text-primary/80 font-medium mt-1.5 transition-colors"
                >
                  ดูเพิ่มเติมอีก {remaining} รายการ
                </Link>
              )}
            </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}
