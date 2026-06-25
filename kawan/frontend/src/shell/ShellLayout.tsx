// ShellLayout — Zone 1 SaaS shell. 4-layer: sidebar + topbar + content + footer.
// Footer uses the proofrank foldover mechanic: .page-scroll sits z-index:1 on top of
// the fixed footer (z-index:0), then scrolls up to reveal it at the bottom margin.
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

      {/* Layer 4: footer — fixed behind, revealed by scrolling */}
      <ScrollRevealFooter />

      {/* Layer 3: content — sits on top of footer, scrolls up past margin-bottom to reveal it */}
      <main className="shell-content" id="main-content">
        <div className="page-scroll">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <BottomTabBar />
    </div>
  )
}
