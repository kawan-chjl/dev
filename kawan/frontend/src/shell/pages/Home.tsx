// Home: quick-action buttons + Recent Activity.
// Active commitment cards and idle hero removed per PO redesign (redesign/fredoka-home-branding).
// The layout is the same regardless of idle/active state: two quick-access cards + right rail.

import { BarChart2, Briefcase, ClipboardList, Clock } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRecentCommitmentIds } from '../../commitments/recent'
import { statusLabel } from '../../commitments/statusLabel'
import { useCommitments } from '../../commitments/useCommitments'
import { getMockActive, setMockActive } from '../../mock/provider'
import type { Commitment } from '../../types/api'
import { Card } from '../../ui/Card'
import { Chip } from '../../ui/Chip'
import { PageHeader } from '../PageHeader'
import { WorkspacePickerModal } from '../WorkspacePickerModal'

function HomeLayout({ commitments }: { commitments: Commitment[] }) {
  const navigate = useNavigate()
  const [workspaceOpen, setWorkspaceOpen] = useState(false)

  // Recent Activity: recently opened commitments, falling back to all commitments newest-first.
  const recentIds = getRecentCommitmentIds()
  const recentCommitments = recentIds.map((id) => commitments.find((c) => c.id === id)).filter(Boolean) as Commitment[]
  const recentItems = recentCommitments.length > 0 ? recentCommitments : commitments.slice(0, 5)

  return (
    <div className="home-bento-v5">
      {/* Left column: Commitment on top, Analytics + Workspace below */}
      <div className="home-left-col">
        <Card
          className="home-card-commitment"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/commitments')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/commitments')}
          aria-label="View and manage your commitments"
        >
          <div className="home-widget-icon" aria-hidden="true">
            <ClipboardList size={20} color="var(--accent)" />
          </div>
          <p className="home-widget-label">Commitment</p>
          <p className="home-widget-sub">View and manage your commitments.</p>
        </Card>

        <div className="home-left-bottom-row">
          <Card
            className="home-card-small"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/analytics')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/analytics')}
            aria-label="View analytics"
          >
            <div className="home-widget-icon" aria-hidden="true">
              <BarChart2 size={20} color="var(--sage-deep)" />
            </div>
            <p className="home-widget-label">Analytics</p>
            <p className="home-widget-sub">Your check-ins and verdicts over time.</p>
          </Card>

          <Card
            className="home-card-small"
            role="button"
            tabIndex={0}
            onClick={() => setWorkspaceOpen(true)}
            onKeyDown={(e) => e.key === 'Enter' && setWorkspaceOpen(true)}
            aria-label="Open workspace"
          >
            <div className="home-widget-icon" aria-hidden="true">
              <Briefcase size={20} color="var(--clay)" />
            </div>
            <p className="home-widget-label">Workspace</p>
            <p className="home-widget-sub">Talk to Kawan about your commitment.</p>
          </Card>
        </div>
      </div>

      {/* Right: tall Recent Activity rail */}
      <aside className="home-right-rail-v5">
        <Card className="home-rail-card-v5">
          <div className="home-widget-icon" aria-hidden="true">
            <Clock size={20} color="var(--ink-soft)" />
          </div>
          <p className="home-rail-heading-v5">Recent Activity</p>
          {recentItems.length === 0 ? (
            <p className="home-recent-empty">No activity yet. Make your first commitment.</p>
          ) : (
            <ul className="home-recent-list-v5">
              {recentItems.map((c) => (
                <li key={c.id} className="home-recent-item">
                  <button type="button" className="home-recent-btn" onClick={() => navigate(`/commitments/${c.id}`)}>
                    <span className="home-recent-action">{c.action}</span>
                    <Chip variant={c.status === 'active' ? 'sage' : 'default'}>{statusLabel(c.status)}</Chip>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </aside>

      <WorkspacePickerModal open={workspaceOpen} commitments={commitments} onClose={() => setWorkspaceOpen(false)} />
    </div>
  )
}

export function Home() {
  const [mockActive, setLocalMockActive] = useState(getMockActive())
  const { state, commitments, refresh } = useCommitments()

  function toggleMockState() {
    const next = !mockActive
    setMockActive(next)
    setLocalMockActive(next)
    refresh()
  }

  return (
    <div className="shell-page">
      <PageHeader title="Good to have you back." subtitle="Kawan is watching, with your permission." />

      {import.meta.env.DEV && (
        <div className="dev-toggle">
          <button type="button" className="dev-toggle-btn" onClick={toggleMockState}>
            [dev] {mockActive ? 'Active to Idle' : 'Idle to Active'}
          </button>
        </div>
      )}

      {state === 'loading' ? (
        <div className="home-loading">
          <p className="home-loading-text">Loading...</p>
        </div>
      ) : (
        <HomeLayout commitments={commitments} />
      )}
    </div>
  )
}
