import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Receipt,
  Users,
  UserCog,
  Plus,
  LogOut,
  X,
  Menu,
} from 'lucide-react'
import { cn } from '../utils'
import { useAuth } from '../../app/providers/AuthProvider'
import { Sheet, SheetContent } from '../ui/sheet'
import { Button } from '../ui/button'
import { useState } from 'react'

const navItems = [
  { to: '/dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
  { to: '/receipts', label: 'ใบเสร็จ', icon: Receipt },
  { to: '/customers', label: 'ลูกค้า', icon: Users },
]

const Logo = () => (
  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
    <Receipt className="w-4 h-4 text-primary-foreground" />
  </div>
)

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo row */}
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

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              title={item.label}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                  'px-3 py-2.5 md:px-2.5 md:justify-center lg:px-3 lg:justify-start',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="md:hidden lg:inline">{item.label}</span>
            </NavLink>
          )
        })}

        {user?.role === 'admin' && (
          <NavLink
            to="/admin/users"
            onClick={onClose}
            title="จัดการผู้ใช้"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                'px-3 py-2.5 md:px-2.5 md:justify-center lg:px-3 lg:justify-start',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <UserCog className="w-5 h-5 shrink-0" />
            <span className="md:hidden lg:inline">ผู้ใช้</span>
          </NavLink>
        )}
      </nav>

      {/* Create receipt CTA */}
      <div className="p-3 border-t border-border">
        <Link
          to="/receipts/new"
          onClick={onClose}
          title="สร้างใบเสร็จ"
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 w-full px-4 py-2',
            location.pathname === '/invoices/new' ? 'opacity-60 pointer-events-none' : '',
            'md:w-10 md:h-10 md:rounded-full md:p-0 lg:w-full lg:h-auto lg:rounded-lg lg:px-4 lg:py-2'
          )}
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="md:hidden lg:inline">สร้างใบเสร็จ</span>
        </Link>
      </div>

      {/* User info + logout */}
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

export default function Layout() {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Mobile sheet sidebar ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="p-0 w-64 lg:hidden">
          <SidebarContent onClose={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* ── Desktop sidebar ── */}
      <aside className={cn(
        'hidden md:flex flex-col fixed top-0 left-0 h-full z-40 bg-card border-r border-border',
        'md:w-16 lg:w-64',
      )}>
        <SidebarContent />
      </aside>

      {/* ── Main area ── */}
      <div className={cn(
        'flex flex-col flex-1 min-w-0 overflow-hidden',
        'md:ml-16 lg:ml-64',
      )}>

        {/* Mobile top navbar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSheetOpen(true)}
            aria-label="เปิดเมนู"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-sm font-bold text-foreground">Hideout Resort</span>
          </div>

          <div className="w-9" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

    </div>
  )
}
