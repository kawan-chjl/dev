// ShellLayout — Zone 1 SaaS shell layout route.
// Wraps /home, /commitments, /commitments/:id, /timeline, /settings, /settings/audit.
// Four-layer stack: nav drawer (overlay) + topbar + scrolling content + reveal footer.
// design.md §6 Zone 1.

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { BottomTabBar } from './BottomTabBar'
import { NavSidebar } from './NavSidebar'
import { ScrollRevealFooter } from './ScrollRevealFooter'
import { Topbar } from './Topbar'

export function ShellLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="shell-root">
      {/* Layer 1: overlay nav drawer */}
      <NavSidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Layer 2: topbar */}
      <Topbar onMenuOpen={() => setDrawerOpen(true)} />

      {/* Layer 3: scrolling content plane */}
      <main className="shell-content" id="main-content">
        <Outlet />
        {/* Layer 4: footer revealed at end of scroll */}
        <ScrollRevealFooter />
      </main>

      {/* Mobile-only bottom tab bar */}
      <BottomTabBar />
    </div>
  )
}
