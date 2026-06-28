// CheckinIsland — trigger a check-in and submit evidence via 3 methods.
// Check-in: POST /{id}/check -> AI brief line -> 3 submission methods.
// Verdict: 3-valued (pass/fail/unclear); unclear is ALWAYS neutral (spec §9.3).
// On pass: lock to a "Checked-in" state until the next cadence window.
// On fail: show denial + one-last-retry reminder using due_at/is_late.
// Kawan reacts in the shared conversation (onKawanSay); the Activity card refreshes (onActivity).
// Always visible (collapsible); variant drives late tone only, not visibility.

import { Check, ChevronDown, ChevronUp, ClipboardCheck } from 'lucide-react'
import { useState } from 'react'
import { type CheckinResponse, type EvidenceVerdict, triggerCheckin } from '../../commitments/api'
import type { Emotion } from '../../types/api'
import type { CheckinStatus } from '../keyEvents'
import { SubmissionPanel } from '../SubmissionPanel'
import { VerdictCard } from '../VerdictCard'

interface CheckinIslandProps {
  commitmentId: string
  checkinStatus: CheckinStatus | null
  /** 'checkin' = normal, 'late-checkin' = reprimand variant (tone only, not gating) */
  variant: 'checkin' | 'late-checkin' | null
  onKawanSay: (text: string, emotion?: Emotion) => void
  onActivity: () => void
  /** Optional: notify the workspace sub-tour when a check-in verdict arrives. */
  onVerdict?: (v: EvidenceVerdict) => void
}

type Phase = 'idle' | 'checking' | 'submitting' | 'verdict'

export function CheckinIsland({
  commitmentId,
  checkinStatus,
  variant,
  onKawanSay,
  onActivity,
  onVerdict
}: CheckinIslandProps) {
  const [expanded, setExpanded] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [checkin, setCheckin] = useState<CheckinResponse | null>(null)
  const [verdict, setVerdict] = useState<EvidenceVerdict | null>(null)
  const [checkedIn, setCheckedIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleTrigger() {
    setError(null)
    setPhase('checking')
    try {
      const ck = await triggerCheckin(commitmentId)
      setCheckin(ck)
      // Kawan's check-in line speaks in the main dialogue (stage-dialogue-line), not inside the island.
      onKawanSay(ck.message, 'curious')
      setPhase('submitting')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed. Try again.')
      setPhase('idle')
    }
  }

  function handleVerdict(v: EvidenceVerdict) {
    setVerdict(v)
    setPhase('verdict')
    onActivity()
    let line = v.reasoning?.trim() ?? ''
    if (!line) {
      if (v.verdict === 'pass') line = "Logged. That's one more in the bank."
      else if (v.verdict === 'unclear') line = "I can't tell from that. Give me something clearer."
      else line = "That doesn't hold up. Show me the real thing."
    }
    const emotion: Emotion = v.verdict === 'pass' ? 'pleased' : v.verdict === 'fail' ? 'skeptical' : 'neutral'
    onKawanSay(line, emotion)
    if (v.verdict === 'pass') setCheckedIn(true)
    onVerdict?.(v)
  }

  function handleRetry() {
    setVerdict(null)
    setCheckin(null)
    setPhase('idle')
  }

  const isLate = variant === 'late-checkin'

  return (
    <div className={`ws-island checkin-island${isLate ? ' checkin-island--late' : ''}`}>
      <button
        type="button"
        className="ws-island-header"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <ClipboardCheck size={14} aria-hidden="true" />
        <span className="ws-island-title">{checkedIn ? 'Checked-In' : isLate ? 'Late Check-In' : 'Check-In'}</span>
        {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
      </button>

      {expanded && (
        <div className="ws-island-body">
          {checkedIn ? (
            <div className="checkin-island-locked">
              <Check size={14} aria-hidden="true" />
              <span>Checked in. You're set until the next check-in window.</span>
            </div>
          ) : (
            <>
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
                // Kawan's check-in line shows in the main dialogue (stage-dialogue-line) via onKawanSay,
                // not inside the island — only the submission controls remain here.
                <SubmissionPanel
                  commitmentId={commitmentId}
                  onVerdict={handleVerdict}
                  onCancel={() => setPhase('idle')}
                />
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
