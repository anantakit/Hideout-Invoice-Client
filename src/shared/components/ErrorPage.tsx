import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileQuestion,
  WifiOff,
  ShieldOff,
  Server,
  Inbox,
  Clock,
  RotateCcw,
  ArrowLeft,
  ChevronDown,
  LayoutDashboard,
  Plus,
  Mail,
} from 'lucide-react'
import { Button } from '../ui/button'

// ─── Types ──────────────────────────────────────────────────────────────────────

type ErrorVariant = 'error' | 'not-found' | 'network' | 'permission' | 'server' | 'no-data' | 'timeout'

interface ErrorPageProps {
  variant?: ErrorVariant
  title?: string
  description?: string
  showReload?: boolean
  showHome?: boolean
  detail?: string
  primaryAction?: { label: string; onClick: () => void }
  secondaryAction?: { label: string; onClick: () => void }
}

// ─── Preset configuration ───────────────────────────────────────────────────────

interface Preset {
  icon: React.ElementType
  badge: string
  title: string
  description: string
  primary?: { label: string; icon: React.ElementType; route?: string }
  secondary?: { label: string; icon: React.ElementType; action?: 'reload'; route?: string }
  tertiary?: { label: string; icon: React.ElementType; route?: string }
}

const PRESETS: Record<ErrorVariant, Preset> = {
  'not-found': {
    icon: FileQuestion,
    badge: '404',
    title: 'ไม่พบหน้าที่ต้องการ',
    description: 'หน้าที่คุณกำลังมองหาอาจถูกย้าย ลบออก หรือ URL ไม่ถูกต้อง',
    primary: { label: 'กลับไปไทม์ไลน์', icon: ArrowLeft, route: '/bookings/timeline' },
    secondary: { label: 'โหลดใหม่', icon: RotateCcw, action: 'reload' },
    tertiary: { label: 'ไปหน้า Dashboard', icon: LayoutDashboard, route: '/dashboard' },
  },
  network: {
    icon: WifiOff,
    badge: 'NETWORK',
    title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์',
    description: 'โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณแล้วลองใหม่',
    primary: { label: 'ลองใหม่', icon: RotateCcw },
    secondary: { label: 'กลับหน้าแรก', icon: ArrowLeft },
  },
  permission: {
    icon: ShieldOff,
    badge: '403',
    title: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้',
    description: 'บัญชีของคุณอาจไม่มีสิทธิ์ในการดูข้อมูลส่วนนี้',
    primary: { label: 'กลับไป Dashboard', icon: LayoutDashboard, route: '/dashboard' },
    tertiary: { label: 'ติดต่อผู้ดูแลระบบ', icon: Mail },
  },
  server: {
    icon: Server,
    badge: '500',
    title: 'เซิร์ฟเวอร์ขัดข้อง',
    description: 'ระบบกำลังประสบปัญหาชั่วคราว กรุณาลองใหม่ในอีกสักครู่',
    primary: { label: 'ลองใหม่', icon: RotateCcw },
    secondary: { label: 'กลับไปไทม์ไลน์', icon: ArrowLeft },
  },
  'no-data': {
    icon: Inbox,
    badge: 'EMPTY',
    title: 'ยังไม่มีการจอง',
    description: 'เริ่มต้นเพิ่มการจองใหม่เพื่อให้ข้อมูลแสดงในไทม์ไลน์',
    primary: { label: 'สร้างการจอง', icon: Plus, route: '/bookings/new' },
    secondary: { label: 'รีเฟรชข้อมูล', icon: RotateCcw, action: 'reload' },
  },
  timeout: {
    icon: Clock,
    badge: 'TIMEOUT',
    title: 'หมดเวลาการเชื่อมต่อ',
    description: 'เซิร์ฟเวอร์ใช้เวลาตอบกลับนานเกินไป กรุณาลองใหม่',
    primary: { label: 'ลองใหม่', icon: RotateCcw },
    secondary: { label: 'กลับไปไทม์ไลน์', icon: ArrowLeft },
  },
  error: {
    icon: Server,
    badge: 'ERROR',
    title: 'เกิดข้อผิดพลาด',
    description: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
    primary: { label: 'ลองใหม่', icon: RotateCcw },
    secondary: { label: 'กลับไปไทม์ไลน์', icon: ArrowLeft },
  },
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function ErrorPage({
  variant = 'error',
  title,
  description,
  showReload = true,
  showHome = true,
  detail,
  primaryAction,
  secondaryAction,
}: ErrorPageProps) {
  const navigate = useNavigate()
  const [detailOpen, setDetailOpen] = useState(false)

  const p = PRESETS[variant]
  const Icon = p.icon
  const heading = title ?? p.title
  const desc = description ?? p.description

  const handlePrimary = () => {
    if (primaryAction) return primaryAction.onClick()
    if (p.primary?.route) return navigate(p.primary.route)
    window.location.reload()
  }

  const handleSecondary = () => {
    if (secondaryAction) return secondaryAction.onClick()
    if (p.secondary?.action === 'reload') return window.location.reload()
    if (p.secondary) return navigate(p.secondary.route ?? '/bookings/timeline')
  }

  const handleTertiary = () => {
    if (p.tertiary?.route) return navigate(p.tertiary.route)
  }

  const PrimaryIcon = primaryAction ? RotateCcw : p.primary?.icon ?? RotateCcw
  const SecondaryIcon = p.secondary?.icon ?? RotateCcw

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="relative w-full max-w-[500px] error-card-enter">
        {/* Background glow */}
        <div
          className="pointer-events-none absolute -inset-16 bg-gradient-radial from-primary/[0.12] to-transparent to-70% opacity-50 blur-3xl"
          aria-hidden
        />

        {/* Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-card backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
          {/* Top gradient band */}
          <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <div className="px-10 pb-10 pt-10 text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                {p.badge}
              </span>
            </div>

            {/* Icon with glow circle */}
            <div className="relative mx-auto mb-7 flex h-16 w-16 items-center justify-center">
              {/* Outer pulse */}
              <div className="absolute inset-0 rounded-full bg-gradient-radial from-primary/[0.18] to-primary/[0.03] error-icon-pulse" />
              {/* Inner circle */}
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm">
                <Icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {heading}
            </h1>

            {/* Description */}
            <p className="mx-auto mt-3 max-w-[340px] text-[13.5px] leading-relaxed text-muted-foreground">
              {desc}
            </p>

            {/* Divider */}
            <div className="mx-auto my-7 h-px w-16 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

            {/* Actions */}
            <div className="flex items-center justify-center gap-3">
              {showHome && p.primary && (
                <Button
                  onClick={handlePrimary}
                  className="h-9 gap-1.5 rounded-lg px-4 text-[13px] font-medium shadow-lg shadow-primary/25"
                >
                  <PrimaryIcon className="h-3.5 w-3.5" />
                  {primaryAction?.label ?? p.primary.label}
                </Button>
              )}

              {showReload && p.secondary && (
                <Button
                  variant="outline"
                  onClick={handleSecondary}
                  className="h-9 gap-1.5 rounded-lg border-white/[0.08] bg-white/[0.04] px-4 text-[13px] font-medium text-secondary-foreground hover:bg-white/[0.08] hover:text-foreground"
                >
                  <SecondaryIcon className="h-3.5 w-3.5" />
                  {secondaryAction?.label ?? p.secondary.label}
                </Button>
              )}
            </div>

            {/* Tertiary link */}
            {p.tertiary && (
              <button
                type="button"
                onClick={handleTertiary}
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary transition-colors hover:text-primary/80"
              >
                {p.tertiary.icon && <p.tertiary.icon className="h-3 w-3" />}
                {p.tertiary.label}
              </button>
            )}

            {/* Technical detail (collapsible) */}
            {detail && (
              <div className="mt-7">
                <button
                  type="button"
                  onClick={() => setDetailOpen(!detailOpen)}
                  className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                >
                  <ChevronDown
                    className={`h-3 w-3 transition-transform duration-200 ${detailOpen ? 'rotate-180' : ''}`}
                  />
                  รายละเอียดทางเทคนิค
                </button>
                {detailOpen && (
                  <pre className="mt-3 rounded-lg border border-white/[0.06] bg-background/60 p-3.5 text-left font-mono text-[11px] leading-relaxed text-muted-foreground/70 overflow-auto max-h-28">
                    {detail}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
