import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Receipt, Menu } from 'lucide-react'
import { cn } from '../utils'
import { Sheet, SheetContent } from '../ui/sheet'
import { Button } from '../ui/button'
import { SidebarContent } from './Sidebar'

const Logo = () => (
  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
    <Receipt className="w-4 h-4 text-primary-foreground" />
  </div>
)

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
