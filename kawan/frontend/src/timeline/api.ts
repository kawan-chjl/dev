// Timeline API client — typed fetch wrappers for the timeline GET and check-in trigger.
// All calls use credentials:'include' so the HttpOnly session cookie rides along.

import type { Timeline } from '../types/api'

/**
 * GET /api/commitments/:id/timeline
 * 200 → Timeline, 404 → null (empty/not-found, not an error), 401 → null, other non-OK → throws.
 */
export async function fetchTimeline(commitmentId: string): Promise<Timeline | null> {
  const res = await fetch(`/api/commitments/${commitmentId}/timeline`, { credentials: 'include' })
  if (res.ok) return (await res.json()) as Timeline
  if (res.status === 404 || res.status === 401) return null
  throw new Error(`/api/commitments/${commitmentId}/timeline returned ${res.status}`)
}

/**
 * POST /api/commitments/:id/check — on-demand check-in (the demo determinism lever, TR-16).
 * Identical pipeline to the cron tick. Resolves on 2xx, throws on non-OK.
 */
export async function triggerCheckNow(commitmentId: string): Promise<void> {
  const res = await fetch(`/api/commitments/${commitmentId}/check`, {
    method: 'POST',
    credentials: 'include'
  })
  if (!res.ok) throw new Error(`POST /api/commitments/${commitmentId}/check returned ${res.status}`)
}

/**
 * POST /api/commitments/:id/debrief { note } — persist the post-outcome reflection (spec §5.6).
 * Merges the note into the terminal success_patterns.features.debrief on the server.
 * Resolves on 2xx, throws on non-OK.
 */
export async function postDebrief(commitmentId: string, note: string): Promise<void> {
  const res = await fetch(`/api/commitments/${commitmentId}/debrief`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note })
  })
  if (!res.ok) throw new Error(`POST /api/commitments/${commitmentId}/debrief returned ${res.status}`)
}

/**
 * GET /api/me/stats — verified win count for identity titles (spec §11.4, TR-74).
 * 200 → { verified_wins }, 401 → null, other non-OK → throws.
 */
export async function fetchStats(): Promise<{ verified_wins: number } | null> {
  const res = await fetch('/api/me/stats', { credentials: 'include' })
  if (res.ok) return (await res.json()) as { verified_wins: number }
  if (res.status === 401) return null
  throw new Error(`/api/me/stats returned ${res.status}`)
}

// ── WS message union (server → client pushes) ──────────────────────────────────────
// Mirrors pipeline.py:90-201 exactly. NOT the timeline GET shape — never merge these.
// workspace/error are included so they can be ignored without a type error (A3 scope).

export type WsServerMessage =
  | { type: 'checkin'; kind: string; say: string; emotion?: string; escalation?: number; evidence_id?: string | null }
  | { type: 'winback'; say: string }
  | {
      type: 'verdict'
      verdict: 'pass' | 'fail' | 'unclear'
      observations?: string | null
      reasoning?: string | null
      follow_up_request?: string | null
      evidence_id?: string | null
    }
  | { type: 'celebration'; say: string }
  | { type: 'reckoning'; say: string; stake?: string | null }
  | { type: 'workspace' }
  | { type: 'error'; say?: string }
