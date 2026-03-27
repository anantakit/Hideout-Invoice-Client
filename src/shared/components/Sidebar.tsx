import { useId, useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  BedDouble,
  CalendarRange,
  DoorOpen,
  FileText,
  LogOut,
  Moon,
  Sun,
  UserCog,
  Users,
} from 'lucide-react'
import { cn } from '@/shared/utils'
import { useAuth } from '@/app/providers/AuthProvider'
import { useTheme } from '@/app/providers/ThemeProvider'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItemConfig {
  to: string
  label: string
  icon: React.ElementType
  /**
   * When true, only renders for users with role === 'admin'.
   * Applied at the item level — a section with all admin-only items
   * is automatically suppressed for non-admin users.
   */
  requireAdmin?: boolean
  /**
   * Passed to NavLink's `end` prop.
   * Must be true for items whose `to` is a prefix of other routes
   * (e.g. `/bookings` would otherwise match `/bookings/new`).
   */
  end?: boolean
}

interface NavSectionConfig {
  id: string
  label: string
  items: NavItemConfig[]
}

// ── Navigation structure ───────────────────────────────────────────────────────
//
// HOW TO ADD A NEW MODULE:
//
//   1. Add an item to an existing section:
//        { to: '/housekeeping', label: 'Housekeeping', icon: Sparkles, end: true }
//
//   2. Or add a new section at the end of NAV_SECTIONS:
//        { id: 'housekeeping', label: 'Housekeeping', items: [...] }
//
//   No other code needs to change.

const NAV_SECTIONS: NavSectionConfig[] = [
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { to: '/timeline', label: 'ไทม์ไลน์', icon: CalendarRange, end: true },
      { to: '/bookings',          label: 'การจอง',    icon: BedDouble },
    ],
  },
  {
    id: 'management',
    label: 'Management',
    items: [
      { to: '/customers',    label: 'ลูกค้า', icon: Users,    end: true },
      { to: '/admin/rooms', label: 'ห้องพัก', icon: DoorOpen, end: true, requireAdmin: true },
      { to: '/admin/users', label: 'ผู้ใช้',  icon: UserCog,  end: true, requireAdmin: true },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { to: '/dashboard', label: 'รายได้',   icon: BarChart3, end: true },
      { to: '/receipts',  label: 'ใบเสร็จ', icon: FileText },
    ],
  },
]

// ── Logo ──────────────────────────────────────────────────────────────────────

/** Shared logo mark — 3D isometric H with flowing blue gradient. */
export function Logo({ className = 'w-8 h-8' }: { className?: string }) {
  const uid = useId()
  const f = `${uid}-f`
  const t = `${uid}-t`
  const s = `${uid}-s`

  return (
    <div className={`${className} shrink-0`}>
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full" aria-hidden>
        <defs>
          <linearGradient id={f} x1="15" y1="50" x2="89" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1838A8" />
            <stop offset="35%" stopColor="#3562E0" />
            <stop offset="70%" stopColor="#7BA4FF" />
            <stop offset="100%" stopColor="#E4EDFF" />
          </linearGradient>
          <linearGradient id={t} x1="15" y1="50" x2="89" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5078F0" />
            <stop offset="35%" stopColor="#6B94FF" />
            <stop offset="70%" stopColor="#A8CCFF" />
            <stop offset="100%" stopColor="#F2F6FF" />
          </linearGradient>
          <linearGradient id={s} x1="15" y1="50" x2="89" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0E2278" />
            <stop offset="35%" stopColor="#1E3FA8" />
            <stop offset="70%" stopColor="#4468C0" />
            <stop offset="100%" stopColor="#8898B8" />
          </linearGradient>
        </defs>
        {/* Left Pillar */}
        <path d="M29,19 L31,17 L31,81 L29,83 Z" fill={`url(#${s})`} />
        <path d="M15,19 L29,19 L31,17 L17,17 Z" fill={`url(#${t})`} />
        <path d="M15,19 L29,19 L29,83 L15,83 Z" fill={`url(#${f})`} />
        {/* Right Pillar */}
        <path d="M87,19 L89,17 L89,81 L87,83 Z" fill={`url(#${s})`} />
        <path d="M73,19 L87,19 L89,17 L75,17 Z" fill={`url(#${t})`} />
        <path d="M73,19 L87,19 L87,83 L73,83 Z" fill={`url(#${f})`} />
        {/* Crossbar */}
        <path d="M73,44 L75,42 L75,56 L73,58 Z" fill={`url(#${s})`} />
        <path d="M29,44 L73,44 L75,42 L31,42 Z" fill={`url(#${t})`} />
        <path d="M29,44 L73,44 L73,58 L29,58 Z" fill={`url(#${f})`} />
      </svg>
    </div>
  )
}

// ── SectionTitle ──────────────────────────────────────────────────────────────
//
// Hidden on the icon-only md sidebar; visible on lg+ and inside the mobile
// Sheet where viewport is below md breakpoint.

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-3 pb-1 text-xs font-semibold tracking-widest uppercase text-muted-foreground md:hidden xl:block">
      {children}
    </p>
  )
}

// ── NavItem ───────────────────────────────────────────────────────────────────

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  onClose,
}: NavItemConfig & { onClose?: () => void }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClose}
      title={label}
      aria-label={label}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 radius-button text-sm font-medium transition-colors',
          'px-3 py-2.5 md:px-2.5 md:justify-center xl:px-3 xl:justify-start',
          isActive
            ? 'bg-primary/15 text-primary border-l-2 border-l-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )
      }
    >
      <Icon className="w-5 h-5 shrink-0" aria-hidden />
      <span className="md:hidden xl:inline">{label}</span>
    </NavLink>
  )
}

// ── ThemeToggle ───────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'
  const toggle = () => setTheme(isDark ? 'light' : 'dark')

  return (
    <div className="px-3 py-2 border-t border-border-soft">
      {/* Expanded view (mobile sheet + xl desktop) */}
      <div className="md:hidden xl:block">
        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          aria-label="เปลี่ยนธีม"
        >
          <span className="flex items-center gap-2">
            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            {isDark ? 'มืด' : 'สว่าง'}
          </span>
          <span className="text-xs text-muted-foreground/60">
            {isDark ? 'เปลี่ยนเป็นสว่าง' : 'เปลี่ยนเป็นมืด'}
          </span>
        </button>
      </div>
      {/* Icon-only view (md sidebar) */}
      <div className="hidden md:flex xl:hidden justify-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          title={isDark ? 'เปลี่ยนเป็นสว่าง' : 'เปลี่ยนเป็นมืด'}
          aria-label="เปลี่ยนธีม"
          className="text-muted-foreground"
        >
          {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}

// ── SidebarContent ────────────────────────────────────────────────────────────

export function SidebarContent({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const visibleSections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => !item.requireAdmin || user?.role === 'admin',
        ),
      })).filter((section) => section.items.length > 0),
    [user?.role],
  )

  return (
    <div className="flex flex-col h-full">

      {/* ── Wordmark ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border-soft overflow-hidden">
        <Logo />
        <div className="flex-1 min-w-0 md:hidden xl:block">
          <p className="text-sm font-bold text-foreground whitespace-nowrap">Hideout Resort</p>
          <p className="text-helper whitespace-nowrap">Hotel Operations</p>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto" aria-label="Main navigation">
        {visibleSections.map((section, index) => (
          <div key={section.id}>
            {index > 0 && (
              <div className="py-2 md:hidden xl:block">
                <Separator />
              </div>
            )}
            <SectionTitle>{section.label}</SectionTitle>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem key={item.to} {...item} onClose={onClose} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Theme toggle ───────────────────────────────────────────────── */}
      <ThemeToggle />

      {/* ── User + logout ─────────────────────────────────────────────────── */}
      <div className="p-3 border-t border-border-soft">
        <div className="flex items-center gap-2 md:justify-center xl:justify-start">
          <div className="w-8 h-8 radius-badge bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 select-none">
            {user?.full_name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0 md:hidden xl:block">
            <p className="text-xs font-medium text-foreground truncate">{user?.full_name}</p>
            <p className="text-helper truncate">@{user?.username}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="ออกจากระบบ"
            aria-label="ออกจากระบบ"
            className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

    </div>
  )
}
