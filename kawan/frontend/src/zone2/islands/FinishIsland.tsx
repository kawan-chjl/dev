// FinishIsland — "Finish now" path: same 3 submission methods as CheckinIsland.
// A Finish submission uses the same evidence judge (POST /evidence or /file or /github-link).
// On completion (backend status:'completed') it signals up (onComplete) so the workspace rolls
// the full-screen win overlay; on fail/unclear it stays in the workspace and Kawan reacts in chat.
// Always visible (collapsible) — ungated from keyEvent.

import { ChevronDown, ChevronUp, Trophy } from 'lucide-react'
import { useState } from 'react'
import type { EvidenceVerdict } from '../../commitments/api'
import { useNotifications } from '../../notifications/NotificationProvider'
import type { Emotion } from '../../types/api'
import { SubmissionPanel } from '../SubmissionPanel'
import { VerdictCard } from '../VerdictCard'

interface FinishIslandProps {
  commitmentId: string
  onKawanSay: (text: string, emotion?: Emotion) => void
  onActivity: () => void
  onComplete: (winDateIso: string) => void
  /** Optional: notify the workspace sub-tour when a non-completing verdict arrives (denied/unclear). */
  onVerdict?: (v: EvidenceVerdict) => void
}

type Phase = 'idle' | 'submitting' | 'verdict'

export function FinishIsland({ commitmentId, onKawanSay, onActivity, onComplete, onVerdict }: FinishIslandProps) {
  const { notify } = useNotifications()
  const [expanded, setExpanded] = useState(true)
  const [phase, setPhase] = useState<Phase>('idle')
  const [verdict, setVerdict] = useState<EvidenceVerdict | null>(null)

  function handleVerdict(v: EvidenceVerdict) {
    onActivity()
    // A pass on the finish flow means the final evidence was accepted -> roll the win. We also
    // accept the backend's explicit completed status. (Previously this gated only on status ===
    // 'completed', which dead-ended a pass whose commitment didn't transition, e.g. past-deadline.)
    if (v.verdict === 'pass' || v.status === 'completed') {
      notify('Commitment completed!', {
        detail: v.reasoning?.trim() || 'Your final evidence was accepted.',
        href: `/commitments/${commitmentId}`,
        kind: 'success'
      })
      onComplete(new Date().toISOString())
      return
    }
    setVerdict(v)
    setPhase('verdict')
    const line =
      v.reasoning?.trim() ||
      (v.verdict === 'unclear'
        ? 'Not enough to call it done. Add more proof and try again.'
        : 'That evidence did not meet the bar. Bring something stronger.')
    onKawanSay(line, v.verdict === 'unclear' ? 'neutral' : 'skeptical')
    // Surface the AI's evaluation as an in-app notification (non-completing finish submission).
    notify(v.verdict === 'unclear' ? 'Finish needs more context' : 'Finish evidence not approved', {
      detail: v.reasoning?.trim() || undefined,
      href: `/commitments/${commitmentId}`,
      kind: v.verdict === 'unclear' ? 'info' : 'error'
    })
    // Evidence was evaluated but didn't complete — let the walkthrough offer a Skip so a denied
    // demo submission can't dead-end the tour.
    onVerdict?.(v)
  }

  function handleRetry() {
    setVerdict(null)
    setPhase('idle')
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

      {/* Body stays mounted (hidden when collapsed) so an in-progress evidence attachment in the
          SubmissionPanel survives collapse/re-expand instead of resetting. */}
      <div className="ws-island-body" hidden={!expanded}>
        {phase === 'idle' && (
          <>
            <p className="finish-island-sub">Submit your final evidence to mark this commitment complete.</p>
            <button type="button" className="finish-island-trigger-btn" onClick={() => setPhase('submitting')}>
              Submit final evidence
            </button>
          </>
        )}

        {phase === 'submitting' && (
          <SubmissionPanel
            commitmentId={commitmentId}
            onVerdict={handleVerdict}
            onCancel={() => setPhase('idle')}
            finish
          />
        )}

        {phase === 'verdict' && verdict && (
          <>
            <VerdictCard verdict={verdict} />
            {verdict.verdict === 'fail' && (
              <div className="finish-island-denial">
                <p className="finish-island-denial-text">That evidence didn't meet the bar. Try with stronger proof.</p>
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
    </div>
  )
}
