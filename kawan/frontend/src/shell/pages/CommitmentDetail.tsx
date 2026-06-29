// CommitmentDetail - /commitments/:id
// Details page with one operational next-step card and a retained spy-scroll index.
// recordRecentCommitment called on mount so Home Recent Activity is updated.

import { AlertTriangle, ExternalLink, Lock, Share2, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { deleteCommitment, fetchCommitmentById } from '../../commitments/api'
import { recordRecentCommitment } from '../../commitments/recent'
import { statusLabel } from '../../commitments/statusLabel'
import { useNotifications } from '../../notifications/NotificationProvider'
import { ShareWinDialog } from '../../share/ShareWinDialog'
import { CheckinEventRow, EvidenceEventRow, ProposalEventRow } from '../../timeline/eventRows'
import { verifiedCount } from '../../timeline/metrics'
import { useTimeline } from '../../timeline/useTimeline'
import type { Commitment, TimelineEvent } from '../../types/api'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Chip } from '../../ui/Chip'
import { Modal } from '../../ui/Modal'
import { Skeleton } from '../../ui/Skeleton'
import { Tooltip } from '../../ui/Tooltip'
import { fmtDuration, fmtMYT } from '../../zone2/formatTime'
import { type CheckinStatus, fetchCheckinStatus } from '../../zone2/keyEvents'
import type { PageSection } from '../OnThisPage'
import { OnThisPage } from '../OnThisPage'
import { PageHeader } from '../PageHeader'

const HOUR_MS = 3600000
const DAY_MS = 86400000

const escalationLabels: Record<0 | 1 | 2, string> = {
  0: 'Gentle',
  1: 'Direct',
  2: 'Blunt'
}

const DETAIL_SECTIONS: PageSection[] = [
  { id: 'section-overview', label: 'Overview' },
  { id: 'section-next-step', label: 'Next step' },
  { id: 'section-progress', label: 'Progress' },
  { id: 'section-terms', label: 'Terms' },
  { id: 'section-timeline', label: 'Timeline' },
  { id: 'section-danger-zone', label: 'Danger zone' }
]

type LoadState = 'loading' | 'ready' | 'idle'
type TimelineState = ReturnType<typeof useTimeline>['state']

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

function SectionHeading({ children, tooltip }: { children: string; tooltip: string }) {
  return (
    <h2 className="detail-section-heading">
      {children}
      <Tooltip text={tooltip} />
    </h2>
  )
}

function commitmentTitle(commitment: Commitment): string {
  return `I will ${commitment.action} ${commitment.deliverable}`
}

function cadenceToMs(cadence: string | undefined): number {
  if (!cadence) return DAY_MS
  const c = cadence.toLowerCase().trim()
  if (c === 'daily' || c.startsWith('daily_')) return DAY_MS
  if (c === 'weekly') return 7 * DAY_MS
  if (c === 'hourly') return HOUR_MS
  const days = c.match(/every\s+(\d+)\s*days?/)
  if (days) return Math.max(1, Number.parseInt(days[1], 10)) * DAY_MS
  const hours = c.match(/every\s+(\d+)\s*hours?/)
  if (hours) return Math.max(1, Number.parseInt(hours[1], 10)) * HOUR_MS
  return DAY_MS
}

function getNextDueMs(commitment: Commitment, checkinStatus: CheckinStatus | null): number | null {
  if (!checkinStatus?.due_at) return null
  const dueAtMs = new Date(checkinStatus.due_at).getTime()
  if (Number.isNaN(dueAtMs)) return null
  return dueAtMs + cadenceToMs(commitment.cadence)
}

function getLatestPassedEvidence(events: TimelineEvent[]) {
  return [...events]
    .reverse()
    .find(
      (event): event is Extract<TimelineEvent, { type: 'evidence' }> =>
        event.type === 'evidence' && event.verdict === 'pass'
    )
}

function isCheckedInForCurrentPeriod(
  events: TimelineEvent[],
  checkinStatus: CheckinStatus | null,
  nextDueMs: number | null
) {
  if (!checkinStatus?.due_at || nextDueMs == null || nextDueMs <= Date.now()) return false
  const latestPass = getLatestPassedEvidence(events)
  if (!latestPass) return false
  return new Date(latestPass.at).getTime() >= new Date(checkinStatus.due_at).getTime()
}

function OverviewSection({
  commitment,
  events,
  verified,
  totalCheckins
}: {
  commitment: Commitment
  events: TimelineEvent[]
  verified: number
  totalCheckins: number
}) {
  const lastEvidence = [...events].reverse().find((event) => event.type === 'evidence') as
    | Extract<TimelineEvent, { type: 'evidence' }>
    | undefined
  const latestCheckin = [...events].reverse().find((event) => event.type === 'checkin') as
    | Extract<TimelineEvent, { type: 'checkin' }>
    | undefined
  const verdictLabel = lastEvidence
    ? lastEvidence.verdict === 'pass'
      ? 'pass'
      : lastEvidence.verdict === 'unclear'
        ? 'not sure yet'
        : 'no pass'
    : 'none yet'

  return (
    <section id="section-overview" className="detail-section">
      <SectionHeading tooltip="A compact summary of this commitment's current state and latest activity.">
        Overview
      </SectionHeading>
      <Card className="detail-overview-card">
        <div className="detail-overview-copy">
          <p className="detail-overview-title">{commitmentTitle(commitment)}</p>
          <p className="detail-overview-note">
            {verified > 0
              ? 'Kawan has accepted evidence for this commitment. Keep using the workspace for check-ins, revisions, and final evidence.'
              : 'No evidence has been verified yet. Start from the next step below when you are ready to report progress.'}
          </p>
        </div>
        <div className="detail-overview-stats">
          <div className="detail-overview-stat">
            <span className="detail-overview-stat-number">{verified}</span>
            <span className="detail-overview-stat-label">Verified</span>
          </div>
          <div className="detail-overview-stat">
            <span className="detail-overview-stat-number">{totalCheckins}</span>
            <span className="detail-overview-stat-label">Check-ins</span>
          </div>
          <div className="detail-overview-stat">
            <span className="detail-overview-stat-number">{commitment.skip_days_total - commitment.skip_days_used}</span>
            <span className="detail-overview-stat-label">Rest days left</span>
          </div>
        </div>
        <div className="detail-overview-meta">
          <span>Latest verdict: {verdictLabel}</span>
          <span>{latestCheckin ? `Last check-in: ${fmtMYT(latestCheckin.at)}` : 'No check-ins yet'}</span>
        </div>
      </Card>
    </section>
  )
}

interface NextStepCopy {
  eyebrow: string
  title: string
  body: string
  cta: string | null
  tone: 'default' | 'good' | 'warning' | 'danger'
}

function getNextStepCopy(
  commitment: Commitment,
  checkinStatus: CheckinStatus | null,
  events: TimelineEvent[],
  canShareWin: boolean
): NextStepCopy {
  const now = Date.now()
  const deadlineMs = new Date(commitment.deadline).getTime()
  const nextDueMs = getNextDueMs(commitment, checkinStatus)
  const checkedIn = isCheckedInForCurrentPeriod(events, checkinStatus, nextDueMs)

  if (commitment.status === 'completed') {
    return {
      eyebrow: 'Done',
      title: 'Commitment completed',
      body: canShareWin
        ? 'Your final evidence was accepted. Share the win when you want to show the result.'
        : 'Your final evidence was accepted. The timeline below keeps the record.',
      cta: canShareWin ? 'Share win' : null,
      tone: 'good'
    }
  }

  if (commitment.status === 'missed' || (commitment.status === 'lapsed' && deadlineMs < now)) {
    return {
      eyebrow: 'Closed',
      title: 'This commitment was missed',
      body: 'Check-ins are no longer available here. Review the timeline and start a new commitment when you are ready.',
      cta: null,
      tone: 'danger'
    }
  }

  if (checkedIn && nextDueMs != null) {
    return {
      eyebrow: 'On track',
      title: 'Checked in for this period',
      body: `Next check-in ${nextDueMs > now ? `opens in ${fmtDuration(nextDueMs - now)}` : 'is available now'} (${fmtMYT(new Date(nextDueMs).toISOString())}).`,
      cta: 'Open workspace',
      tone: 'good'
    }
  }

  if (checkinStatus?.is_late) {
    return {
      eyebrow: 'Needs attention',
      title: 'Late check-in',
      body: 'The check-in window has expired. Submit evidence now so Kawan can still evaluate your progress.',
      cta: 'Late check-in',
      tone: 'warning'
    }
  }

  if (nextDueMs != null && nextDueMs > now) {
    return {
      eyebrow: 'Available',
      title: 'Upcoming check-in',
      body: `Your next scheduled check-in is ${fmtMYT(new Date(nextDueMs).toISOString())}. You can check in early if you already have progress to show.`,
      cta: 'Check in early',
      tone: 'default'
    }
  }

  return {
    eyebrow: 'Available',
    title: 'Check-in available',
    body: 'Open the workspace to start the check-in flow and submit evidence.',
    cta: 'Check-in',
    tone: 'default'
  }
}

function NextStepSection({
  commitment,
  checkinStatus,
  events,
  canShareWin,
  onWorkspace,
  onShare
}: {
  commitment: Commitment
  checkinStatus: CheckinStatus | null
  events: TimelineEvent[]
  canShareWin: boolean
  onWorkspace: () => void
  onShare: () => void
}) {
  const nextStep = getNextStepCopy(commitment, checkinStatus, events, canShareWin)

  return (
    <section id="section-next-step" className="detail-section">
      <SectionHeading tooltip="The single most relevant action based on check-in timing and commitment status.">
        Next step
      </SectionHeading>
      <Card className={`detail-next-step-card detail-next-step-card-${nextStep.tone}`}>
        <div className="detail-next-step-content">
          <p className="detail-next-step-eyebrow">{nextStep.eyebrow}</p>
          <h3 className="detail-next-step-title">{nextStep.title}</h3>
          <p className="detail-next-step-body">{nextStep.body}</p>
        </div>
        {nextStep.cta && (
          <Button
            variant={nextStep.tone === 'warning' ? 'accent' : 'primary'}
            onClick={canShareWin ? onShare : onWorkspace}
          >
            {canShareWin && nextStep.cta === 'Share win' ? <Share2 size={16} aria-hidden="true" /> : null}
            {nextStep.cta}
          </Button>
        )}
      </Card>
    </section>
  )
}

function ProgressSection({
  events,
  verified,
  totalCheckins
}: {
  events: TimelineEvent[]
  verified: number
  totalCheckins: number
}) {
  const latestPass = getLatestPassedEvidence(events)
  const latestEvidence = [...events].reverse().find((event) => event.type === 'evidence') as
    | Extract<TimelineEvent, { type: 'evidence' }>
    | undefined

  return (
    <section id="section-progress" className="detail-section">
      <SectionHeading tooltip="Evidence and check-in counts derived from this commitment's timeline.">Progress</SectionHeading>
      <Card className="detail-progress-card">
        <div className="detail-progress-item">
          <span className="detail-progress-value">{verified}</span>
          <span className="detail-progress-label">Verified evidence</span>
        </div>
        <div className="detail-progress-item">
          <span className="detail-progress-value">{totalCheckins}</span>
          <span className="detail-progress-label">Evidence submissions</span>
        </div>
        <div className="detail-progress-item detail-progress-item-wide">
          <span className="detail-progress-value">{latestPass ? fmtMYT(latestPass.at) : 'Not yet'}</span>
          <span className="detail-progress-label">Latest verified win</span>
        </div>
        {latestEvidence?.reasoning && <p className="detail-progress-reasoning">{latestEvidence.reasoning}</p>}
      </Card>
    </section>
  )
}

function TermsSection({ commitment }: { commitment: Commitment }) {
  return (
    <section id="section-terms" className="detail-section">
      <SectionHeading tooltip="The user-owned commitment terms Kawan reads during check-ins.">Terms</SectionHeading>
      <Card className="detail-card">
        <p className="detail-fields-note">Only you can change these fields. Kawan reads them but never edits them.</p>
        <div className="detail-fields">
          <ReadOnlyField label="Action" value={commitment.action} />
          <ReadOnlyField label="Deliverable" value={commitment.deliverable} />
          <ReadOnlyField label="Deadline" value={fmtMYT(commitment.deadline)} />
          <ReadOnlyField label="Cadence" value={commitment.cadence} />
          <ReadOnlyField label="Evidence type" value={commitment.evidence_type} />
          <ReadOnlyField
            label="Accountability contact"
            value={commitment.stake_enabled ? (commitment.stake_contact_name ?? 'Not set') : 'Not enabled'}
          />
          <ReadOnlyField label="Rest days" value={`${commitment.skip_days_used} used of ${commitment.skip_days_total}`} />
          <ReadOnlyField label="How Kawan checks in" value={escalationLabels[commitment.escalation]} />
        </div>
      </Card>
    </section>
  )
}

function TimelineSection({ state, events }: { state: TimelineState; events: TimelineEvent[] }) {
  return (
    <section id="section-timeline" className="detail-section">
      <SectionHeading tooltip="A chronological record of check-ins, evidence verdicts, and proposal changes.">
        Timeline
      </SectionHeading>
      {state === 'loading' && (
        <Card>
          <div className="skeleton-card-content" aria-hidden="true">
            <Skeleton variant="text" width="62%" />
            <Skeleton variant="text" width="48%" />
            <Skeleton variant="text" width="72%" />
          </div>
        </Card>
      )}
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

function DangerZoneSection({ deleting, onDelete }: { deleting: boolean; onDelete: () => void }) {
  return (
    <section id="section-danger-zone" className="detail-section">
      <SectionHeading tooltip="Permanent destructive actions for this commitment.">Danger zone</SectionHeading>
      <Card className="detail-danger-card">
        <div className="detail-danger-copy">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <p className="detail-danger-title">Delete this commitment</p>
            <p className="detail-danger-body">This permanently removes the commitment and its check-in history.</p>
          </div>
        </div>
        <Button variant="danger" onClick={onDelete} disabled={deleting}>
          <Trash2 size={16} aria-hidden="true" />
          {deleting ? 'Deleting...' : 'Delete'}
        </Button>
      </Card>
    </section>
  )
}

function CommitmentDetailSkeleton() {
  return (
    <div className="detail-two-col" aria-hidden="true">
      <div className="detail-content">
        <div className="detail-status-strip">
          <Skeleton variant="block" width={72} height={24} radius="var(--radius-pill)" />
          <Skeleton variant="block" width={110} height={24} radius="var(--radius-pill)" />
        </div>
        {[0, 1, 2, 3, 4].map((index) => (
          <section key={index} className="detail-section">
            <Skeleton variant="text" width="24%" height={22} />
            <Card className="detail-card">
              <div className="skeleton-card-content">
                <Skeleton variant="text" width="100%" />
                <Skeleton variant="text" width="76%" />
              </div>
            </Card>
          </section>
        ))}
      </div>
      <div className="detail-index-col">
        <Card>
          <div className="skeleton-card-content">
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" count={6} />
          </div>
        </Card>
      </div>
    </div>
  )
}

function CommitmentDetailReady({
  commitment,
  checkinStatus,
  deleting,
  onDelete
}: {
  commitment: Commitment
  checkinStatus: CheckinStatus | null
  deleting: boolean
  onDelete: () => void
}) {
  const navigate = useNavigate()
  const { me } = useAuth()
  const [shareOpen, setShareOpen] = useState(false)
  const { state: timelineState, timeline } = useTimeline(commitment.id)
  const events = useMemo(() => timeline?.events ?? [], [timeline?.events])
  const verified = verifiedCount(events)
  const totalCheckins = events.filter((event) => event.type === 'evidence').length
  const latestPassEvent = getLatestPassedEvidence(events)
  const canShareWin = commitment.status === 'completed' && verified > 0 && me?.persona != null

  return (
    <>
      <PageHeader
        title={commitmentTitle(commitment)}
        subtitle="Details, timing, and activity for this commitment."
        actions={
          <Button variant="accent" onClick={() => navigate(`/workspace/${commitment.id}`)}>
            <ExternalLink size={16} aria-hidden="true" />
            Open workspace
          </Button>
        }
      />

      <div className="detail-two-col">
        <div className="detail-content">
          <div className="detail-status-strip">
            <Chip variant={commitment.status === 'active' ? 'sage' : 'default'}>{statusLabel(commitment.status)}</Chip>
            <Chip variant={checkinStatus?.is_late ? 'accent' : 'default'}>
              {checkinStatus?.is_late ? 'Late check-in' : commitment.cadence}
            </Chip>
            <span className="detail-deadline-pill">Due {fmtMYT(commitment.deadline)}</span>
          </div>

          <OverviewSection commitment={commitment} events={events} verified={verified} totalCheckins={totalCheckins} />
          <NextStepSection
            commitment={commitment}
            checkinStatus={checkinStatus}
            events={events}
            canShareWin={canShareWin}
            onWorkspace={() => navigate(`/workspace/${commitment.id}`)}
            onShare={() => setShareOpen(true)}
          />
          <ProgressSection events={events} verified={verified} totalCheckins={totalCheckins} />
          <TermsSection commitment={commitment} />
          <TimelineSection state={timelineState} events={events} />
          <DangerZoneSection deleting={deleting} onDelete={onDelete} />
        </div>

        <div className="detail-index-col">
          <OnThisPage sections={DETAIL_SECTIONS} />
        </div>
      </div>

      {canShareWin && me?.persona != null && (
        <ShareWinDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          commitment={commitment}
          winDateIso={latestPassEvent?.at ?? new Date().toISOString()}
          persona={me.persona}
        />
      )}
    </>
  )
}

export function CommitmentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { notify } = useNotifications()
  const [state, setState] = useState<LoadState>('loading')
  const [commitment, setCommitment] = useState<Commitment | null>(null)
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadCommitment() {
      if (!id) {
        setCommitment(null)
        setState('idle')
        return
      }
      setState('loading')
      try {
        const c = await fetchCommitmentById(id)
        if (cancelled) return
        setCommitment(c)
        setState(c !== null ? 'ready' : 'idle')
      } catch {
        if (cancelled) return
        setCommitment(null)
        setState('idle')
      }
    }
    loadCommitment()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (commitment?.id) recordRecentCommitment(commitment.id)
  }, [commitment?.id])

  useEffect(() => {
    let cancelled = false
    if (!commitment?.id) {
      setCheckinStatus(null)
      return
    }
    fetchCheckinStatus(commitment.id).then((status) => {
      if (!cancelled) setCheckinStatus(status)
    })
    return () => {
      cancelled = true
    }
  }, [commitment?.id])

  async function handleDelete() {
    if (commitment === null) return
    setConfirmDeleteOpen(false)
    setDeleting(true)
    try {
      await deleteCommitment(commitment.id)
      notify('Commitment deleted.', { kind: 'success' })
      navigate('/commitments')
    } catch {
      notify('Could not delete this commitment. Please try again.', { kind: 'error' })
      setDeleting(false)
    }
  }

  if (commitment === null) {
    return (
      <div className="shell-page">
        <PageHeader title="Commitment" subtitle="Details and settings." />
        {state === 'loading' ? <CommitmentDetailSkeleton /> : <p className="page-not-found">Commitment not found.</p>}
      </div>
    )
  }

  return (
    <div className="shell-page">
      <Modal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        label="Confirm deletion"
        panelClassName="modal-panel-confirm"
      >
        <p className="commitments-confirm-heading">Delete this commitment?</p>
        <p className="commitments-confirm-body">
          This permanently deletes the commitment and all its check-in history. This cannot be undone.
        </p>
        <div className="commitments-confirm-actions">
          <Button variant="secondary" onClick={() => setConfirmDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            Delete permanently
          </Button>
        </div>
      </Modal>

      <CommitmentDetailReady
        commitment={commitment}
        checkinStatus={checkinStatus}
        deleting={deleting}
        onDelete={() => setConfirmDeleteOpen(true)}
      />
    </div>
  )
}
