// CheckinIsland — trigger a check-in and submit evidence via 3 methods.
// Check-in: POST /{id}/check -> AI brief line -> 3 submission methods.
// Verdict: 3-valued (pass/fail/unclear); unclear is ALWAYS neutral (spec §9.3).
// On fail: show denial + one-last-retry reminder using due_at/is_late.

import { ClipboardCheck } from 'lucide-react'
import { useState } from 'react'
import { type CheckinResponse, type EvidenceVerdict, triggerCheckin } from '../../commitments/api'
import type { CheckinStatus } from '../keyEvents'
import { SubmissionPanel } from '../SubmissionPanel'
import { VerdictCard } from '../VerdictCard'

interface CheckinIslandProps {
  commitmentId: string
  checkinStatus: CheckinStatus | null
  /** 'checkin' = normal, 'late-checkin' = reprimand variant */
  variant: 'checkin' | 'late-checkin'
}

type Phase = 'idle' | 'checking' | 'submitting' | 'verdict'

export function CheckinIsland({ commitmentId, checkinStatus, variant }: CheckinIslandProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [checkin, setCheckin] = useState<CheckinResponse | null>(null)
  const [verdict, setVerdict] = useState<EvidenceVerdict | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleTrigger() {
    setError(null)
    setPhase('checking')
    try {
      const ck = await triggerCheckin(commitmentId)
      setCheckin(ck)
      setPhase('submitting')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed. Try again.')
      setPhase('idle')
    }
  }

  function handleVerdict(v: EvidenceVerdict) {
    setVerdict(v)
    setPhase('verdict')
  }

  function handleRetry() {
    setVerdict(null)
    setCheckin(null)
    setPhase('idle')
  }

  const isLate = variant === 'late-checkin'

  return (
    <div className={`ws-island checkin-island${isLate ? ' checkin-island--late' : ''}`}>
      <div className="ws-island-header">
        <ClipboardCheck size={14} aria-hidden="true" />
        <span className="ws-island-title">{isLate ? 'Late Check-In' : 'Check-In'}</span>
      </div>

      <div className="ws-island-body">
        {phase === 'idle' && (
          <>
            {isLate && (
              <p className="checkin-island-reprimand">
                You're late. Submit your evidence now before the window closes.
              </p>
            )}
            {error && (
              <p className="ws-island-error" role="alert">
                {error}
              </p>
            )}
            <button type="button" className="checkin-island-trigger-btn" onClick={handleTrigger}>
              {isLate ? 'Submit late check-in' : 'Start check-in'}
            </button>
          </>
        )}

        {phase === 'checking' && (
          <p className="ws-island-empty" role="status" aria-live="polite">
            Kawan is checking in...
          </p>
        )}

        {phase === 'submitting' && checkin && (
          <>
            <p className="checkin-island-brief">{checkin.message}</p>
            <SubmissionPanel commitmentId={commitmentId} onVerdict={handleVerdict} onCancel={() => setPhase('idle')} />
          </>
        )}

        {phase === 'verdict' && verdict && (
          <>
            <VerdictCard verdict={verdict} />
            {verdict.verdict === 'fail' && (
              <div className="checkin-island-denial">
                <p className="checkin-island-denial-text">
                  That one didn't pass.
                  {checkinStatus?.due_at
                    ? ` You have one more chance before ${new Date(checkinStatus.due_at).toLocaleTimeString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit' })} MYT.`
                    : ' Try again with stronger evidence.'}
                </p>
                <button type="button" className="checkin-island-retry-btn" onClick={handleRetry}>
                  Try again
                </button>
              </div>
            )}
            {verdict.verdict !== 'fail' && (
              <button type="button" className="checkin-island-done-btn" onClick={handleRetry}>
                Done
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
