// eventRows.tsx — shared event row components extracted from Timeline.tsx.
// Used by CommitmentDetail (timeline section) and any other consumer.

import type { TimelineEvent } from '../types/api'
import { Chip } from '../ui/Chip'

// Small inline badge (separate from ui/Badge to keep the italic-style for adapters)
export function InlineBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="badge badge-default" style={{ textTransform: 'capitalize' }}>
      {children}
    </span>
  )
}

function formatAt(iso: string): string {
  return new Date(iso).toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function verdictChipVariant(verdict: 'pass' | 'fail' | 'unclear'): 'pass' | 'fail' | 'unclear' {
  return verdict
}

export function CheckinEventRow({ event }: { event: Extract<TimelineEvent, { type: 'checkin' }> }) {
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

export function EvidenceEventRow({ event }: { event: Extract<TimelineEvent, { type: 'evidence' }> }) {
  const verdictLabel: Record<string, string> = {
    pass: 'pass',
    fail: 'no pass',
    unclear: 'not sure yet'
  }
  return (
    <div className="timeline-event evidence-event">
      <div className="timeline-dot timeline-dot-evidence" aria-hidden="true" />
      <div className="timeline-event-body">
        <div className="timeline-event-header">
          <Chip variant={verdictChipVariant(event.verdict)}>{verdictLabel[event.verdict]}</Chip>
          <InlineBadge>{event.adapter}</InlineBadge>
          <span className="timeline-event-time">{formatAt(event.at)}</span>
        </div>
        {event.reasoning != null && <p className="timeline-event-message">{event.reasoning}</p>}
      </div>
    </div>
  )
}

export function ProposalEventRow({ event }: { event: Extract<TimelineEvent, { type: 'proposal' }> }) {
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
