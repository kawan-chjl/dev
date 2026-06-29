// WorkspaceDrawer — an edge-anchored slide-in panel that holds the workspace islands so the stage
// stays uninterrupted. Collapsed, only a labeled tab pokes in; hovering peeks the panel out,
// clicking the tab pins it open. Open state is controlled by WorkspaceLayout so it can coordinate
// a single blur backdrop and let the demo tour force a drawer open.

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface WorkspaceDrawerProps {
  side: 'left' | 'right'
  label: string
  open: boolean
  /** Disable the slide transition so a tour-forced open lands at its final rect immediately. */
  instant?: boolean
  onHoverChange: (hovered: boolean) => void
  onToggle: () => void
  children: ReactNode
}

export function WorkspaceDrawer({
  side,
  label,
  open,
  instant,
  onHoverChange,
  onToggle,
  children
}: WorkspaceDrawerProps) {
  // The chevron points "outward" when open (collapse hint) and "inward" when closed (expand hint).
  const Chevron = side === 'left' ? (open ? ChevronLeft : ChevronRight) : open ? ChevronRight : ChevronLeft
  return (
    <aside
      className={`ws-drawer ws-drawer--${side}${open ? ' ws-drawer--open' : ''}${instant ? ' ws-drawer--instant' : ''}`}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <button type="button" className="ws-drawer-tab" aria-expanded={open} onClick={onToggle}>
        <Chevron size={14} aria-hidden="true" />
        <span className="ws-drawer-tab-label">{label}</span>
      </button>
      <div className="ws-drawer-panel">{children}</div>
    </aside>
  )
}
