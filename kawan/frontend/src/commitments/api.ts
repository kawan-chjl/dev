// Commitments API client — typed fetch wrappers, no deps.
// All calls use credentials:'include' so the HttpOnly session cookie rides along.

import type { Commitment } from '../types/api'

/**
 * GET /api/commitments/active
 * 200 → Commitment, 404 → null (idle — not an error), 401 → null, other non-OK → throws.
 */
export async function fetchActiveCommitment(): Promise<Commitment | null> {
  const res = await fetch('/api/commitments/active', { credentials: 'include' })
  if (res.ok) return (await res.json()) as Commitment
  if (res.status === 404 || res.status === 401) return null
  throw new Error(`/api/commitments/active returned ${res.status}`)
}

/**
 * POST /api/commitments — create a new commitment.
 * 201 → CommitmentOut. Throws on non-201, with the response body surfaced for 422 (past deadline).
 */
export async function createCommitment(body: {
  action: string
  deliverable: string
  deadline: string
}): Promise<Commitment> {
  const res = await fetch('/api/commitments', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (res.status === 201) return (await res.json()) as Commitment
  // Surface the response body so callers can extract validation details (422 = past deadline).
  let detail = `POST /api/commitments returned ${res.status}`
  try {
    const json = (await res.json()) as { detail?: string }
    if (json.detail) detail = String(json.detail)
  } catch {
    // Ignore parse errors — use the status-code message.
  }
  const err = new Error(detail)
  ;(err as Error & { status: number }).status = res.status
  throw err
}

/**
 * PATCH /api/commitments/{id} — update safe hard fields (cadence, evidence_type, etc.).
 * Sends only the fields provided (exclude_unset mirrors the server). 200 → updated CommitmentOut.
 */
export async function patchCommitment(
  id: string,
  changes: {
    cadence?: string
    evidence_type?: string
    evidence_config?: Record<string, unknown>
    skip_days_total?: number
    deadline?: string
    deliverable?: string
    stake_enabled?: boolean
    stake_contact_name?: string
    stake_contact_email?: string
  }
): Promise<Commitment> {
  const res = await fetch(`/api/commitments/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes)
  })
  if (res.ok) return (await res.json()) as Commitment
  throw new Error(`PATCH /api/commitments/${id} returned ${res.status}`)
}

/**
 * POST /api/commitments/{id}/start — draft → active; registers scheduler jobs.
 * 200 → CommitmentOut with status:'active'.
 */
export async function startCommitment(id: string): Promise<Commitment> {
  const res = await fetch(`/api/commitments/${id}/start`, {
    method: 'POST',
    credentials: 'include'
  })
  if (res.ok) return (await res.json()) as Commitment
  throw new Error(`POST /api/commitments/${id}/start returned ${res.status}`)
}
