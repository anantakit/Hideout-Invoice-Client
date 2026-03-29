import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  FileQuestion,
  WifiOff,
  ShieldOff,
  ServerCrash,
  Inbox,
  Clock,
  RotateCcw,
  ArrowLeft,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../utils'

// ─── Types ──────────────────────────────────────────────────────────────────────

type ErrorVariant = 'error' | 'not-found' | 'network' | 'permission' | 'server' | 'no-data' | 'timeout'

interface ErrorAction {
  label: string
  onClick: () => void
}

interface ErrorPageProps {
  variant?: ErrorVariant
  title?: string
  description?: string
  detail?: string
  primaryAction?: ErrorAction
  secondaryAction?: ErrorAction
}

// ─── Presets ────────────────────────────────────────────────────────────────────

interface Preset {
  icon: React.ElementType
  code: string
  title: string
  description: string
  color: string        // Tailwind color token for icon + accent
  primaryLabel: string
  primaryRoute?: string
  secondaryLabel?: string
  secondaryAction?: 'reload' | 'back'
}

const PRESETS: Record<ErrorVariant, Preset> = {
  'not-found': {
    icon: FileQuestion,
    code: '404',
    title: 'ไม่พบหน้าที่ต้องการ',
    description: 'หน้าที่คุณกำลังมองหาอาจถูกย้าย ลบออก หรือ URL ไม่ถูกต้อง',
    color: 'text-primary',
    primaryLabel: 'กลับหน้าหลัก',
    primaryRoute: '/timeline',
    secondaryLabel: 'ย้อนกลับ',
    secondaryAction: 'back',
  },
  network: {
    icon: WifiOff,
    code: 'OFFLINE',
    title: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์',
    description: 'โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่',
    color: 'text-warning',
    primaryLabel: 'ลองใหม่',
    secondaryLabel: 'กลับหน้าหลัก',
    secondaryAction: 'back',
  },
  permission: {
    icon: ShieldOff,
    code: '403',
    title: 'ไม่มีสิทธิ์เข้าถึง',
    description: 'บัญชีของคุณไม่มีสิทธิ์ในการดูข้อมูลส่วนนี้',
    color: 'text-destructive',
    primaryLabel: 'กลับหน้าหลัก',
    primaryRoute: '/timeline',
    secondaryLabel: 'ย้อนกลับ',
    secondaryAction: 'back',
  },
  server: {
    icon: ServerCrash,
    code: '500',
    title: 'เซิร์ฟเวอร์ขัดข้อง',
    description: 'ระบบกำลังประสบปัญหาชั่วคราว กรุณาลองใหม่ในอีกสักครู่',
    color: 'text-destructive',
    primaryLabel: 'ลองใหม่',
    secondaryLabel: 'กลับหน้าหลัก',
    secondaryAction: 'back',
  },
  'no-data': {
    icon: Inbox,
    code: 'EMPTY',
    title: 'ยังไม่มีข้อมูล',
    description: 'เริ่มต้นเพิ่มข้อมูลใหม่เพื่อให้แสดงในหน้านี้',
    color: 'text-muted-foreground',
    primaryLabel: 'สร้างการจอง',
    primaryRoute: '/bookings/new',
    secondaryLabel: 'รีเฟรช',
    secondaryAction: 'reload',
  },
  timeout: {
    icon: Clock,
    code: 'TIMEOUT',
    title: 'หมดเวลาการเชื่อมต่อ',
    description: 'เซิร์ฟเวอร์ใช้เวลาตอบกลับนานเกินไป กรุณาลองใหม่',
    color: 'text-warning',
    primaryLabel: 'ลองใหม่',
    secondaryLabel: 'กลับหน้าหลัก',
    secondaryAction: 'back',
  },
  error: {
    icon: AlertTriangle,
    code: 'ERROR',
    title: 'เกิดข้อผิดพลาด',
    description: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
    color: 'text-destructive',
    primaryLabel: 'ลองใหม่',
    secondaryLabel: 'กลับหน้าหลัก',
    secondaryAction: 'back',
  },
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function ErrorPage({
  variant = 'error',
  title,
  description,
  detail,
  primaryAction,
  secondaryAction,
}: ErrorPageProps) {
  const navigate = useNavigate()
  const [detailOpen, setDetailOpen] = useState(false)

  const p = PRESETS[variant]
  const Icon = p.icon

  const handlePrimary = () => {
    if (primaryAction) return primaryAction.onClick()
    if (p.primaryRoute) return navigate(p.primaryRoute)
    window.location.reload()
  }

  const handleSecondary = () => {
    if (secondaryAction) return secondaryAction.onClick()
    if (p.secondaryAction === 'reload') return window.location.reload()
    if (p.secondaryAction === 'back') return navigate(-1)
    navigate('/timeline')
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md text-center error-card-enter">
        {/* Icon */}
        <div className={cn(
          'mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card',
          p.color,
        )}>
          <Icon className="h-6 w-6" strokeWidth={1.5} />
        </div>

        {/* Code badge */}
        <span className="inline-block mb-3 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {p.code}
        </span>

        {/* Title */}
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {title ?? p.title}
        </h1>

        {/* Description */}
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description ?? p.description}
        </p>

        {/* Actions */}
        <div className="mt-7 flex items-center justify-center gap-3">
          <Button onClick={handlePrimary} className="gap-1.5">
            {!p.primaryRoute && <RotateCcw className="h-3.5 w-3.5" />}
            {primaryAction?.label ?? p.primaryLabel}
          </Button>

          {(secondaryAction || p.secondaryLabel) && (
            <Button variant="outline" onClick={handleSecondary} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              {secondaryAction?.label ?? p.secondaryLabel}
            </Button>
          )}
        </div>

        {/* Technical detail */}
        {detail && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setDetailOpen(!detailOpen)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
            >
              <ChevronDown className={cn('h-3 w-3 transition-transform', detailOpen && 'rotate-180')} />
              รายละเอียดทางเทคนิค
            </button>
            {detailOpen && (
              <pre className="mt-2 mx-auto max-w-sm rounded-lg border border-border bg-muted/50 p-3 text-left font-mono text-micro-sm leading-relaxed text-muted-foreground overflow-auto max-h-32">
                {detail}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
