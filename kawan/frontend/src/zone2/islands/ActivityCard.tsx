// ActivityCard — top-left vertical card of recent notable timeline events.
// Shows check-ins, verdicts, and applied proposals with MYT date+time.
// Data: GET /{id}/timeline (useTimeline hook), filtered to notable events.
// Empty state when no events.

import { Activity } from 'lucide-react'
import { useTimeline } from '../../timeline/useTimeline'
import type { TimelineEvent } from '../../types/api'

const MYT_FORMAT: Intl.DateTimeFormatOptions = {
  timeZone: 'Asia/Kuala_Lumpur',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
}

function fmtMYT(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-MY', MYT_FORMAT)
  } catch {
    return iso
  }
}

/** Filter to events worth showing in the activity card. */
function isNotable(ev: TimelineEvent): boolean {
  if (ev.type === 'checkin') return true
  if (ev.type === 'evidence') return true
  if (ev.type === 'proposal' && ev.status === 'applied') return true
  return false
}

function eventLabel(ev: TimelineEvent): string {
  if (ev.type === 'checkin') {
    return `Check-in (${ev.kind.replace('_', ' ')})`
  }
  if (ev.type === 'evidence') {
    const v = ev.verdict
    if (v === 'pass') return 'Evidence: passed'
    if (v === 'fail') return 'Evidence: not accepted'
    return 'Evidence: needs context'
  }
  if (ev.type === 'proposal') {
    return `Proposal applied: ${ev.field}`
  }
  return 'Activity'
}

interface ActivityCardProps {
  commitmentId: string
}

export function ActivityCard({ commitmentId }: ActivityCardProps) {
  const { state, timeline } = useTimeline(commitmentId)

  const notableEvents =
    timeline?.events
      .filter(isNotable)
      .slice(-6) // show latest 6 events
      .reverse() ?? []

  return (
    <div className="ws-island activity-card">
      <div className="ws-island-header activity-card-header">
        <Activity size={14} aria-hidden="true" />
        <span className="ws-island-title">Activity</span>
      </div>

      <div className="ws-island-body activity-card-body">
        {state === 'loading' && (
          <p className="ws-island-empty" role="status" aria-live="polite">
            Loading...
          </p>
        )}

        {state !== 'loading' && notableEvents.length === 0 && <p className="ws-island-empty">No activity yet.</p>}

        {notableEvents.map((ev, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: timeline events have no stable id in the union
            key={i}
            className="activity-event-row"
          >
            <span className="activity-event-time">{fmtMYT(ev.at)}</span>
            <span className="activity-event-label">{eventLabel(ev)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
