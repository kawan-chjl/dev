// keyEvents.ts — detect post-context VN key-event states for the workspace.
// Three sanctioned post-intake VN event types:
//   'checkin'      — a normal due check-in (brief msg + 3 submission methods)
//   'late-checkin' — past the grace window (reprimand msg + same methods)
//   'failure'      — user returns past deadline with terminal/missed status
// All other workspace states show open chat with no VN options.

import type { CommitmentStatus } from '../types/api'

export type KeyEventKind = 'checkin' | 'late-checkin' | 'failure' | null

export interface CheckinStatus {
  due_at: string | null
  is_late: boolean
  escalation: number
  last_pass_at: string | null
}

/**
 * detectKeyEvent — determine the current post-context VN event type.
 *
 * Failure: the user is on a commitment whose status is 'missed' or whose
 * deadline has passed AND status is 'verifying' (verifying-missed window).
 * Late check-in: is_late === true (backend window-derived grace expired).
 * Check-in: due_at is in the future or recent + is_late === false.
 */
export function detectKeyEvent(
  status: CommitmentStatus,
  deadline: string,
  checkinStatus: CheckinStatus | null
): KeyEventKind {
  const now = Date.now()
  const deadlineMs = new Date(deadline).getTime()

  // Commitment failure — terminal state or deadline passed with missed status
  if (status === 'missed') return 'failure'
  if (status === 'lapsed' && deadlineMs < now) return 'failure'

  // No checkin-status loaded yet — no VN options
  if (!checkinStatus) return null

  // Due check-in
  if (checkinStatus.due_at) {
    return checkinStatus.is_late ? 'late-checkin' : 'checkin'
  }

  return null
}

/**
 * GET /api/commitments/{id}/checkin-status
 * Returns due_at, is_late, escalation. Returns null on error (non-fatal).
 */
export async function fetchCheckinStatus(commitmentId: string): Promise<CheckinStatus | null> {
  try {
    const res = await fetch(`/api/commitments/${commitmentId}/checkin-status`, {
      credentials: 'include'
    })
    if (!res.ok) return null
    return (await res.json()) as CheckinStatus
  } catch {
    return null
  }
}

/**
 * GET /api/commitments/{id}/soft-context
 * Returns all 4 slots. Returns null on error (non-fatal).
 */
export interface SoftContextSlots {
  why: string | null
  obstacles: string | null
  time_constraints: string | null
  skill: string | null
}

export async function fetchSoftContext(commitmentId: string): Promise<SoftContextSlots | null> {
  try {
    const res = await fetch(`/api/commitments/${commitmentId}/soft-context`, {
      credentials: 'include'
    })
    if (!res.ok) return null
    return (await res.json()) as SoftContextSlots
  } catch {
    return null
  }
}

/** Count non-null slots — used for return-phase detection. */
export function countFilledSlots(slots: SoftContextSlots): number {
  return [slots.why, slots.obstacles, slots.time_constraints, slots.skill].filter((v) => v !== null).length
}
