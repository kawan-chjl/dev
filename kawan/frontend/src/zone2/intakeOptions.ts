// intakeOptions.ts — deterministic VN option generation for the 4-slot intake.
// Client-derived from the compose sentence (action + deliverable + deadline).
// No API calls; no randomness. Each slot returns 3 concrete options + 1 open-ended.

export type IntakeSlot = 'why' | 'obstacles' | 'time_constraints' | 'skill'

export interface IntakeOption {
  text: string
  isOpenEnded?: boolean
}

interface CommitmentSummary {
  action: string
  deliverable: string
  deadline: string
}

/**
 * optionsForStep — returns 3 short deterministic answers for the given slot,
 * strongly tied to the commitment's compose sentence, plus an open-ended option.
 */
export function optionsForStep(slot: IntakeSlot, commitment: CommitmentSummary): IntakeOption[] {
  const { action, deliverable, deadline } = commitment
  const thing = deliverable.trim() || 'this'
  const verb = action.trim() || 'complete'
  // Derive a rough deadline label for time_constraints options
  const deadlineDate = new Date(deadline)
  const now = new Date()
  const diffMs = deadlineDate.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  const timeLabel =
    diffDays <= 0
      ? 'today'
      : diffDays === 1
        ? 'tomorrow'
        : diffDays <= 7
          ? `in ${diffDays} days`
          : diffDays <= 30
            ? `in about ${Math.round(diffDays / 7)} week${Math.round(diffDays / 7) === 1 ? '' : 's'}`
            : 'before the deadline'

  const OPTIONS: Record<IntakeSlot, IntakeOption[]> = {
    why: [
      { text: `It unblocks something important that depends on ${thing}` },
      { text: `I committed to this and want to follow through` },
      { text: `${thing.charAt(0).toUpperCase() + thing.slice(1)} matters for my goals right now` }
    ],
    obstacles: [
      { text: `I tend to get distracted or lose focus partway through` },
      { text: `I am not fully sure how to ${verb} ${thing} yet` },
      { text: `Other priorities keep pulling me away from this` }
    ],
    time_constraints: [
      { text: `I need to ${verb} ${thing} ${timeLabel} — no flexibility` },
      { text: `I have limited blocks of focused time available before then` },
      { text: `The deadline is real but I can stretch it slightly if needed` }
    ],
    skill: [
      { text: `I have done this kind of thing before — mostly execution` },
      { text: `I understand the approach but some parts are new to me` },
      { text: `This is fairly new territory; I will need to figure things out` }
    ]
  }

  return [...OPTIONS[slot], { text: 'Answer in my own words', isOpenEnded: true }]
}
