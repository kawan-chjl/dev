// Commitments API client — typed fetch wrappers, no deps.
// All calls use credentials:'include' so the HttpOnly session cookie rides along.

import type { AuditRow, Commitment } from '../types/api'

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

/**
 * POST /api/commitments/{id}/abandon — closes a commitment via the missed path.
 * 200 → updated CommitmentOut. Tolerates 409 (already closed).
 */
export async function abandonCommitment(id: string): Promise<void> {
  const res = await fetch(`/api/commitments/${id}/abandon`, {
    method: 'POST',
    credentials: 'include'
  })
  if (res.ok || res.status === 409) return
  throw new Error(`POST /api/commitments/${id}/abandon returned ${res.status}`)
}

/**
 * DELETE /api/commitments/{id} — permanently deletes a commitment and all its related rows.
 * 204 on success. Throws on non-204.
 */
export async function deleteCommitment(id: string): Promise<void> {
  const res = await fetch(`/api/commitments/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  if (res.status === 204) return
  throw new Error(`DELETE /api/commitments/${id} returned ${res.status}`)
}

/**
 * GET /api/me/history — lists the current user's audit-log rows, newest-first.
 * 200 → AuditRow[]. 401 → []. Other non-OK → throws.
 */
export async function fetchHistory(): Promise<AuditRow[]> {
  const res = await fetch('/api/me/history', { credentials: 'include' })
  if (res.ok) return (await res.json()) as AuditRow[]
  if (res.status === 401) return []
  throw new Error(`GET /api/me/history returned ${res.status}`)
}

/**
 * DELETE /api/me/history — permanently deletes the current user's audit log rows.
 * 204 on success. Throws on non-204.
 */
export async function clearHistory(): Promise<void> {
  const res = await fetch('/api/me/history', {
    method: 'DELETE',
    credentials: 'include'
  })
  if (res.status === 204) return
  throw new Error(`DELETE /api/me/history returned ${res.status}`)
}

/**
 * DELETE /api/me/data — permanently deletes all the user's commitments and related data.
 * Keeps the user account/session. 204 on success. Throws on non-204.
 */
export async function deleteMyData(): Promise<void> {
  const res = await fetch('/api/me/data', {
    method: 'DELETE',
    credentials: 'include'
  })
  if (res.status === 204) return
  throw new Error(`DELETE /api/me/data returned ${res.status}`)
}
