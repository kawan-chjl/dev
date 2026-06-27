// ActivityCard — top-left vertical card of recent notable timeline events.
// Shows check-ins, verdicts, applied proposals, and client-side milestones with MYT date+time.
// Data: GET /{id}/timeline (useTimeline hook) merged with client milestones (e.g. context captured).
// Refreshes the timeline whenever refreshSignal changes. Empty state when no events.

import { Activity } from 'lucide-react'
import { useEffect } from 'react'
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

export interface ActivityMilestone {
  at: string
  label: string
}

interface ActivityRow {
  at: string
  label: string
}

interface ActivityCardProps {
  commitmentId: string
  milestones?: ActivityMilestone[]
  refreshSignal?: number
}

export function ActivityCard({ commitmentId, milestones = [], refreshSignal = 0 }: ActivityCardProps) {
  const { state, timeline, refresh } = useTimeline(commitmentId)

  useEffect(() => {
    if (refreshSignal > 0) void refresh()
  }, [refreshSignal, refresh])

  const backendRows: ActivityRow[] = (timeline?.events ?? [])
    .filter(isNotable)
    .map((ev) => ({ at: ev.at, label: eventLabel(ev) }))

  const rows: ActivityRow[] = [...backendRows, ...milestones].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6)

  return (
    <div className="ws-island activity-card">
      <div className="ws-island-header activity-card-header">
        <Activity size={14} aria-hidden="true" />
        <span className="ws-island-title">Activity</span>
      </div>

      <div className="ws-island-body activity-card-body">
        {state === 'loading' && rows.length === 0 && (
          <p className="ws-island-empty" role="status" aria-live="polite">
            Loading...
          </p>
        )}

        {state !== 'loading' && rows.length === 0 && <p className="ws-island-empty">No activity yet.</p>}

        {rows.map((row, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: merged rows have no stable id
            key={i}
            className="activity-event-row"
          >
            <span className="activity-event-time">{fmtMYT(row.at)}</span>
            <span className="activity-event-label">{row.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
