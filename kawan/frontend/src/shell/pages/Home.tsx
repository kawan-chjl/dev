// Home — V3 "Commitment HQ".
// Active state: commitment sentence + countdown + status strip + roadmap card + CTA buttons.
// Idle state (TR-13): compose CTA replaces the header.
// Reads real commitment data via useActiveCommitment() with mock fallback + dev toggle.

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

const escalationLabels: Record<0 | 1 | 2, string> = {
  0: 'Gentle',
  1: 'Direct',
  2: 'Blunt'
}

export function Home() {
  const navigate = useNavigate()
  // Dev toggle — drives the mock getter in mock/fallback mode (preserved per plan).
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
      {/* Dev toggle — local dev only, never in production */}
      {import.meta.env.DEV && (
        <div className="dev-toggle">
          <button type="button" className="dev-toggle-btn" onClick={toggleMockState}>
            [dev] {mockActive ? 'Active to Idle' : 'Idle to Active'}
          </button>
        </div>
      )}

      {state === 'loading' ? (
        <div className="home-loading">
          <p className="home-loading-text">Loading…</p>
        </div>
      ) : commitment == null ? (
        /* Idle state — TR-13 */
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
    <div className="home-idle">
      <div className="home-idle-eye" aria-hidden="true">
        ◉
      </div>
      <h2 className="home-idle-heading">What are you working on?</h2>
      <p className="home-idle-sub">Kawan holds you to one commitment at a time — real, verifiable, yours.</p>
      <Button variant="accent" onClick={onCompose}>
        Make a commitment
      </Button>
    </div>
  )
}

function ActiveState({ commitment }: { commitment: Commitment }) {
  return (
    <div className="home-active">
      {/* Commitment sentence */}
      <Card className="home-commitment-card">
        <p className="home-commitment-label">Your commitment</p>
        <p className="home-commitment-sentence">
          I will <strong>{commitment.action}</strong>{' '}
          <span className="home-commitment-deliverable">{commitment.deliverable}</span>
        </p>
        <div className="home-commitment-meta">
          <Chip variant="default">{formatDeadline(commitment.deadline)}</Chip>
          <Badge variant="muted">{commitment.evidence_type}</Badge>
          <Badge variant="default">🔒 TEE</Badge>
        </div>
      </Card>

      {/* Status strip */}
      <div className="home-status-strip">
        <div className="home-status-item">
          <span className="home-status-label">Check-in tone</span>
          <Chip variant="default">{escalationLabels[commitment.escalation]}</Chip>
        </div>
        <div className="home-status-item">
          <span className="home-status-label">Skip days</span>
          <Chip variant="default">
            {commitment.skip_days_used} / {commitment.skip_days_total}
          </Chip>
        </div>
        <div className="home-status-item">
          <span className="home-status-label">Status</span>
          <Chip variant={commitment.status === 'active' ? 'sage' : 'default'}>{commitment.status}</Chip>
        </div>
      </div>

      {/* Roadmap card — AI roadmap stubbed (Lane C absent) */}
      <Card className="home-roadmap-card">
        <p className="home-roadmap-label">Roadmap</p>
        <p className="home-roadmap-placeholder">Plan will appear here after context gathering.</p>
      </Card>

      {/* CTAs */}
      <div className="home-actions">
        <Button variant="primary">Check now</Button>
        <Button variant="secondary">Upload evidence</Button>
      </div>
    </div>
  )
}
