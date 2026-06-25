// AppSidebar — fixed-left hover-expand 64↔200px (desktop) + mobile slide-in drawer.
// v4: two groups — Dashboard (Home, Commitments, Analytics) and Essentials (History, FAQ, Settings).
// design-system.md §4 Layer 1. Behavior mirrors SolarSim AppSidebar but uses plain CSS.

import type { LucideIcon } from 'lucide-react'
import { BarChart2, HelpCircle, History, Home, ListChecks, Settings, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

interface NavGroup {
  heading: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Dashboard',
    items: [
      { to: '/home', label: 'Home', icon: Home, exact: true },
      { to: '/commitments', label: 'Commitments', icon: ListChecks },
      { to: '/analytics', label: 'Analytics', icon: BarChart2 }
    ]
  },
  {
    heading: 'Essentials',
    items: [
      { to: '/history', label: 'History', icon: History },
      { to: '/faq', label: 'FAQ', icon: HelpCircle },
      { to: '/settings', label: 'Settings', icon: Settings }
    ]
  }
]

// Flat list for mobile drawer (same order, same items)
const ALL_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)

interface AppSidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

export function AppSidebar({ mobileOpen, onMobileClose }: AppSidebarProps) {
  const { pathname } = useLocation()
  const [backdropVisible, setBackdropVisible] = useState(false)

  const handleMouseEnter = useCallback(() => setBackdropVisible(true), [])
  const handleMouseLeave = useCallback(() => setBackdropVisible(false), [])

  useEffect(() => {
    if (!mobileOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [mobileOpen])

  // biome-ignore lint/correctness/useExhaustiveDependencies: only fires on pathname change
  useEffect(() => {
    if (mobileOpen) onMobileClose()
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onMobileClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen, onMobileClose])

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        data-sidebar
        className="app-sidebar"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label="Main navigation"
      >
        {/* Logo strip */}
        <div className="sidebar-logo-strip">
          <Link to="/?bypass=1" className="sidebar-logo-link" aria-label="Go to landing page">
            <img src="/kawan-logo.png" alt="" className="sidebar-logo-img" width={36} height={36} />
            <span className="sidebar-logo-name">Kawan</span>
          </Link>
        </div>

        {/* Nav — two grouped sections */}
        <nav className="sidebar-nav" aria-label="App navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.heading} className="sidebar-section">
              <div className="sidebar-section-heading" aria-hidden="true">
                <span className="sidebar-section-line" />
                <span className="sidebar-section-label">{group.heading}</span>
              </div>
              {group.items.map(({ to, label, icon: Icon, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
                  aria-label={label}
                >
                  <span className="sidebar-link-icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className="sidebar-link-label">{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Desktop expanded backdrop */}
      <div
        className={`sidebar-backdrop${backdropVisible ? ' sidebar-backdrop-visible' : ''}`}
        onClick={() => setBackdropVisible(false)}
        aria-hidden="true"
      />

      {/* ── Mobile drawer ── */}
      <div
        className={`mobile-drawer-container${mobileOpen ? ' mobile-drawer-container-open' : ''}`}
        aria-hidden={!mobileOpen}
      >
        <div className="mobile-drawer-backdrop" onClick={onMobileClose} aria-hidden="true" />
        <aside className="mobile-drawer">
          <div className="mobile-drawer-header">
            <Link to="/?bypass=1" className="mobile-drawer-logo" onClick={onMobileClose}>
              <img src="/kawan-logo.png" alt="" width={36} height={36} />
              <span>Kawan</span>
            </Link>
            <button type="button" className="mobile-drawer-close" aria-label="Close navigation" onClick={onMobileClose}>
              <X size={18} />
            </button>
          </div>
          <nav className="mobile-drawer-nav" aria-label="App navigation">
            {ALL_ITEMS.map(({ to, label, icon: Icon, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) => `mobile-drawer-link${isActive ? ' mobile-drawer-link-active' : ''}`}
                onClick={onMobileClose}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
      </div>
    </>
  )
}
