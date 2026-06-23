// BottomTabBar — mobile-only bottom navigation (≤ --bp-mobile).
// design.md §6 Zone 1, layer 1 (mobile variant).
// Hidden on desktop via CSS media query.

import { NavLink } from 'react-router-dom'

const TAB_ITEMS = [
  { to: '/home', label: 'Home', icon: '⌂' },
  { to: '/commitments', label: 'Commitments', icon: '◎' },
  { to: '/timeline', label: 'Timeline', icon: '~' },
  { to: '/settings', label: 'Settings', icon: '⚙' }
]

export function BottomTabBar() {
  return (
    <nav className="bottom-tab-bar" aria-label="Main navigation">
      <ul className="bottom-tab-list">
        {TAB_ITEMS.map(({ to, label, icon }) => (
          <li key={to} className="bottom-tab-item">
            <NavLink
              to={to}
              className={({ isActive }) => `bottom-tab-link ${isActive ? 'bottom-tab-link-active' : ''}`}
            >
              <span className="bottom-tab-icon" aria-hidden="true">
                {icon}
              </span>
              <span className="bottom-tab-label">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
