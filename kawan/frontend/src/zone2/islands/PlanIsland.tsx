// PlanIsland — top-right; context-tailored roadmap, reference-only.
// Consumes the plan held in WorkspaceLayout state + buildPlanSchedule for datetimes.
// Expandable. No edit/apply affordances — display only (spec §8.1).

import { ChevronDown, ChevronUp, ClipboardList } from 'lucide-react'
import { useState } from 'react'
import type { Commitment } from '../../types/api'
import type { PlanResult } from '../planApi'
import { buildPlanSchedule } from '../planSchedule'

const MYT_FORMAT: Intl.DateTimeFormatOptions = {
  timeZone: 'Asia/Kuala_Lumpur',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
}

function fmtMYT(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-MY', MYT_FORMAT)
  } catch {
    return iso
  }
}

interface PlanIslandProps {
  plan: PlanResult | null
  commitment: Commitment | null
  /** true while the /plan request is in-flight */
  generating: boolean
}

export function PlanIsland({ plan, commitment, generating }: PlanIslandProps) {
  const [expanded, setExpanded] = useState(true)

  const schedule =
    plan && commitment ? buildPlanSchedule(plan.roadmap, commitment.created_at, commitment.deadline) : null

  return (
    <div className="ws-island plan-island">
      <button
        type="button"
        className="ws-island-header"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <ClipboardList size={14} aria-hidden="true" />
        <span className="ws-island-title">Plan</span>
        {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
      </button>

      {expanded && (
        <div className="ws-island-body plan-island-body">
          {generating && (
            <p className="ws-island-empty" role="status" aria-live="polite">
              Generating your plan...
            </p>
          )}

          {!generating && !plan && <p className="ws-island-empty">Plan not yet available.</p>}

          {!generating && plan && schedule && (
            <>
              <div className="plan-island-row plan-island-row--boundary">
                <span className="plan-island-time">{fmtMYT(schedule.startAt)}</span>
                <span className="plan-island-step-label">Start</span>
              </div>

              {schedule.steps.map((step) => (
                <div key={step.order} className="plan-island-row">
                  <span className="plan-island-time">{fmtMYT(step.at)}</span>
                  <div className="plan-island-step-content">
                    <span className="plan-island-step-label">{step.title}</span>
                    {step.note && <span className="plan-island-step-note">{step.note}</span>}
                  </div>
                </div>
              ))}

              <div className="plan-island-row plan-island-row--boundary">
                <span className="plan-island-time">{fmtMYT(schedule.endAt)}</span>
                <span className="plan-island-step-label">Deadline</span>
              </div>

              {plan.front_load_reason && <p className="plan-island-note">{plan.front_load_reason}</p>}

              <p className="plan-island-readonly-notice">Reference only — AI-generated advice</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
