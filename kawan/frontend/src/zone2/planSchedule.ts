// planSchedule.ts — pure datetime mapping for the Plan island.
// Distributes roadmap est_minutes proportionally across [start, deadline].
// DISPLAY/REFERENCE only — the scheduler never reads this; spec §8.1 plan is advice-only.
// No mutations, no API calls, no side effects.

export interface RoadmapStep {
  order: number
  title: string
  est_minutes: number
  note: string | null
}

export interface ScheduledStep {
  order: number
  title: string
  note: string | null
  at: string // ISO 8601
}

export interface PlanSchedule {
  startAt: string // ISO 8601
  steps: ScheduledStep[]
  endAt: string // ISO 8601
}

/**
 * buildPlanSchedule — distribute roadmap steps across [startISO, deadlineISO].
 *
 * Proportional distribution: each step's offset = (sum of prior est_minutes / total est_minutes)
 * * window_ms. If total est_minutes is 0, distribute evenly.
 * Steps are clamped to [start, deadline] and guaranteed monotonic order.
 */
export function buildPlanSchedule(roadmap: RoadmapStep[], startISO: string, deadlineISO: string): PlanSchedule {
  const startMs = new Date(startISO).getTime()
  const endMs = new Date(deadlineISO).getTime()
  const windowMs = Math.max(0, endMs - startMs)

  if (roadmap.length === 0) {
    return { startAt: startISO, steps: [], endAt: deadlineISO }
  }

  const totalEst = roadmap.reduce((sum, s) => sum + (s.est_minutes ?? 0), 0)

  let cumulative = 0
  const steps: ScheduledStep[] = roadmap.map((step) => {
    let fraction: number
    if (totalEst > 0) {
      fraction = cumulative / totalEst
    } else {
      // Even distribution when no est_minutes provided
      const idx = roadmap.indexOf(step)
      fraction = idx / roadmap.length
    }

    const rawMs = startMs + fraction * windowMs
    // Clamp within [start, deadline]
    const clampedMs = Math.min(Math.max(rawMs, startMs), endMs)

    cumulative += step.est_minutes ?? 0

    return {
      order: step.order,
      title: step.title,
      note: step.note,
      at: new Date(clampedMs).toISOString()
    }
  })

  // Guarantee monotonic order (clamp may cause ties near the end)
  for (let i = 1; i < steps.length; i++) {
    const prev = new Date(steps[i - 1].at).getTime()
    const curr = new Date(steps[i].at).getTime()
    if (curr <= prev) {
      steps[i].at = new Date(prev + 1).toISOString()
    }
  }

  return { startAt: startISO, steps, endAt: deadlineISO }
}
