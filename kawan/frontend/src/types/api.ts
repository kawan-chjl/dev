// API contract types — mirrors backend schemas.py / routes exactly.
// When swapping mock → real, replace src/mock/provider.ts; these types stay.

export type Persona = 'kawan' | 'adik' | 'cik_maid'

/** TR-34 emotion enum — drives Live2D expressions (TR-09). */
export type Emotion = 'neutral' | 'curious' | 'pleased' | 'skeptical' | 'concerned' | 'proud'

export type EvidenceType = 'github' | 'screenshot'

export type CommitmentStatus = 'draft' | 'active' | 'lapsed' | 'verifying' | 'grace' | 'completed' | 'missed'

export type Verdict = 'pass' | 'fail' | 'unclear'

export interface Me {
  username: string
  persona: Persona
  guest: boolean
  balance: number | null
}

/** Mirrors CommitmentOut from backend schemas.py */
export interface Commitment {
  id: string
  action: string
  deliverable: string
  deadline: string // ISO 8601
  cadence: string // e.g. "daily", "every 2 days"
  evidence_type: EvidenceType
  evidence_config: Record<string, unknown> | null
  stake_enabled: boolean
  stake_contact_name: string | null
  stake_contact_email: string | null
  notify_email: string | null // X-NOTIF: the user's own reminder email
  skip_days_total: number
  skip_days_used: number
  status: CommitmentStatus
  escalation: 0 | 1 | 2
  created_at: string // ISO 8601
}

/** GET /api/commitments/:id/timeline events (discriminated union on type) */
export type TimelineEvent = CheckinEvent | EvidenceEvent | ProposalEvent

export interface CheckinEvent {
  type: 'checkin'
  kind: 'cadence' | 'on_demand' | 'deadline' | 'winback'
  message: string
  escalation: 0 | 1 | 2
  delivered_via: 'ws' | 'webpush' | 'timeline' | null
  evidence_id: string | null
  at: string // ISO 8601
}

export interface EvidenceEvent {
  type: 'evidence'
  adapter: EvidenceType
  verdict: Verdict
  reasoning: string | null
  at: string
}

export interface ProposalEvent {
  type: 'proposal'
  field: 'deadline' | 'deliverable' | 'cadence' | 'evidence_type' | 'stake'
  status: 'open' | 'applied' | 'dismissed'
  reason: string
  at: string
}

export interface Timeline {
  status: CommitmentStatus
  escalation: 0 | 1 | 2
  events: TimelineEvent[]
}

export interface PersonaPreset {
  id: Persona
  name: string
  archetype: string
  tone: string
}

export interface AuditRow {
  id: string
  field: string
  old_value: string | null
  new_value: string
  actor: 'user' | 'system'
  at: string
}
