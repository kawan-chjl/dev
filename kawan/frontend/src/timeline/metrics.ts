// metrics.ts — pure functions over TimelineEvent[].
// No React import. No streak functions (spec forbids streaks).

import type { TimelineEvent } from '../types/api'

export interface VerdictBreakdown {
  verified: number // verdict === 'pass'
  notSureYet: number // verdict === 'unclear'
  noPass: number // verdict === 'fail'
}

export interface DayCount {
  date: string // YYYY-MM-DD
  count: number
}

/** Count of evidence events with verdict 'pass' */
export function verifiedCount(events: TimelineEvent[]): number {
  return events.filter((e) => e.type === 'evidence' && e.verdict === 'pass').length
}

/** Breakdown of evidence verdicts (pass / unclear / fail) */
export function verdictBreakdown(events: TimelineEvent[]): VerdictBreakdown {
  const evidenceEvents = events.filter((e): e is Extract<TimelineEvent, { type: 'evidence' }> => e.type === 'evidence')
  return {
    verified: evidenceEvents.filter((e) => e.verdict === 'pass').length,
    notSureYet: evidenceEvents.filter((e) => e.verdict === 'unclear').length,
    noPass: evidenceEvents.filter((e) => e.verdict === 'fail').length
  }
}

/** Count check-in events per calendar day (for bar/area chart) */
export function checkinsOverTime(events: TimelineEvent[]): DayCount[] {
  const checkIns = events.filter((e): e is Extract<TimelineEvent, { type: 'checkin' }> => e.type === 'checkin')
  const byDay = new Map<string, number>()
  for (const e of checkIns) {
    const date = e.at.slice(0, 10) // YYYY-MM-DD
    byDay.set(date, (byDay.get(date) ?? 0) + 1)
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

/** Pass rate as a percentage (0-100), or null if no evidence events */
export function evidencePassRate(events: TimelineEvent[]): number | null {
  const evidenceEvents = events.filter((e) => e.type === 'evidence')
  if (evidenceEvents.length === 0) return null
  const passes = events.filter((e) => e.type === 'evidence' && e.verdict === 'pass').length
  return Math.round((passes / evidenceEvents.length) * 100)
}
