// CommitmentDetail - /commitments/:id
// Two-column layout: content sections + sticky OnThisPage island.
// Overview: honest derived summary from timeline events (Lane C AI not built).
// Timeline section: event log using shared eventRows.tsx.
// recordRecentCommitment called on mount so Home Recent Activity is updated.

import { ExternalLink, Lock, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { recordRecentCommitment } from '../../commitments/recent'
import { useActiveCommitment } from '../../commitments/useActiveCommitment'
import { ShareWinDialog } from '../../share/ShareWinDialog'
import { CheckinEventRow, EvidenceEventRow, ProposalEventRow } from '../../timeline/eventRows'
import { verifiedCount } from '../../timeline/metrics'
import { useTimeline } from '../../timeline/useTimeline'
import type { Commitment } from '../../types/api'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Chip } from '../../ui/Chip'
import { Tooltip } from '../../ui/Tooltip'
import type { PageSection } from '../OnThisPage'
import { OnThisPage } from '../OnThisPage'
import { PageHeader } from '../PageHeader'

function LockIcon() {
  return <Lock size={13} color="var(--ink-faint)" aria-hidden="true" />
}

function ReadOnlyField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="detail-field">
      <span className="detail-field-label">
        {label}
        <LockIcon />
      </span>
      <span className="detail-field-value">{value ?? 'Not set'}</span>
    </div>
  )
}

const escalationLabels: Record<0 | 1 | 2, string> = {
  0: 'Gentle',
  1: 'Direct',
  2: 'Blunt'
}

const DETAIL_SECTIONS: PageSection[] = [
  { id: 'section-overview', label: 'Overview' },
  { id: 'section-action', label: 'Action' },
  { id: 'section-deliverables', label: 'Deliverables' },
  { id: 'section-deadline', label: 'Deadline' },
  { id: 'section-evidence', label: 'Evidence' },
  { id: 'section-accountability', label: 'Accountability' },
  { id: 'section-rest-days', label: 'Rest days' },
  { id: 'section-how-firm', label: 'How firm' },
  { id: 'section-timeline', label: 'Timeline' }
]

function OverviewSection({ commitment }: { commitment: Commitment }) {
  const { timeline } = useTimeline(commitment.id)
  const { me } = useAuth()
  const [shareOpen, setShareOpen] = useState(false)
  const events = timeline?.events ?? []
  const verified = verifiedCount(events)
  const totalCheckins = events.filter((e) => e.type === 'evidence').length
  const lastEvidence = [...events].reverse().find((e) => e.type === 'evidence') as
    | Extract<(typeof events)[number], { type: 'evidence' }>
    | undefined

  const verdictLabel = lastEvidence
    ? lastEvidence.verdict === 'pass'
      ? 'pass'
      : lastEvidence.verdict === 'unclear'
        ? 'not sure yet'
        : 'no pass'
    : null

  // Win date: latest pass-verdict evidence event (OQ-A9-DATE decision).
  const latestPassEvent = [...events]
    .reverse()
    .find(
      (e): e is Extract<(typeof events)[number], { type: 'evidence' }> => e.type === 'evidence' && e.verdict === 'pass'
    )
  const winDateIso = latestPassEvent?.at ?? new Date().toISOString()

  const showShareButton = verified > 0 && me?.persona != null

  return (
    <section id="section-overview" className="detail-section">
      <h2 className="detail-section-heading">Overview</h2>
      <Card className="detail-overview-card">
        <p className="detail-overview-note">
          This is a summary of your activity so far. A full Kawan AI conversation summary will appear here once the AI
          layer is ready.
        </p>
        <div className="detail-overview-stats">
          <div className="detail-overview-stat">
            <span className="detail-overview-stat-number">{verified}</span>
            <span className="detail-overview-stat-label">Verified</span>
          </div>
          <div className="detail-overview-stat">
            <span className="detail-overview-stat-number">{totalCheckins}</span>
            <span className="detail-overview-stat-label">Check-ins</span>
          </div>
        </div>
        {verdictLabel !== null && (
          <p className="detail-overview-last-verdict">
            Latest verdict: <strong>{verdictLabel}</strong>
          </p>
        )}
        {events.length === 0 && <p className="detail-overview-empty">No check-ins yet. Open the workspace to start.</p>}
        {showShareButton && (
          <div className="share-win-entry">
            <Button variant="primary" onClick={() => setShareOpen(true)}>
              <Share2 size={16} aria-hidden="true" />
              Share win
            </Button>
          </div>
        )}
      </Card>

      {showShareButton && me?.persona != null && (
        <ShareWinDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          commitment={commitment}
          winDateIso={winDateIso}
          persona={me.persona}
        />
      )}
    </section>
  )
}

function TimelineSection({ commitmentId }: { commitmentId: string }) {
  const { state, timeline } = useTimeline(commitmentId)
  const events = timeline?.events ?? []

  return (
    <section id="section-timeline" className="detail-section">
      <h2 className="detail-section-heading">Timeline</h2>
      {state === 'loading' && <p className="timeline-loading">Loading...</p>}
      {(state === 'empty' || (state === 'ready' && events.length === 0)) && (
        <p className="detail-timeline-empty">No check-ins yet.</p>
      )}
      {state === 'ready' && events.length > 0 && (
        <div className="timeline-container">
          {events.map((event) => {
            if (event.type === 'checkin') return <CheckinEventRow key={`checkin-${event.at}`} event={event} />
            if (event.type === 'evidence') return <EvidenceEventRow key={`evidence-${event.at}`} event={event} />
            if (event.type === 'proposal') return <ProposalEventRow key={`proposal-${event.at}`} event={event} />
            return null
          })}
        </div>
      )}
    </section>
  )
}

export function CommitmentDetail() {
  const { id } = useParams<{ id: string }>()
  const { commitment } = useActiveCommitment()
  const navigate = useNavigate()

  const match = commitment?.id === id ? commitment : null

  useEffect(() => {
    if (match?.id) recordRecentCommitment(match.id)
  }, [match?.id])

  if (match === null) {
    return (
      <div className="shell-page">
        <PageHeader title="Commitment" subtitle="Details and settings." />
        <p className="page-not-found">Commitment not found.</p>
      </div>
    )
  }

  const headerActions = (
    <>
      <Button variant="accent" onClick={() => navigate(`/workspace/${match.id}`)}>
        <ExternalLink size={16} aria-hidden="true" />
        Open workspace
      </Button>
      <Button variant="primary" onClick={() => navigate(`/workspace/${match.id}`)}>
        Check now
      </Button>
    </>
  )

  return (
    <div className="shell-page">
      <PageHeader title="Commitment" subtitle="Details and your activity so far." actions={headerActions} />

      <div className="detail-two-col">
        {/* Left: content sections */}
        <div className="detail-content">
          <div className="detail-status-header">
            <span className="detail-status-label">Status</span>
            <Chip variant={match.status === 'active' ? 'sage' : 'default'}>{match.status}</Chip>
            <Badge variant="muted">{match.id}</Badge>
          </div>

          <OverviewSection commitment={match} />

          <p className="detail-fields-note">Only you can change these fields. Kawan reads them but never edits them.</p>

          <section id="section-action" className="detail-section">
            <h2 className="detail-section-heading">Action</h2>
            <Card className="detail-card">
              <ReadOnlyField label="Action" value={match.action} />
            </Card>
          </section>

          <section id="section-deliverables" className="detail-section">
            <h2 className="detail-section-heading">Deliverables</h2>
            <Card className="detail-card">
              <ReadOnlyField label="Deliverable" value={match.deliverable} />
              <ReadOnlyField label="Cadence" value={match.cadence} />
              <ReadOnlyField label="Evidence type" value={match.evidence_type} />
            </Card>
          </section>

          <section id="section-deadline" className="detail-section">
            <h2 className="detail-section-heading">Deadline</h2>
            <Card className="detail-card">
              <ReadOnlyField label="Deadline" value={new Date(match.deadline).toLocaleString('en-MY')} />
            </Card>
          </section>

          <section id="section-evidence" className="detail-section">
            <h2 className="detail-section-heading">
              Evidence
              <Tooltip text="How Kawan verifies your work. Screenshot = you upload proof. GitHub = commits are checked automatically." />
            </h2>
            <Card className="detail-card">
              <ReadOnlyField label="Evidence type" value={match.evidence_type} />
            </Card>
          </section>

          <section id="section-accountability" className="detail-section">
            <h2 className="detail-section-heading">
              Accountability
              <Tooltip text="An optional contact who receives a message if you miss your commitment." />
            </h2>
            <Card className="detail-card">
              <ReadOnlyField
                label="Accountability contact"
                value={match.stake_enabled ? `${match.stake_contact_name ?? 'Not set'}` : 'Not enabled'}
              />
            </Card>
          </section>

          <section id="section-rest-days" className="detail-section">
            <h2 className="detail-section-heading">
              Rest days
              <Tooltip text="Days you can skip a check-in without penalty. You set the total; Kawan tracks how many you have left." />
            </h2>
            <Card className="detail-card">
              <ReadOnlyField
                label="Rest days left"
                value={`${match.skip_days_used} used of ${match.skip_days_total}`}
              />
            </Card>
          </section>

          <section id="section-how-firm" className="detail-section">
            <h2 className="detail-section-heading">
              How firm
              <Tooltip text="Controls Kawan's tone during check-ins. Gentle is encouraging, Direct is no-nonsense, Blunt is maximum accountability." />
            </h2>
            <Card className="detail-card">
              <ReadOnlyField label="How Kawan checks in" value={escalationLabels[match.escalation]} />
            </Card>
          </section>

          <TimelineSection commitmentId={match.id} />
        </div>

        {/* Right: sticky spy-scroll index */}
        <div className="detail-index-col">
          <OnThisPage sections={DETAIL_SECTIONS} />
        </div>
      </div>
    </div>
  )
}
