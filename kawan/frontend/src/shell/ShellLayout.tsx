// ShellLayout — Zone 1 SaaS shell. 4-layer: sidebar + topbar + content + footer.
// design-system.md §4.

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import { BottomTabBar } from './BottomTabBar'
import { ScrollRevealFooter } from './ScrollRevealFooter'
import { Topbar } from './Topbar'

export function ShellLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="shell-root">
      {/* Ambient blur blobs (behind everything) */}
      <div className="shell-blobs" aria-hidden="true">
        <div className="shell-blob shell-blob-accent" />
        <div className="shell-blob shell-blob-sage" />
      </div>

      {/* Layer 1: sidebar */}
      <AppSidebar mobileOpen={drawerOpen} onMobileClose={() => setDrawerOpen(false)} />

      {/* Layer 2: topbar */}
      <Topbar onMenuOpen={() => setDrawerOpen(true)} />

      {/* Layer 3: content */}
      <main className="shell-content" id="main-content">
        <Outlet />
        {/* Layer 4: footer at end of scroll */}
        <ScrollRevealFooter />
      </main>

      {/* Mobile bottom tab bar */}
      <BottomTabBar />
    </div>
  )
}
