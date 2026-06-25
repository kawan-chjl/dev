// PageHeader — reusable warm page header container.
// title + optional subtitle + optional right-aligned actions slot.
// Used at the top of every shell page for consistent header rhythm.

import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="page-header-card">
      <div className="page-header-card-body">
        <div className="page-header-card-text">
          <h2 className="page-header-card-title">{title}</h2>
          {subtitle && <p className="page-header-card-sub">{subtitle}</p>}
        </div>
        {actions && <div className="page-header-card-actions">{actions}</div>}
      </div>
    </div>
  )
}
