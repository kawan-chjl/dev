// Topbar — glass fixed bar (Layer 2). design-system.md §4.
// Left: hamburger (mobile) + page title. Right: ThemeToggle + account menu.
// Balance moved into account popover (task #3).

import { LogOut, Menu, Settings } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { MOCK_AUTH } from '../auth/api'
import { useTheme } from '../hooks/useTheme'
import { NotificationBell } from '../notifications/NotificationBell'
import { fetchStats } from '../timeline/api'
import { deriveTitle } from '../timeline/IdentityTitle'
import { ThemeToggle } from '../ui/ThemeToggle'

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
  '/faq': 'FAQ'
}

function usePageTitle(): string {
  const { pathname } = useLocation()
  if (pathname.startsWith('/commitments/')) return 'Commitment'
  return ROUTE_TITLES[pathname] ?? 'Kawan'
}

// Tier chip colors (one per tier, readable in light + dark via CSS variables).
const TIER_COLORS: Record<string, string> = {
  Starter: 'var(--clay)',
  Finisher: 'var(--sage-deep)',
  Shipper: 'var(--accent)',
  'Serial Shipper': 'var(--warning)'
}

const MOCK_WINS = 1

export function Topbar({ onMenuOpen }: TopbarProps) {
  const title = usePageTitle()
  const navigate = useNavigate()
  const { me, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [tierLabel, setTierLabel] = useState<string>('Starter')

  // Guest users: show "Guest" regardless of backend username format.
  const displayName = me?.guest ? 'Guest' : (me?.username ?? 'Guest')
  const balanceDisplay = me?.balance != null ? `$${me.balance.toFixed(2)}` : 'Not set'
  const avatarLetter = displayName.charAt(0).toUpperCase()

  useEffect(() => {
    if (MOCK_AUTH) {
      setTierLabel(deriveTitle(MOCK_WINS).label)
      return
    }
    fetchStats()
      .then((s) => setTierLabel(deriveTitle(s?.verified_wins ?? 0).label))
      .catch(() => setTierLabel('Starter'))
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [menuOpen])

  async function handleSignOut() {
    setMenuOpen(false)
    await signOut()
    navigate('/')
  }

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
      <div className="topbar-right">
        <ThemeToggle theme={theme} onToggle={toggle} />
        <NotificationBell />

        <div className="topbar-popover-wrap" ref={menuRef}>
          <button
            type="button"
            className="topbar-account-btn"
            aria-label="Account menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {avatarLetter}
          </button>

          {menuOpen && (
            <div className="topbar-popover" role="menu">
              <div className="topbar-popover-header">
                <p className="topbar-popover-username">{displayName}</p>
                <span className="topbar-tier-chip" style={{ background: TIER_COLORS[tierLabel] ?? 'var(--clay)' }}>
                  {tierLabel}
                </span>
                <p className="topbar-popover-balance">Chutes balance: {balanceDisplay}</p>
              </div>
              <div className="topbar-popover-body">
                <Link to="/settings" className="topbar-popover-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                  <Settings size={16} aria-hidden="true" />
                  Settings
                </Link>
                <div className="topbar-popover-divider" />
                <button
                  type="button"
                  className="topbar-popover-item topbar-popover-item-danger"
                  role="menuitem"
                  onClick={handleSignOut}
                >
                  <LogOut size={16} aria-hidden="true" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
