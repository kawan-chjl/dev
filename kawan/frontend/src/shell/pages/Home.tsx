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
import { Skeleton } from '../../ui/Skeleton'
import { PageHeader } from '../PageHeader'
import { WorkspacePickerModal } from '../WorkspacePickerModal'

const HOME_ILLUSTRATIONS = {
  commitment: '/illustrations/commitment-card.webp',
  analytics: '/illustrations/analytics-card.webp',
  workspace: '/illustrations/workspace-card.webp',
  recentActivity: '/illustrations/recent-activity-card.webp'
}

function HomeSkeleton() {
  return (
    <div className="home-bento-v5" aria-hidden="true">
      <div className="home-left-col">
        <Card className="home-card-commitment">
          <div className="skeleton-card-content">
            <Skeleton variant="circle" width={36} height={36} />
            <Skeleton variant="text" width="38%" height={18} />
            <Skeleton variant="text" width="76%" />
          </div>
        </Card>
        <div className="home-left-bottom-row">
          {[0, 1].map((index) => (
            <Card key={index} className="home-card-small">
              <div className="skeleton-card-content">
                <Skeleton variant="circle" width={36} height={36} />
                <Skeleton variant="text" width="52%" height={18} />
                <Skeleton variant="text" width="88%" />
              </div>
            </Card>
          ))}
        </div>
      </div>
      <aside className="home-right-rail-v5">
        <Card className="home-rail-card-v5">
          <Skeleton variant="circle" width={36} height={36} />
          <Skeleton variant="text" width="58%" height={18} />
          <Skeleton variant="text" count={5} />
        </Card>
      </aside>
    </div>
  )
}

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
          <div className="home-card-copy">
            <div className="home-widget-icon" aria-hidden="true">
              <ClipboardList size={20} color="var(--accent)" />
            </div>
            <p className="home-widget-label">Commitment</p>
            <p className="home-widget-sub">View and manage your commitments.</p>
          </div>
          <img
            className="home-card-illustration home-card-illustration-wide"
            src={HOME_ILLUSTRATIONS.commitment}
            alt=""
            aria-hidden="true"
          />
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
            <div className="home-card-copy">
              <div className="home-widget-icon" aria-hidden="true">
                <BarChart2 size={20} color="var(--sage-deep)" />
              </div>
              <p className="home-widget-label">Analytics</p>
              <p className="home-widget-sub">Your check-ins and verdicts over time.</p>
            </div>
            <img className="home-card-illustration" src={HOME_ILLUSTRATIONS.analytics} alt="" aria-hidden="true" />
          </Card>

          <Card
            className="home-card-small"
            role="button"
            tabIndex={0}
            onClick={() => setWorkspaceOpen(true)}
            onKeyDown={(e) => e.key === 'Enter' && setWorkspaceOpen(true)}
            aria-label="Open workspace"
          >
            <div className="home-card-copy">
              <div className="home-widget-icon" aria-hidden="true">
                <Briefcase size={20} color="var(--clay)" />
              </div>
              <p className="home-widget-label">Workspace</p>
              <p className="home-widget-sub">Talk to Kawan about your commitment.</p>
            </div>
            <img className="home-card-illustration" src={HOME_ILLUSTRATIONS.workspace} alt="" aria-hidden="true" />
          </Card>
        </div>
      </div>

      {/* Right: tall Recent Activity rail */}
      <aside className="home-right-rail-v5">
        <Card className="home-rail-card-v5">
          <div className="home-card-copy home-rail-copy">
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
          </div>
          <img
            className="home-card-illustration home-rail-illustration"
            src={HOME_ILLUSTRATIONS.recentActivity}
            alt=""
            aria-hidden="true"
          />
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

      {state === 'loading' ? <HomeSkeleton /> : <HomeLayout commitments={commitments} />}
    </div>
  )
}
