// DetailsIsland — read-only summary of the commitment's essential terms (deadline, cadence,
// evidence type, witness). Lives at the top of the right drawer, above Check-In.

import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useState } from 'react'
import type { Commitment } from '../../types/api'
import { fmtMYT } from '../formatTime'

interface DetailsIslandProps {
  commitment: Commitment
}

const EVIDENCE_LABEL: Record<string, string> = {
  github: 'GitHub commits',
  screenshot: 'Screenshot'
}

export function DetailsIsland({ commitment }: DetailsIslandProps) {
  const [expanded, setExpanded] = useState(true)
  const evidence = EVIDENCE_LABEL[commitment.evidence_type] ?? commitment.evidence_type
  return (
    <div className="ws-island details-island">
      <button
        type="button"
        className="ws-island-header"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <Info size={14} aria-hidden="true" />
        <span className="ws-island-title">Details</span>
        {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
      </button>

      <div className="ws-island-body" hidden={!expanded}>
        <div className="details-row">
          <span className="details-label">Deadline</span>
          <span className="details-value">{fmtMYT(commitment.deadline)}</span>
        </div>
        <div className="details-row">
          <span className="details-label">Check-in</span>
          <span className="details-value">{commitment.cadence}</span>
        </div>
        <div className="details-row">
          <span className="details-label">Evidence</span>
          <span className="details-value">{evidence}</span>
        </div>
        {commitment.stake_enabled && commitment.stake_contact_name && (
          <div className="details-row">
            <span className="details-label">Witness</span>
            <span className="details-value">{commitment.stake_contact_name}</span>
          </div>
        )}
      </div>
    </div>
  )
}
