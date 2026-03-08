import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { cn } from '../utils'
import { Sheet, SheetContent, SheetTitle } from '../ui/sheet'
import { Button } from '../ui/button'
import { SidebarContent, Logo } from './Sidebar'

export default function Layout() {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Mobile sheet sidebar ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="p-0 w-64 lg:hidden" aria-describedby={undefined}>
          <SheetTitle className="sr-only">เมนูนำทาง</SheetTitle>
          <SidebarContent onClose={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* ── Desktop sidebar ── */}
      <aside className={cn(
        'hidden md:flex flex-col fixed top-0 left-0 h-full z-40 bg-sidebar border-r border-border-soft',
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
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar border-b border-border-soft shrink-0">
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
