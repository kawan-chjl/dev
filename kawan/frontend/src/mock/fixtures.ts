// Typed mock fixtures — shapes mirror backend contracts exactly.
// Every field matches the types in src/types/api.ts.

import type { AuditRow, Commitment, Me, PersonaPreset, Timeline } from '../types/api'

export const mockMe: Me = {
  username: 'adam_dev',
  persona: 'kawan',
  guest: false,
  balance: 12.48
}

export const mockActiveCommitment: Commitment = {
  id: 'cmit_001',
  action: 'complete',
  deliverable: 'the Kawan frontend skeleton with all 11 routes',
  deadline: '2026-06-30T23:59:00+08:00',
  cadence: 'daily',
  evidence_type: 'github',
  evidence_config: { repo: 'kawan-chjl/dev', branch: 'main' },
  stake_enabled: false,
  stake_contact_name: null,
  stake_contact_email: null,
  skip_days_total: 1,
  skip_days_used: 0,
  status: 'active',
  escalation: 0,
  created_at: '2026-06-23T10:00:00+08:00'
}

export const mockTimeline: Timeline = {
  status: 'active',
  escalation: 0,
  events: [
    {
      type: 'checkin',
      kind: 'cadence',
      message: "I see you've been pushing code. Let's see if it actually does anything useful.",
      escalation: 0,
      delivered_via: 'ws',
      evidence_id: null,
      at: '2026-06-23T09:00:00+08:00'
    },
    {
      type: 'evidence',
      adapter: 'github',
      verdict: 'pass',
      reasoning: 'Found 3 commits in the window matching the deliverable scope.',
      at: '2026-06-23T09:05:00+08:00'
    },
    {
      type: 'checkin',
      kind: 'on_demand',
      message: 'Still watching. The work looks real enough, I suppose.',
      escalation: 0,
      delivered_via: 'timeline',
      evidence_id: null,
      at: '2026-06-23T14:00:00+08:00'
    },
    {
      type: 'evidence',
      adapter: 'github',
      verdict: 'unclear',
      reasoning: 'Commits exist but scope overlap with the deliverable is ambiguous.',
      at: '2026-06-23T14:06:00+08:00'
    },
    {
      type: 'proposal',
      field: 'cadence',
      status: 'open',
      reason:
        'Daily check-ins seem to be landing when you are already in flow. Switching to every 2 days might serve you better.',
      at: '2026-06-23T15:00:00+08:00'
    }
  ]
}

export const mockAuditRows: AuditRow[] = [
  {
    id: 'aud_001',
    field: 'deadline',
    old_value: '2026-06-28T23:59:00+08:00',
    new_value: '2026-06-30T23:59:00+08:00',
    actor: 'user',
    at: '2026-06-23T11:30:00+08:00'
  },
  {
    id: 'aud_002',
    field: 'status',
    old_value: 'draft',
    new_value: 'active',
    actor: 'system',
    at: '2026-06-23T10:05:00+08:00'
  }
]

export const mockPersonas: PersonaPreset[] = [
  {
    id: 'kawan',
    name: 'Kawan',
    archetype: 'Skeptical Concierge',
    tone: 'Candid, warm, slightly dry. Believes in you because you have proven it. Not because you said so.'
  },
  {
    id: 'adik',
    name: 'Adik',
    archetype: 'Gentle Cheerleader',
    tone: 'Encouraging and kind. Celebrates every step, asks about obstacles with genuine curiosity.'
  },
  {
    id: 'cik_maid',
    name: 'Cik Maid',
    archetype: 'Playful Taskmaster',
    tone: 'Brisk, playful, expects results. Gets things done with a wink.'
  }
]

export interface ConversationTurn {
  speaker: 'kawan' | 'user'
  text: string
  /** If set, this turn requires user action — type determines which surface to render */
  action?: 'options' | 'input' | 'proposal'
  /** Options for action='options' */
  options?: string[]
  /** Optional emotion tag (TR-34) — drives expression + voice tone together (D2/D3 seam) */
  emotion?: import('../types/api').Emotion
}

export const mockConversation: ConversationTurn[] = [
  {
    speaker: 'kawan',
    text: "So you want to build something. Tell me: what exactly are you committing to, and why should I believe you'll actually do it?"
  },
  {
    speaker: 'user',
    text: 'Complete the Kawan frontend skeleton by the end of June.'
  },
  {
    speaker: 'kawan',
    text: "End of June. That's a week away. What would 'done' actually look like to me (not to you, to me)?",
    action: 'options',
    options: [
      'All 11 routes are navigable and build passes',
      'The design tokens are wired and it looks right',
      'Backend contracts are reflected in mock types'
    ]
  }
]
