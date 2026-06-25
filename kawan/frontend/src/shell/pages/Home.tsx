// Home — v4 bento dashboard.
// Active: active commitment cards (cap 3, "View all" link) + Workspace + Recent Activity + right rail.
// Idle: warm inviting hero + how-it-works strip.
// Supports N active commitments per the PO override (Gate 1, 2026-06-26).
// No balance card (moved to topbar popover). No stats row (moved to /commitments).

import { BarChart2, Clock, ListChecks, Sparkles, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getRecentCommitmentIds } from '../../commitments/recent'
import { useCommitments } from '../../commitments/useCommitments'
import { getMockActive, setMockActive } from '../../mock/provider'
import { verifiedCount } from '../../timeline/metrics'
import { useTimeline } from '../../timeline/useTimeline'
import type { Commitment, CommitmentStatus } from '../../types/api'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Chip } from '../../ui/Chip'
import { PageHeader } from '../PageHeader'
import { WorkspacePickerModal } from '../WorkspacePickerModal'

// Duplicated from Commitments.tsx — tiny constant, not worth a shared module yet.
const ONGOING_STATUSES: CommitmentStatus[] = ['active', 'lapsed', 'verifying', 'grace']

// Cap for active cards on Home. Keeps the layout calm with many active commitments.
const HOME_ACTIVE_CAP = 3

function formatDeadline(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'Past deadline'
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return '1 day left'
  return `${diffDays} days left`
}

function IdleState({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="home-idle-v2">
      <div className="home-idle-hero">
        <div className="home-idle-eye-wrap" aria-hidden="true">
          <Sparkles size={48} color="var(--accent)" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <h1 className="home-idle-heading-v2">
          Make a <em className="home-idle-em">commitment.</em>
        </h1>
        <p className="home-idle-sub-v2">
          Make a commitment Kawan will actually check. Real, verifiable, yours. It won't believe you until you prove it.
        </p>
        <Button variant="accent" className="home-idle-cta" onClick={onCompose}>
          Make a commitment
        </Button>
      </div>

      <div className="home-how-strip">
        <Card className="home-how-card">
          <div className="home-how-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                stroke="var(--accent)"
                strokeWidth="1.8"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
          <p className="home-how-title">You commit</p>
          <p className="home-how-desc">One goal, one deadline, one evidence source. Kawan keeps score.</p>
        </Card>
        <Card className="home-how-card">
          <div className="home-how-icon" aria-hidden="true">
            <ListChecks size={24} color="var(--sage-deep)" aria-hidden="true" />
          </div>
          <p className="home-how-title">Kawan verifies</p>
          <p className="home-how-desc">Evidence is checked, not trusted. Self-report is not accepted.</p>
        </Card>
        <Card className="home-how-card">
          <div className="home-how-icon" aria-hidden="true">
            <Clock size={24} color="var(--clay)" aria-hidden="true" />
          </div>
          <p className="home-how-title">Momentum builds</p>
          <p className="home-how-desc">Each verified check-in earns trust. Missing one tells its own story.</p>
        </Card>
      </div>
    </div>
  )
}

// Single active commitment card — used in the Home active cards grid.
function ActiveCommitmentCard({ commitment }: { commitment: Commitment }) {
  const navigate = useNavigate()
  const { timeline } = useTimeline(commitment.id)
  const events = timeline?.events ?? []
  const verified = verifiedCount(events)

  return (
    <Card
      className="home-card-commitment home-active-card"
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/commitments/${commitment.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/commitments/${commitment.id}`)}
      aria-label={`View commitment: I will ${commitment.action} ${commitment.deliverable}`}
    >
      <div className="home-widget-icon" aria-hidden="true">
        <ListChecks size={20} color="var(--accent)" />
      </div>
      <p className="home-widget-sentence">
        I will <strong>{commitment.action}</strong>{' '}
        <span className="home-widget-deliverable">{commitment.deliverable}</span>
      </p>
      <div className="home-widget-meta">
        <Chip variant="default">
          <Clock size={11} aria-hidden="true" />
          {formatDeadline(commitment.deadline)}
        </Chip>
      </div>
      <div className="home-widget-stat">
        <span className="home-widget-stat-number">{verified}</span>
        <span className="home-widget-stat-label">verified</span>
      </div>
    </Card>
  )
}

interface ActiveStateProps {
  commitments: Commitment[]
}

function ActiveState({ commitments }: ActiveStateProps) {
  const navigate = useNavigate()
  const [workspaceOpen, setWorkspaceOpen] = useState(false)

  // Active commitments, newest first (list is already newest-first from the API).
  const activeCommitments = commitments.filter((c) => ONGOING_STATUSES.includes(c.status))
  // Cap for calm; "View all" appears when there are more.
  const visibleActive = activeCommitments.slice(0, HOME_ACTIVE_CAP)
  const hasMore = activeCommitments.length > HOME_ACTIVE_CAP

  // Recent Activity: recently opened commitments, falling back to visible active ones.
  const recentIds = getRecentCommitmentIds()
  const recentCommitments = recentIds.map((id) => commitments.find((c) => c.id === id)).filter(Boolean) as Commitment[]
  const recentItems = recentCommitments.length > 0 ? recentCommitments : visibleActive

  return (
    <div className="home-bento-v5">
      {/* Left column: active commitment cards + two smaller quick-access cards */}
      <div className="home-left-col">
        {/* Active commitment cards grid */}
        <div className="home-active-cards">
          {visibleActive.map((c) => (
            <ActiveCommitmentCard key={c.id} commitment={c} />
          ))}
          {hasMore && (
            <p className="home-active-cards-more">
              <Link to="/commitments" className="home-active-cards-viewall">
                View all commitments
              </Link>
            </p>
          )}
        </div>

        {/* Two smaller cards */}
        <div className="home-small-cards-row">
          <Card
            className="home-card-small"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/analytics')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/analytics')}
            aria-label="View analytics"
          >
            <div className="home-widget-icon" aria-hidden="true">
              <TrendingUp size={20} color="var(--sage-deep)" />
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
              <BarChart2 size={20} color="var(--clay)" />
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
          <ul className="home-recent-list-v5">
            {recentItems.map((c) => (
              <li key={c.id} className="home-recent-item">
                <button type="button" className="home-recent-btn" onClick={() => navigate(`/commitments/${c.id}`)}>
                  <span className="home-recent-action">{c.action}</span>
                  <Chip variant={c.status === 'active' ? 'sage' : 'default'}>{c.status}</Chip>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </aside>

      <WorkspacePickerModal open={workspaceOpen} commitments={commitments} onClose={() => setWorkspaceOpen(false)} />
    </div>
  )
}

export function Home() {
  const navigate = useNavigate()
  const [mockActive, setLocalMockActive] = useState(getMockActive())
  const { state, commitments, refresh } = useCommitments()

  // Determine active state: any ongoing commitment makes Home active.
  const hasActive = commitments.some((c) => ONGOING_STATUSES.includes(c.status))

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
      ) : !hasActive ? (
        <IdleState onCompose={() => navigate('/commitments/new')} />
      ) : (
        <ActiveState commitments={commitments} />
      )}
    </div>
  )
}
