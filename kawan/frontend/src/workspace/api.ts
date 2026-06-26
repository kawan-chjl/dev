// Workspace API client — typed fetch wrappers for the B5 workspace/turn endpoint + proposal apply.
// Mirrors timeline/api.ts pattern: credentials:'include', throws on non-OK.

import type { Commitment, Emotion } from '../types/api'

export type ProposalField = 'deadline' | 'deliverable' | 'cadence' | 'evidence_type' | 'stake'

export interface WorkspaceProposal {
  field: ProposalField
  proposed_value: string
  reason: string
}

export interface WorkspaceTurnResponse {
  response_type: 'coaching' | 'refusal' | 'proposal'
  say: string
  proposal: WorkspaceProposal | null
  emotion: Emotion
  proposal_id?: string
}

/**
 * A single message in the workspace transcript (React state only — no DB).
 * Client-generated id (crypto.randomUUID) for stable React keys.
 */
export interface WorkspaceMessage {
  id: string
  from: 'user' | 'kawan'
  text: string
  emotion?: Emotion
  responseType?: 'coaching' | 'refusal' | 'proposal'
  proposal?: WorkspaceProposal | null
  proposalId?: string
  /** Client-side card state — never persisted. */
  proposalState?: 'open' | 'applied' | 'dismissed'
}

/**
 * POST /api/commitments/{id}/workspace/turn  { say }
 * 200 → WorkspaceTurnResponse. Throws on non-OK.
 * History arg is additive-ready: extend this signature when the backend accepts prior turns (C6).
 */
export async function workspaceTurn(commitmentId: string, say: string): Promise<WorkspaceTurnResponse> {
  const res = await fetch(`/api/commitments/${commitmentId}/workspace/turn`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ say })
  })
  if (res.ok) return (await res.json()) as WorkspaceTurnResponse
  throw new Error(`POST /api/commitments/${commitmentId}/workspace/turn returned ${res.status}`)
}

/**
 * POST /api/commitments/{id}/proposals/{pid}/apply
 * 200 → updated CommitmentOut. 409 → already applied (treat as success). Throws on other non-OK.
 */
export async function applyProposal(commitmentId: string, proposalId: string): Promise<Commitment> {
  const res = await fetch(`/api/commitments/${commitmentId}/proposals/${proposalId}/apply`, {
    method: 'POST',
    credentials: 'include'
  })
  if (res.ok) return (await res.json()) as Commitment
  if (res.status === 409) return (await res.json()) as Commitment
  throw new Error(`POST /api/commitments/${commitmentId}/proposals/${proposalId}/apply returned ${res.status}`)
}
