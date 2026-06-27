// planApi.ts — POST /api/commitments/{id}/plan to generate the context-tailored roadmap.
// Called ONCE after intake completes. 503-tolerant (returns null on service unavailability).

import type { RoadmapStep } from './planSchedule'

export interface PlanResult {
  roadmap: RoadmapStep[]
  front_load_reason: string | null
  say: string
}

/**
 * generatePlan — POST /api/commitments/{id}/plan
 * Returns PlanResult on success, null on 503 (service unavailable), throws on other errors.
 */
export async function generatePlan(commitmentId: string): Promise<PlanResult | null> {
  const res = await fetch(`/api/commitments/${commitmentId}/plan`, {
    method: 'POST',
    credentials: 'include'
  })
  if (res.status === 503) return null
  if (!res.ok) throw new Error(`POST /api/commitments/${commitmentId}/plan returned ${res.status}`)
  return (await res.json()) as PlanResult
}
