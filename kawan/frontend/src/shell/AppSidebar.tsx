// AppSidebar — fixed-left hover-expand 64↔200px (desktop) + mobile slide-in drawer.
// design-system.md §4 Layer 1. Behavior mirrors SolarSim AppSidebar but uses plain CSS.

import type { LucideIcon } from 'lucide-react'
import { Clock, Home, ListChecks, Settings, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/home', label: 'Home', icon: Home, exact: true },
  { to: '/commitments', label: 'Commitments', icon: ListChecks },
  { to: '/timeline', label: 'Timeline', icon: Clock },
  { to: '/settings', label: 'Settings', icon: Settings }
]

interface AppSidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

export function AppSidebar({ mobileOpen, onMobileClose }: AppSidebarProps) {
  const { pathname } = useLocation()
  const [backdropVisible, setBackdropVisible] = useState(false)

  const handleMouseEnter = useCallback(() => setBackdropVisible(true), [])
  const handleMouseLeave = useCallback(() => setBackdropVisible(false), [])

  // Body scroll lock while mobile drawer is open
  useEffect(() => {
    if (!mobileOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [mobileOpen])

  // Close mobile drawer on route change.
  // Intentionally only depends on pathname — we want to close on navigate, not on every render.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only fires on pathname change
  useEffect(() => {
    if (mobileOpen) onMobileClose()
  }, [pathname])

  // Escape key closes mobile drawer
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
          <NavLink to="/home" className="sidebar-logo-link" aria-label="Kawan home">
            <img src="/kawan-logo.png" alt="" className="sidebar-logo-img" width={28} height={28} />
            <span className="sidebar-logo-name">Kawan</span>
          </NavLink>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav" aria-label="App navigation">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
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
            <NavLink to="/home" className="mobile-drawer-logo" onClick={onMobileClose}>
              <img src="/kawan-logo.png" alt="" width={28} height={28} />
              <span>Kawan</span>
            </NavLink>
            <button type="button" className="mobile-drawer-close" aria-label="Close navigation" onClick={onMobileClose}>
              <X size={18} />
            </button>
          </div>
          <nav className="mobile-drawer-nav" aria-label="App navigation">
            {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
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
