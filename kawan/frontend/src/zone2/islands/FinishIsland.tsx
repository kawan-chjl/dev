// FinishIsland — "Finish now" path: same 3 submission methods as CheckinIsland.
// A Finish submission uses the same evidence judge (POST /evidence or /file or /github-link).
// On PASS: mark complete intent + roll EndingSequence (win).
// On FAIL: show denial, stay in workspace.
// Per plan OQ-FINISH: reuses the same verdict path; no separate endpoint.
// Always visible (collapsible) — ungated from keyEvent.

import { ChevronDown, ChevronUp, Trophy } from 'lucide-react'
import { useState } from 'react'
import type { EvidenceVerdict } from '../../commitments/api'
import type { Commitment } from '../../types/api'
import { EndingSequence } from '../EndingSequence'
import { SubmissionPanel } from '../SubmissionPanel'
import { VerdictCard } from '../VerdictCard'

interface FinishIslandProps {
  commitmentId: string
  commitment: Commitment
}

type Phase = 'idle' | 'submitting' | 'verdict' | 'complete'

export function FinishIsland({ commitmentId, commitment }: FinishIslandProps) {
  const [expanded, setExpanded] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [verdict, setVerdict] = useState<EvidenceVerdict | null>(null)
  const [winDate, setWinDate] = useState<string | null>(null)

  function handleVerdict(v: EvidenceVerdict) {
    setVerdict(v)
    if (v.verdict === 'pass') {
      setWinDate(new Date().toISOString())
      setPhase('complete')
    } else {
      setPhase('verdict')
    }
  }

  function handleRetry() {
    setVerdict(null)
    setPhase('idle')
  }

  // Once the verdict is 'pass' we roll the ending sequence — no return.
  if (phase === 'complete') {
    return <EndingSequence variant="win" commitment={commitment} winDateIso={winDate ?? new Date().toISOString()} />
  }

  return (
    <div className="ws-island finish-island">
      <button
        type="button"
        className="ws-island-header"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <Trophy size={14} aria-hidden="true" />
        <span className="ws-island-title">Finish Now</span>
        {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
      </button>

      {expanded && (
        <div className="ws-island-body">
          {phase === 'idle' && (
            <>
              <p className="finish-island-sub">Submit your final evidence to mark this commitment complete.</p>
              <button type="button" className="finish-island-trigger-btn" onClick={() => setPhase('submitting')}>
                Submit final evidence
              </button>
            </>
          )}

          {phase === 'submitting' && (
            <SubmissionPanel commitmentId={commitmentId} onVerdict={handleVerdict} onCancel={() => setPhase('idle')} />
          )}

          {phase === 'verdict' && verdict && (
            <>
              <VerdictCard verdict={verdict} />
              {verdict.verdict === 'fail' && (
                <div className="finish-island-denial">
                  <p className="finish-island-denial-text">
                    That evidence didn't meet the bar. Try with stronger proof.
                  </p>
                  <button type="button" className="finish-island-retry-btn" onClick={handleRetry}>
                    Try again
                  </button>
                </div>
              )}
              {verdict.verdict === 'unclear' && (
                <div className="finish-island-denial">
                  <p className="finish-island-denial-text">
                    Needs more context. Add another submission to strengthen your case.
                  </p>
                  <button type="button" className="finish-island-retry-btn" onClick={handleRetry}>
                    Add evidence
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
