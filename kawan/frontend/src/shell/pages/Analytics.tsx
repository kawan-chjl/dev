// Analytics — /analytics (was /timeline)
// Pure analytics page: AnalyticsPanel over the active commitment's events.
// No event feed (moved to /commitments/:id). No "Check now" button.
// "No Records Yet" placeholder when there are no commitments.

import { TrendingUp } from 'lucide-react'
import { useCommitments } from '../../commitments/useCommitments'
import { AnalyticsPanel } from '../../timeline/AnalyticsPanel'
import { useTimeline } from '../../timeline/useTimeline'
import { Card } from '../../ui/Card'
import { PageHeader } from '../PageHeader'

function AnalyticsContent({ commitmentId }: { commitmentId: string }) {
  const { state, timeline } = useTimeline(commitmentId)
  const events = timeline?.events ?? []

  if (state === 'loading') {
    return <p className="timeline-loading">Loading...</p>
  }

  if (state === 'empty' || events.length === 0) {
    return (
      <Card className="empty-state-card">
        <div className="empty-state-icon-wrap" aria-hidden="true">
          <TrendingUp size={40} color="var(--ink-faint)" aria-hidden="true" />
        </div>
        <p className="empty-state-heading">No check-ins yet</p>
        <p className="empty-state-body">
          Your analytics fill in as you and Kawan go back and forth. Start a commitment to begin.
        </p>
      </Card>
    )
  }

  return <AnalyticsPanel events={events} />
}

export function Analytics() {
  const { state, commitments } = useCommitments()
  const commitment = commitments[0] ?? null

  const noRecords = state !== 'loading' && commitment === null

  return (
    <div className="shell-page">
      <PageHeader title="Analytics" subtitle="Your check-ins and verdicts over time." />

      {state === 'loading' && <p className="timeline-loading">Loading...</p>}

      {noRecords && (
        <Card className="analytics-no-records-card">
          <div className="empty-state-icon-wrap" aria-hidden="true">
            <TrendingUp size={40} color="var(--ink-faint)" aria-hidden="true" />
          </div>
          <p className="empty-state-heading">No Records Yet</p>
          <p className="empty-state-body">Make a commitment and start checking in to see your analytics here.</p>
        </Card>
      )}

      {!noRecords && commitment !== null && <AnalyticsContent commitmentId={commitment.id} />}
    </div>
  )
}
