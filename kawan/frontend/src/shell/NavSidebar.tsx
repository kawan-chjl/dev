// NavSidebar — overlay drawer that opens over content (not push-column).
// On mobile: triggered from Topbar menu button; on desktop: same overlay.
// design.md §6 Zone 1, layer 1.

import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'

interface NavSidebarProps {
  open: boolean
  onClose: () => void
}

const NAV_ITEMS = [
  { to: '/home', label: 'Home', icon: '⌂' },
  { to: '/commitments', label: 'Commitments', icon: '◎' },
  { to: '/timeline', label: 'Timeline', icon: '~' },
  { to: '/settings', label: 'Settings', icon: '⚙' }
]

export function NavSidebar({ open, onClose }: NavSidebarProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      {open && <div className="drawer-backdrop" aria-hidden="true" onClick={onClose} />}
      {/* Drawer panel */}
      <nav className={`nav-drawer ${open ? 'nav-drawer-open' : ''}`} aria-label="Main navigation">
        <div className="nav-drawer-header">
          <span className="nav-drawer-title">Menu</span>
          <button type="button" className="nav-close-btn" aria-label="Close navigation" onClick={onClose}>
            ✕
          </button>
        </div>
        <ul className="nav-list">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                onClick={onClose}
              >
                <span className="nav-link-icon" aria-hidden="true">
                  {icon}
                </span>
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
