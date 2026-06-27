// VerdictCard — displays a 3-valued evidence verdict: pass / fail / unclear.
// Iron rule: 'unclear' is ALWAYS neutral/calm — never red, never punishing.
// Used by CheckinIsland and FinishIsland.

import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react'
import type { EvidenceVerdict } from '../commitments/api'

interface VerdictCardProps {
  verdict: EvidenceVerdict
}

const VERDICT_CONFIG = {
  pass: {
    Icon: CheckCircle2,
    label: 'Evidence accepted',
    className: 'verdict-card verdict-card--pass'
  },
  fail: {
    Icon: XCircle,
    label: 'Not accepted',
    className: 'verdict-card verdict-card--fail'
  },
  unclear: {
    // Unclear: neutral/calm — never red (spec §9.3 iron rule)
    Icon: HelpCircle,
    label: 'Needs more context',
    className: 'verdict-card verdict-card--unclear'
  }
} as const

export function VerdictCard({ verdict }: VerdictCardProps) {
  const config = VERDICT_CONFIG[verdict.verdict]
  const { Icon, label, className } = config

  return (
    <div className={className} role="status" aria-live="polite">
      <div className="verdict-card-header">
        <Icon size={18} aria-hidden="true" className="verdict-card-icon" />
        <span className="verdict-card-label">{label}</span>
      </div>
      {verdict.reasoning && <p className="verdict-card-reasoning">{verdict.reasoning}</p>}
    </div>
  )
}
