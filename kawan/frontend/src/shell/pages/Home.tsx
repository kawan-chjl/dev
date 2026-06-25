// Home — bento dashboard.
// Active: hero commitment card + at-a-glance stats + quick-access + companion card + recent activity.
// Idle: warm inviting hero + how-it-works strip.
// Stats reuse metrics.ts for consistency with the Timeline AnalyticsPanel (no inline recompute).

import {
  BarChart2,
  Clock,
  ExternalLink,
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { useActiveCommitment } from '../../commitments/useActiveCommitment'
import { getMockActive, setMockActive } from '../../mock/provider'
import { evidencePassRate, verifiedCount } from '../../timeline/metrics'
import { useTimeline } from '../../timeline/useTimeline'
import type { Commitment, Persona } from '../../types/api'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Chip } from '../../ui/Chip'
import { PageHeader } from '../PageHeader'

// ── Persona display map ────────────────────────────────────────────────────────
const PERSONA_DISPLAY: Record<Persona, { name: string; archetype: string }> = {
  kawan: { name: 'Kawan', archetype: 'Skeptical Concierge' },
  adik: { name: 'Adik', archetype: 'Gentle Cheerleader' },
  cik_maid: { name: 'Cik Maid', archetype: 'Playful Taskmaster' }
}

function formatDeadline(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
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
          Kawan holds you to one thing at a time. Real, verifiable, yours. It won't believe you until you prove it.
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
            <ShieldCheck size={24} color="var(--sage-deep)" aria-hidden="true" />
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

interface ActiveStateProps {
  commitment: Commitment
}

function ActiveState({ commitment }: ActiveStateProps) {
  const navigate = useNavigate()
  const { me } = useAuth()
  const { timeline } = useTimeline(commitment.id)

  const events = timeline?.events ?? []
  const verified = verifiedCount(events)
  const totalCheckins = events.filter((e) => e.type === 'evidence').length
  const passRate = evidencePassRate(events)
  const recentEvents = events.slice(-4).reverse()

  const persona = me?.persona ?? 'kawan'
  const personaDisplay = PERSONA_DISPLAY[persona]

  return (
    <div className="home-bento">
      {/* Hero commitment card */}
      <Card className="home-hero-card">
        <div className="home-hero-body">
          <div className="home-hero-text">
            <p className="home-hero-label">Your commitment</p>
            <p className="home-hero-sentence">
              I will <strong>{commitment.action}</strong>{' '}
              <span className="home-hero-deliverable">{commitment.deliverable}</span>
            </p>
            <div className="home-hero-meta">
              <Chip variant="default">
                <Clock size={12} aria-hidden="true" />
                {formatDeadline(commitment.deadline)}
              </Chip>
              <Badge variant="muted">{commitment.evidence_type}</Badge>
              <Badge variant="muted">{commitment.cadence}</Badge>
            </div>
          </div>
          <div className="home-hero-stat">
            <span className="home-hero-stat-number">{verified}</span>
            <span className="home-hero-stat-label">verified</span>
          </div>
        </div>

        <div className="home-hero-actions">
          <Button variant="accent" onClick={() => navigate(`/workspace/${commitment.id}`)}>
            Open workspace
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/workspace/${commitment.id}`)}>
            Check now
          </Button>
        </div>
      </Card>

      {/* At-a-glance stats row — reuses metrics.ts (consistent with AnalyticsPanel on /timeline) */}
      <div className="home-stats-row">
        <Card className="home-stat-card">
          <span className="home-stat-number">{verified}</span>
          <span className="home-stat-label">Verified</span>
        </Card>
        <Card className="home-stat-card">
          <span className="home-stat-number">{totalCheckins}</span>
          <span className="home-stat-label">Check-ins</span>
        </Card>
        <Card className="home-stat-card">
          <span className="home-stat-number">{passRate !== null ? `${passRate}%` : '--'}</span>
          <span className="home-stat-label">Pass rate</span>
        </Card>
        <Card className="home-stat-card">
          <span className="home-stat-number">{commitment.skip_days_total - commitment.skip_days_used}</span>
          <span className="home-stat-label">Rest days left</span>
        </Card>
      </div>

      {/* Quick access + companion row */}
      <div className="home-lower-row">
        {/* Quick access grid */}
        <div className="home-quick-access">
          <Card
            className="home-quick-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/timeline')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/timeline')}
          >
            <TrendingUp size={20} color="var(--accent)" aria-hidden="true" />
            <p className="home-quick-label">Timeline</p>
            <p className="home-quick-sub">Every check-in</p>
          </Card>
          <Card
            className="home-quick-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/commitments/${commitment.id}`)}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/commitments/${commitment.id}`)}
          >
            <ShieldCheck size={20} color="var(--sage-deep)" aria-hidden="true" />
            <p className="home-quick-label">Commitment</p>
            <p className="home-quick-sub">Details and settings</p>
          </Card>
          <Card
            className="home-quick-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/workspace/${commitment.id}`)}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/workspace/${commitment.id}`)}
          >
            <ExternalLink size={20} color="var(--clay)" aria-hidden="true" />
            <p className="home-quick-label">Workspace</p>
            <p className="home-quick-sub">Talk to Kawan</p>
          </Card>
          <Card
            className="home-quick-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/faq')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/faq')}
          >
            <HelpCircle size={20} color="var(--ink-faint)" aria-hidden="true" />
            <p className="home-quick-label">FAQ</p>
            <p className="home-quick-sub">How it works</p>
          </Card>
        </div>

        {/* Companion card */}
        <Card className="home-companion-card">
          <div className="home-companion-avatar" aria-hidden="true">
            <User size={24} color="var(--accent)" aria-hidden="true" />
          </div>
          <div className="home-companion-text">
            <p className="home-companion-name">{personaDisplay.name}</p>
            <p className="home-companion-archetype">{personaDisplay.archetype}</p>
          </div>
          <button type="button" className="home-companion-change" onClick={() => navigate('/settings')}>
            Change
          </button>
        </Card>
      </div>

      {/* Recent activity */}
      {recentEvents.length > 0 && (
        <Card
          className="home-activity-card"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/timeline')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/timeline')}
          aria-label="View full timeline"
        >
          <div className="home-activity-header">
            <p className="home-activity-label">Recent activity</p>
            <span className="home-activity-link">
              <BarChart2 size={14} aria-hidden="true" />
              See all
            </span>
          </div>
          <ul className="home-activity-list">
            {recentEvents.map((event, i) => {
              const timeStr = new Date(event.at).toLocaleString('en-MY', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })
              if (event.type === 'checkin') {
                return (
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable reverse-slice from sorted timeline
                  <li key={i} className="home-activity-item">
                    <span className="home-activity-dot home-activity-dot-checkin" aria-hidden="true" />
                    <span className="home-activity-text">
                      Check-in
                      {event.kind !== 'cadence' && <span className="home-activity-kind"> {event.kind}</span>}
                    </span>
                    <span className="home-activity-time">{timeStr}</span>
                  </li>
                )
              }
              if (event.type === 'evidence') {
                const label =
                  event.verdict === 'pass' ? 'Verified' : event.verdict === 'unclear' ? 'Not sure yet' : 'No pass'
                return (
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable reverse-slice from sorted timeline
                  <li key={i} className="home-activity-item">
                    <span className="home-activity-dot home-activity-dot-evidence" aria-hidden="true" />
                    <span className="home-activity-text">{label}</span>
                    <span className="home-activity-time">{timeStr}</span>
                  </li>
                )
              }
              return null
            })}
          </ul>
        </Card>
      )}

      {/* Chutes balance (shown only if available) */}
      {me?.balance != null && (
        <Card className="home-balance-card">
          <div className="home-balance-body">
            <div className="home-balance-left">
              <MessageSquare size={18} color="var(--ink-soft)" aria-hidden="true" />
              <span className="home-balance-label">Chutes balance</span>
            </div>
            <span className="home-balance-value">${me.balance.toFixed(2)}</span>
          </div>
        </Card>
      )}
    </div>
  )
}

export function Home() {
  const navigate = useNavigate()
  const [mockActive, setLocalMockActive] = useState(getMockActive())
  const { state, commitment, refresh } = useActiveCommitment()

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
      ) : commitment == null ? (
        <IdleState onCompose={() => navigate('/commitments/new')} />
      ) : (
        <ActiveState commitment={commitment} />
      )}
    </div>
  )
}
