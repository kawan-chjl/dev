// Topbar — app header: logo, context title, account affordance, menu button.
// design.md §6 Zone 1, layer 2.

import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

interface TopbarProps {
  onMenuOpen: () => void
}

const ROUTE_TITLES: Record<string, string> = {
  '/home': 'Home',
  '/commitments': 'Commitments',
  '/timeline': 'Timeline',
  '/settings': 'Settings',
  '/settings/audit': 'Audit Log'
}

function useRouteTitle(): string {
  const { pathname } = useLocation()
  // Match /commitments/:id as well
  if (pathname.startsWith('/commitments/')) return 'Commitment'
  return ROUTE_TITLES[pathname] ?? 'Kawan'
}

export function Topbar({ onMenuOpen }: TopbarProps) {
  const title = useRouteTitle()
  const { me } = useAuth()
  const balanceDisplay = me?.balance != null ? `$${me.balance.toFixed(2)}` : '—'

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="topbar-menu-btn" aria-label="Open navigation menu" onClick={onMenuOpen}>
          <span aria-hidden="true">☰</span>
        </button>
        <Link to="/home" className="topbar-logo" aria-label="Kawan home">
          <img src="/kawan-logo.png" alt="" width={28} height={28} />
          <span className="topbar-logo-text">Kawan</span>
        </Link>
      </div>
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-account">
        <span className="topbar-balance" title="Chutes balance">
          {balanceDisplay}
        </span>
        <span className="topbar-username">{me?.username ?? ''}</span>
      </div>
    </header>
  )
}
