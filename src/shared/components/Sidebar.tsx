import { useMemo } from 'react'
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
      { to: '/receipts',  label: 'ใบเสร็จ', icon: FileText,  end: true },
    ],
  },
]

// ── Logo ──────────────────────────────────────────────────────────────────────

/** Shared logo mark — used by both the sidebar and the mobile top bar. */
export function Logo() {
  return (
    <div className="w-8 h-8 shrink-0">
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full" aria-hidden>
        <rect width="100" height="100" rx="22" fill="hsl(224 18% 12%)" />
        <rect x=".5" y=".5" width="99" height="99" rx="21.5" fill="none" stroke="hsl(222 85% 64% / .06)" strokeWidth="1" />
        <rect x="24" y="22" width="10" height="56" rx="3" fill="hsl(222 80% 62%)" />
        <rect x="66" y="22" width="10" height="56" rx="3" fill="hsl(222 80% 62%)" />
        <rect x="34" y="44" width="32" height="8" rx="2" fill="hsl(222 80% 62%)" opacity=".6" />
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
