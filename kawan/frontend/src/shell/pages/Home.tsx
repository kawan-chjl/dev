// Home — V4 "Warm Witness bento"
// Active state: bento layout with commitment hero card + status strip cards + roadmap card.
// Idle state (TR-13): warm inviting hero + how-it-works strip.
// Reads real commitment data via useActiveCommitment() with mock fallback + dev toggle.

import { Clock, Lock, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveCommitment } from '../../commitments/useActiveCommitment'
import { getMockActive, setMockActive } from '../../mock/provider'
import type { Commitment } from '../../types/api'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Chip } from '../../ui/Chip'

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

const checkInToneLabels: Record<0 | 1 | 2, string> = {
  0: 'Gentle',
  1: 'Direct',
  2: 'Blunt'
}

export function Home() {
  const navigate = useNavigate()
  // Dev toggle - drives the mock getter in mock/fallback mode (preserved per plan).
  const [mockActive, setLocalMockActive] = useState(getMockActive())
  const { state, commitment, refresh } = useActiveCommitment()

  function toggleMockState() {
    const next = !mockActive
    setMockActive(next)
    setLocalMockActive(next)
    // Re-run the hook's load so it picks up the toggled mock state.
    refresh()
  }

  return (
    <div className="shell-page">
      {/* Dev toggle - local dev only, never in production */}
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
        /* Idle state - TR-13 */
        <IdleState onCompose={() => navigate('/new')} />
      ) : (
        /* Active state */
        <ActiveState commitment={commitment} />
      )}
    </div>
  )
}

function IdleState({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="home-idle-v2">
      <div className="home-idle-hero">
        <div className="home-idle-eye-wrap" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <ellipse cx="24" cy="24" rx="22" ry="14" stroke="var(--accent)" strokeWidth="2.5" fill="none" />
            <circle cx="24" cy="24" r="6" fill="var(--accent)" />
            <circle cx="26" cy="22" r="2" fill="var(--surface-2)" />
          </svg>
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

function ActiveState({ commitment }: { commitment: Commitment }) {
  return (
    <div className="home-active-v2">
      {/* Hero: commitment sentence card */}
      <Card className="home-commitment-card">
        <p className="home-commitment-label">Your commitment</p>
        <p className="home-commitment-sentence">
          I will <strong>{commitment.action}</strong>{' '}
          <span className="home-commitment-deliverable">{commitment.deliverable}</span>
        </p>
        <div className="home-commitment-meta">
          <Chip variant="default">
            <Clock size={12} aria-hidden="true" />
            {formatDeadline(commitment.deadline)}
          </Chip>
          <Badge variant="muted">{commitment.evidence_type}</Badge>
          <span className="home-tee-pill" title="Verified inside a Trusted Execution Environment">
            <Lock size={11} aria-hidden="true" />
            TEE verified
          </span>
        </div>
      </Card>

      {/* Status bento: 2-col at lg */}
      <div className="home-status-bento">
        <Card className="home-status-card">
          <p className="home-status-label">How Kawan checks in</p>
          <Chip variant="default">{checkInToneLabels[commitment.escalation]}</Chip>
        </Card>
        <Card className="home-status-card">
          <p className="home-status-label">Rest days left</p>
          <Chip variant={commitment.skip_days_used < commitment.skip_days_total ? 'sage' : 'default'}>
            {commitment.skip_days_total - commitment.skip_days_used}
          </Chip>
        </Card>
        <Card className="home-status-card">
          <p className="home-status-label">Status</p>
          <Chip variant={commitment.status === 'active' ? 'sage' : 'default'}>{commitment.status}</Chip>
        </Card>
      </div>

      {/* Roadmap card */}
      <Card className="home-roadmap-card">
        <p className="home-roadmap-label">Your plan</p>
        <p className="home-roadmap-placeholder">
          Your plan shows up here after we talk it through. Start your first check-in to begin.
        </p>
      </Card>

      {/* CTAs */}
      <div className="home-actions">
        <Button variant="primary">Check now</Button>
        <Button variant="secondary">Upload evidence</Button>
      </div>
    </div>
  )
}
