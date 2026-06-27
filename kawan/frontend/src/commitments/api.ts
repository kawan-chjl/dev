// Commitments API client — typed fetch wrappers, no deps.
// All calls use credentials:'include' so the HttpOnly session cookie rides along.

import type { AuditRow, Commitment, Emotion } from '../types/api'

/** Soft-context slots returned by the intake AI (§9.2-A). */
export interface IntakeSlots {
  why: string | null
  obstacles: string | null
  time_constraints: string | null
  skill: string | null
}

/** Response from POST /api/commitments/{id}/context/turn */
export interface ContextTurnResponse {
  say: string
  slots: IntakeSlots
  intake_complete: boolean
  emotion: Emotion
}

/**
 * POST /api/commitments/{id}/context/turn  { say }
 * Empty `say` triggers the opener question (backend prompt handles "").
 * Throws on non-OK.
 */
export async function contextTurn(commitmentId: string, say: string): Promise<ContextTurnResponse> {
  const res = await fetch(`/api/commitments/${commitmentId}/context/turn`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ say })
  })
  if (res.ok) return (await res.json()) as ContextTurnResponse
  // Try to extract the backend's friendly message from the 503 body before throwing.
  let message = `POST /api/commitments/${commitmentId}/context/turn returned ${res.status}`
  try {
    const body = (await res.json()) as { say?: string; detail?: string }
    if (body.say) message = body.say
    else if (body.detail) message = String(body.detail)
  } catch {
    // Ignore parse errors — fall through to the status-code message.
  }
  throw new Error(message)
}

/** Paginated envelope from GET /api/commitments */
export interface CommitmentListPage {
  items: Commitment[]
  total: number
  limit: number
  offset: number
}

/**
 * GET /api/commitments?limit=&offset=
 * 200 → CommitmentListPage. 401 → empty envelope. Other non-OK → throws.
 */
export async function fetchCommitments(limit: number, offset: number): Promise<CommitmentListPage> {
  const res = await fetch(`/api/commitments?limit=${limit}&offset=${offset}`, { credentials: 'include' })
  if (res.ok) return (await res.json()) as CommitmentListPage
  if (res.status === 401) return { items: [], total: 0, limit, offset }
  throw new Error(`GET /api/commitments returned ${res.status}`)
}

/**
 * GET /api/commitments/{id} — fetch a single commitment by id.
 * 200 → Commitment. 404/401 → null. Other non-OK → throws.
 * Falls back to fetching the list and finding by id if the by-id route is unavailable.
 */
export async function fetchCommitmentById(id: string): Promise<Commitment | null> {
  const res = await fetch(`/api/commitments/${id}`, { credentials: 'include' })
  if (res.ok) return (await res.json()) as Commitment
  if (res.status === 401 || res.status === 404) return null
  // 405 = route exists but GET not registered; fall back to listing and filtering.
  // Also fall back for unexpected server errors to keep the UI resilient.
  if (res.status === 405 || res.status >= 500) {
    try {
      const page = await fetchCommitments(100, 0)
      return page.items.find((c) => c.id === id) ?? null
    } catch {
      return null
    }
  }
  throw new Error(`GET /api/commitments/${id} returned ${res.status}`)
}

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
    notify_email?: string
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
