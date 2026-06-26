// starterChips.ts — contextual open-chat starter chips (T5).
// Used by both StageMode and MessagesMode in Phase 2 (open chat).
// Chips pre-fill the input — never auto-send.

import type { Commitment } from '../types/api'

export type StarterChipAction = { type: 'prefill'; text: string }

export interface StarterChip {
  label: string
  action: StarterChipAction
}

/** Return 2–3 starters matched to the commitment's current state. */
export function starterChipsForState(commitment: Commitment | null): StarterChip[] {
  if (!commitment) {
    return [
      { label: 'Help me break this down', action: { type: 'prefill', text: 'Help me break this down' } },
      { label: 'Where should I start?', action: { type: 'prefill', text: 'Where should I start?' } },
      { label: 'What counts as done?', action: { type: 'prefill', text: 'What counts as done?' } }
    ]
  }

  const now = Date.now()
  const deadline = commitment.deadline ? new Date(commitment.deadline).getTime() : null
  const msLeft = deadline ? deadline - now : null
  const nearDeadline = msLeft !== null && msLeft < 24 * 60 * 60 * 1000 * 2 // within 2 days
  const slipping = commitment.status === 'lapsed' || commitment.escalation >= 1

  if (nearDeadline) {
    return [
      { label: "I'm cutting it close", action: { type: 'prefill', text: "I'm cutting it close" } },
      { label: 'Help me finish', action: { type: 'prefill', text: 'Help me finish strong' } },
      {
        label: 'Should I change anything?',
        action: { type: 'prefill', text: 'Should I change anything at this point?' }
      }
    ]
  }

  if (slipping) {
    return [
      { label: "I'm behind — re-scope this", action: { type: 'prefill', text: "I'm behind — help me re-scope this" } },
      { label: "I'm stuck on something", action: { type: 'prefill', text: "I'm stuck and not sure what to do next" } },
      { label: 'Talk me through it', action: { type: 'prefill', text: 'Talk me through what I should focus on' } }
    ]
  }

  // Default: fresh / on-track commitment
  return [
    { label: 'Help me break this down', action: { type: 'prefill', text: 'Help me break this down into steps' } },
    { label: 'Where should I start?', action: { type: 'prefill', text: 'Where should I start today?' } },
    { label: 'What counts as done?', action: { type: 'prefill', text: 'What counts as done for this?' } }
  ]
}
