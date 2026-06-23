// Timeline — V5 "Momentum journey"
// Doodle journey-line with terracotta iris-dots for check-ins.
// Verdicts: pass/fail/unclear rendered per TR-64 (unclear = neutral, misses = neutral gaps not red).

import { getActiveCommitment, getTimeline } from '../../mock/provider'
import type { TimelineEvent } from '../../types/api'
import { Chip } from '../../ui/Chip'

function verdictChipVariant(verdict: 'pass' | 'fail' | 'unclear'): 'pass' | 'fail' | 'unclear' {
  return verdict
}

function formatAt(iso: string): string {
  return new Date(iso).toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function CheckinEventRow({ event }: { event: Extract<TimelineEvent, { type: 'checkin' }> }) {
  return (
    <div className="timeline-event checkin-event">
      <div className="timeline-dot timeline-dot-checkin" aria-hidden="true" />
      <div className="timeline-event-body">
        <div className="timeline-event-header">
          <Chip variant="accent">{event.kind}</Chip>
          <span className="timeline-event-time">{formatAt(event.at)}</span>
        </div>
        <p className="timeline-event-message">{event.message}</p>
      </div>
    </div>
  )
}

function EvidenceEventRow({ event }: { event: Extract<TimelineEvent, { type: 'evidence' }> }) {
  const verdictLabel: Record<string, string> = {
    pass: 'pass',
    fail: 'no pass', // TR-64: honest, not punishing
    unclear: 'not sure yet' // design.md §9: curious, never punishing
  }
  return (
    <div className="timeline-event evidence-event">
      <div className="timeline-dot timeline-dot-evidence" aria-hidden="true" />
      <div className="timeline-event-body">
        <div className="timeline-event-header">
          <Chip variant={verdictChipVariant(event.verdict)}>{verdictLabel[event.verdict]}</Chip>
          <Badge>{event.adapter}</Badge>
          <span className="timeline-event-time">{formatAt(event.at)}</span>
        </div>
        {event.reasoning != null && <p className="timeline-event-message">{event.reasoning}</p>}
      </div>
    </div>
  )
}

function ProposalEventRow({ event }: { event: Extract<TimelineEvent, { type: 'proposal' }> }) {
  return (
    <div className="timeline-event proposal-event">
      <div className="timeline-dot timeline-dot-proposal" aria-hidden="true" />
      <div className="timeline-event-body">
        <div className="timeline-event-header">
          <Chip variant="default">proposal · {event.field}</Chip>
          <Chip variant={event.status === 'open' ? 'accent' : 'default'}>{event.status}</Chip>
          <span className="timeline-event-time">{formatAt(event.at)}</span>
        </div>
        <p className="timeline-event-message">{event.reason}</p>
        {event.status === 'open' && (
          <div className="proposal-actions">
            <button type="button" className="proposal-btn" disabled>
              Apply
            </button>
            <button type="button" className="proposal-btn proposal-btn-dismiss" disabled>
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Small inline badge for evidence rows (variant not rendered visually in skeleton)
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="badge badge-default" style={{ textTransform: 'capitalize' }}>
      {children}
    </span>
  )
}

export function Timeline() {
  const active = getActiveCommitment()
  const timeline = active != null ? getTimeline(active.id) : null

  return (
    <div className="shell-page">
      <div className="page-header">
        <h2>Timeline</h2>
        <p className="page-subtitle">Your momentum journey — every check-in, every verdict.</p>
      </div>

      {timeline == null ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">
            ~
          </div>
          <p>No timeline yet. Start a commitment to begin.</p>
        </div>
      ) : (
        <div className="timeline-container">
          {timeline.events.map((event) => {
            if (event.type === 'checkin') return <CheckinEventRow key={`checkin-${event.at}`} event={event} />
            if (event.type === 'evidence') return <EvidenceEventRow key={`evidence-${event.at}`} event={event} />
            if (event.type === 'proposal') return <ProposalEventRow key={`proposal-${event.at}`} event={event} />
            return null
          })}
        </div>
      )}
    </div>
  )
}
