import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  FileQuestion,
  WifiOff,
  ShieldX,
  ServerCrash,
  ChevronDown,
  RotateCcw,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '../ui/button'

// ─── Types ──────────────────────────────────────────────────────────────────────

type ErrorVariant = 'error' | 'not-found' | 'network' | 'permission' | 'server'

interface ErrorPageProps {
  variant?: ErrorVariant
  title?: string
  description?: string
  showReload?: boolean
  showHome?: boolean
  detail?: string
}

// ─── Preset map ─────────────────────────────────────────────────────────────────

const PRESETS: Record<ErrorVariant, {
  icon: React.ElementType
  code: string
  title: string
  description: string
  accent: string        // ring / glow color
  iconColor: string     // icon fill
  bgTint: string        // subtle bg tint for icon area
}> = {
  error: {
    icon: AlertTriangle,
    code: 'ERROR',
    title: 'เกิดข้อผิดพลาด',
    description: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
    accent: 'ring-red-500/20',
    iconColor: 'text-red-400',
    bgTint: 'from-red-500/[0.06]',
  },
  'not-found': {
    icon: FileQuestion,
    code: '404',
    title: 'ไม่พบหน้าที่ต้องการ',
    description: 'หน้าที่คุณกำลังมองหาไม่มีอยู่หรือถูกย้ายแล้ว',
    accent: 'ring-blue-500/20',
    iconColor: 'text-blue-400',
    bgTint: 'from-blue-500/[0.06]',
  },
  network: {
    icon: WifiOff,
    code: 'OFFLINE',
    title: 'ไม่สามารถเชื่อมต่อได้',
    description: 'การเชื่อมต่อกับเซิร์ฟเวอร์ถูกขัดจังหวะ กรุณาตรวจสอบอินเทอร์เน็ต',
    accent: 'ring-amber-500/20',
    iconColor: 'text-amber-400',
    bgTint: 'from-amber-500/[0.06]',
  },
  permission: {
    icon: ShieldX,
    code: '403',
    title: 'ไม่มีสิทธิ์เข้าถึง',
    description: 'คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้ กรุณาติดต่อผู้ดูแลระบบ',
    accent: 'ring-orange-500/20',
    iconColor: 'text-orange-400',
    bgTint: 'from-orange-500/[0.06]',
  },
  server: {
    icon: ServerCrash,
    code: '500',
    title: 'เซิร์ฟเวอร์ขัดข้อง',
    description: 'ระบบกำลังประสบปัญหา กรุณาลองใหม่ในอีกสักครู่',
    accent: 'ring-red-500/20',
    iconColor: 'text-red-400',
    bgTint: 'from-red-500/[0.06]',
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
}: ErrorPageProps) {
  const navigate = useNavigate()
  const [detailOpen, setDetailOpen] = useState(false)

  const p = PRESETS[variant]
  const Icon = p.icon
  const heading = title ?? p.title
  const desc = description ?? p.description

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      {/* Outer wrapper — subtle radial glow behind card */}
      <div className="relative w-full max-w-[440px]">
        {/* Background glow */}
        <div
          className={`pointer-events-none absolute -inset-12 bg-gradient-radial ${p.bgTint} to-transparent to-70% opacity-60 blur-2xl`}
          aria-hidden
        />

        {/* Card */}
        <div className={`relative overflow-hidden rounded-2xl border border-white/[0.06] bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/40 ring-1 ${p.accent}`}>
          {/* Top gradient band */}
          <div className={`h-[2px] bg-gradient-to-r from-transparent ${p.bgTint.replace('from-', 'via-').replace('/[0.06]', '/40')} to-transparent`} />

          <div className="px-8 pb-8 pt-10 text-center">
            {/* Error code badge */}
            <div className="mb-6 inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                {p.code}
              </span>
            </div>

            {/* Icon with layered rings */}
            <div className="relative mx-auto mb-7 flex h-16 w-16 items-center justify-center">
              {/* Outer pulse ring */}
              <div className={`absolute inset-0 rounded-full ${p.accent} ring-[3px] animate-pulse opacity-40`} />
              {/* Inner circle */}
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm">
                <Icon className={`h-6 w-6 ${p.iconColor}`} strokeWidth={1.5} />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {heading}
            </h1>

            {/* Description */}
            <p className="mx-auto mt-2.5 max-w-[320px] text-[13.5px] leading-relaxed text-muted-foreground">
              {desc}
            </p>

            {/* Separator */}
            <div className="mx-auto my-7 h-px w-16 bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />

            {/* Actions */}
            <div className="flex items-center justify-center gap-3">
              {showHome && (
                <Button
                  onClick={() => navigate('/bookings/timeline')}
                  className="h-9 gap-1.5 rounded-lg px-4 text-[13px] font-medium shadow-lg shadow-primary/20"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  กลับไทม์ไลน์
                </Button>
              )}
              {showReload && (
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="h-9 gap-1.5 rounded-lg border-white/[0.08] bg-white/[0.03] px-4 text-[13px] font-medium text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  โหลดใหม่
                </Button>
              )}
            </div>

            {/* Technical detail (collapsed) */}
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
                  <pre className="mt-3 rounded-lg border border-white/[0.06] bg-black/20 p-3.5 text-left font-mono text-[11px] leading-relaxed text-muted-foreground/70 overflow-auto max-h-28">
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
