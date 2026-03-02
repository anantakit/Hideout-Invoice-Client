import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  BarChart2,
  CalendarDays,
  LogOut,
  Plus,
  Receipt,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/shared/utils'
import { useAuth } from '@/app/providers/AuthProvider'
import { Separator } from '@/shared/ui/separator'

// ─── Logo ─────────────────────────────────────────────────────────────────────

const Logo = () => (
  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
    <Receipt className="w-4 h-4 text-primary-foreground" />
  </div>
)

// ─── SectionTitle ─────────────────────────────────────────────────────────────

// Hidden on the icon-only md sidebar; visible on lg+ and in the mobile sheet.
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase text-muted-foreground md:hidden lg:block">
      {children}
    </p>
  )
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

interface NavItemProps {
  to: string
  label: string
  icon: React.ElementType
  onClose?: () => void
}

function NavItem({ to, label, icon: Icon, onClose }: NavItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onClose}
      title={label}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
          'px-3 py-2.5 md:px-2.5 md:justify-center lg:px-3 lg:justify-start',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )
      }
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="md:hidden lg:inline">{label}</span>
    </NavLink>
  )
}

// ─── SidebarContent ───────────────────────────────────────────────────────────

export function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border overflow-hidden">
        <Logo />
        <div className="lg:block md:hidden">
          <p className="text-sm font-bold text-foreground whitespace-nowrap">Hideout Resort</p>
          <p className="text-xs text-muted-foreground whitespace-nowrap">ระบบใบเสร็จรับเงิน</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors lg:hidden md:hidden"
            aria-label="ปิดเมนู"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-0.5">

        {/* ── OPERATIONS section ────────────────────────────────────────── */}
        <SectionTitle>Operations</SectionTitle>

        <NavItem to="/operations/today" label="วันนี้"             icon={Activity}    onClose={onClose} />
        <NavItem to="/bookings"         label="การจอง"             icon={CalendarDays} onClose={onClose} />
        <NavItem to="/occupancy/month"  label="ปฏิทินรายเดือน"    icon={BarChart2}    onClose={onClose} />

        {/* ── Divider ───────────────────────────────────────────────────── */}
        <div className="py-2 md:hidden lg:block">
          <Separator />
        </div>

        {/* ── MANAGEMENT section ────────────────────────────────────────── */}
        <SectionTitle>Management</SectionTitle>

        <NavItem to="/receipts"  label="ใบเสร็จ" icon={Receipt} onClose={onClose} />
        <NavItem to="/customers" label="ลูกค้า"  icon={Users}   onClose={onClose} />

        {user?.role === 'admin' && (
          <NavItem to="/admin/users" label="ผู้ใช้" icon={UserCog} onClose={onClose} />
        )}

      </nav>

      {/* ── Create receipt CTA ───────────────────────────────────────────── */}
      <div className="p-3 border-t border-border">
        <Link
          to="/receipts/new"
          onClick={onClose}
          title="สร้างใบเสร็จ"
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 w-full px-4 py-2',
            location.pathname === '/receipts/new' ? 'opacity-60 pointer-events-none' : '',
            'md:w-10 md:h-10 md:rounded-full md:p-0 lg:w-full lg:h-auto lg:rounded-lg lg:px-4 lg:py-2',
          )}
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="md:hidden lg:inline">สร้างใบเสร็จ</span>
        </Link>
      </div>

      {/* ── User info + logout ───────────────────────────────────────────── */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 md:justify-center lg:justify-start">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
            {user?.full_name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0 md:hidden lg:block">
            <p className="text-xs font-medium text-foreground truncate">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="ออกจากระบบ"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  )
}
