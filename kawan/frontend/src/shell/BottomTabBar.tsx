// BottomTabBar — mobile-only bottom navigation (≤768px). design-system.md §4.

import type { LucideIcon } from 'lucide-react'
import { Clock, Home, ListChecks, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'

interface TabItem {
  to: string
  label: string
  icon: LucideIcon
}

const TAB_ITEMS: TabItem[] = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/commitments', label: 'Commitments', icon: ListChecks },
  { to: '/timeline', label: 'Timeline', icon: Clock },
  { to: '/settings', label: 'Settings', icon: Settings }
]

export function BottomTabBar() {
  return (
    <nav className="bottom-tab-bar" aria-label="Main navigation">
      <ul className="bottom-tab-list">
        {TAB_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="bottom-tab-item">
            <NavLink
              to={to}
              className={({ isActive }) => `bottom-tab-link${isActive ? ' bottom-tab-link-active' : ''}`}
            >
              <span className="bottom-tab-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <span className="bottom-tab-label">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
