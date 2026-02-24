import { useState } from 'react'
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '../lib/utils'
import { useAuth } from '../context/AuthContext'

const navItems = [
  {
    to: '/dashboard',
    label: 'ภาพรวม',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/invoices',
    label: 'ใบเสร็จ',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    to: '/customers',
    label: 'ลูกค้า',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

const Logo = () => (
  <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
  </div>
)

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const closeDrawer = () => setDrawerOpen(false)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ──
          mobile:  full-width drawer (translate off-screen when closed)
          md:      64px icon-only always visible
          lg+:     256px full sidebar always visible
      ── */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-50 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 ease-in-out',
          // Width: full on mobile drawer, 64px on md, 256px on lg+
          'w-64',
          // Mobile: off-screen unless drawerOpen
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
          // md+: always visible at icon width; lg+: label width
          'md:translate-x-0 md:w-16 lg:w-64',
        )}
      >
        {/* Logo row */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100 overflow-hidden">
          <Logo />
          {/* Label: visible in drawer on mobile AND on lg+ */}
          <div className="lg:block md:hidden">
            <p className="text-sm font-bold text-gray-900 whitespace-nowrap">Hideout Resort</p>
            <p className="text-xs text-gray-500 whitespace-nowrap">ระบบใบเสร็จรับเงิน</p>
          </div>
          {/* Close button inside drawer (mobile only) */}
          <button
            type="button"
            onClick={closeDrawer}
            className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors lg:hidden md:hidden"
            aria-label="ปิดเมนู"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeDrawer}
              title={item.label}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                  // Padding: icon-only on md, full on lg+ and in drawer
                  'px-3 py-2.5 md:px-2.5 md:justify-center lg:px-3 lg:justify-start',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              {item.icon}
              <span className="md:hidden lg:inline">{item.label}</span>
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <NavLink
              to="/admin/users"
              onClick={closeDrawer}
              title="จัดการผู้ใช้"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                  'px-3 py-2.5 md:px-2.5 md:justify-center lg:px-3 lg:justify-start',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="md:hidden lg:inline">ผู้ใช้</span>
            </NavLink>
          )}
        </nav>

        {/* Create receipt CTA — text visible in drawer + lg+; hidden on icon-only md */}
        <div className="p-3 border-t border-gray-100">
          <Link
            to="/invoices/new"
            onClick={closeDrawer}
            title="สร้างใบเสร็จ"
            className={cn(
              'btn-primary w-full justify-center',
              location.pathname === '/invoices/new' ? 'opacity-60 pointer-events-none' : '',
              // On md: icon-only circle button; on lg+: full button
              'md:w-10 md:h-10 md:rounded-full md:p-0 lg:w-full lg:h-auto lg:rounded-lg lg:px-4 lg:py-2'
            )}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="md:hidden lg:inline">สร้างใบเสร็จ</span>
          </Link>
        </div>

        {/* User info + logout */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 md:justify-center lg:justify-start">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
              {user?.full_name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0 md:hidden lg:block">
              <p className="text-xs font-medium text-gray-900 truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-400 truncate">@{user?.username}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="ออกจากระบบ"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className={cn(
        'flex flex-col flex-1 min-w-0 overflow-hidden',
        // Leave space for sidebar on md+
        'md:ml-16 lg:ml-64',
      )}>

        {/* Mobile top navbar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="เปิดเมนู"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-sm font-bold text-gray-900">Hideout Resort</span>
          </div>

          {/* Spacer to centre logo */}
          <div className="w-9" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile FAB (create receipt) — shown on all pages except /invoices/new ── */}
      {location.pathname !== '/invoices/new' && (
        <Link
          to="/invoices/new"
          className="md:hidden fixed bottom-6 right-6 z-30 w-14 h-14 bg-brand-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-brand-700 active:bg-brand-900 transition-colors"
          aria-label="สร้างใบเสร็จ"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      )}
    </div>
  )
}
