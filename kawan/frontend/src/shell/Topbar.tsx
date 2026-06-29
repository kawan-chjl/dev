// Topbar — glass fixed bar (Layer 2). design-system.md §4.
// Left: hamburger (mobile) + page title. Right: ThemeToggle + account menu.
// Balance moved into account popover (task #3).

import { Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { TopbarControls } from './TopbarControls'

interface TopbarProps {
  onMenuOpen: () => void
}

const ROUTE_TITLES: Record<string, string> = {
  '/home': 'Home',
  '/commitments': 'Commitments',
  '/analytics': 'Analytics',
  '/timeline': 'Analytics',
  '/settings': 'Settings',
  '/history': 'History',
  '/faq': 'FAQ',
  '/privacy': 'Privacy'
}

function usePageTitle(): string {
  const { pathname } = useLocation()
  if (pathname.startsWith('/commitments/')) return 'Commitment'
  return ROUTE_TITLES[pathname] ?? 'Kawan'
}

export function Topbar({ onMenuOpen }: TopbarProps) {
  const title = usePageTitle()

  return (
    <header className="topbar">
      {/* Left */}
      <div className="topbar-left">
        <button type="button" className="topbar-menu-btn" aria-label="Open navigation menu" onClick={onMenuOpen}>
          <Menu size={20} />
        </button>
        <h1 className="topbar-title">{title}</h1>
      </div>

      {/* Right */}
      <TopbarControls />
    </header>
  )
}
