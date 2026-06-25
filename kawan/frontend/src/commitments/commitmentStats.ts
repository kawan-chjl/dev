// commitmentStats.ts — derive the four stat figures from a list of commitments + their events.
// With one commitment (OQ-1) this equals today's Home values.

import { evidencePassRate, verifiedCount } from '../timeline/metrics'
import type { Commitment, TimelineEvent } from '../types/api'

export interface CommitmentStats {
  verified: number
  checkins: number
  passRate: number | null
  restDaysLeft: number
}

export function deriveCommitmentStats(
  commitments: Commitment[],
  eventsByCommitment: Map<string, TimelineEvent[]>
): CommitmentStats {
  let verified = 0
  let checkins = 0
  const allEvents: TimelineEvent[] = []
  let restDaysLeft = 0

  for (const c of commitments) {
    const events = eventsByCommitment.get(c.id) ?? []
    verified += verifiedCount(events)
    checkins += events.filter((e) => e.type === 'evidence').length
    allEvents.push(...events)
    restDaysLeft += c.skip_days_total - c.skip_days_used
  }

  const passRate = evidencePassRate(allEvents)
  return { verified, checkins, passRate, restDaysLeft }
}
