// CheckinIsland — trigger a check-in and submit evidence via 3 methods.
// Check-in: POST /{id}/check -> AI brief line -> 3 submission methods.
// Verdict: 3-valued (pass/fail/unclear); unclear is ALWAYS neutral (spec §9.3).
// On pass: lock to a "Checked-in" state until the next cadence window.
// On fail: show denial + one-last-retry reminder using due_at/is_late.
// Kawan reacts in the shared conversation (onKawanSay); the Activity card refreshes (onActivity).
// Always visible (collapsible); variant drives late tone only, not visibility.

import { Check, ChevronDown, ChevronUp, ClipboardCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { type CheckinResponse, type EvidenceVerdict, triggerCheckin } from '../../commitments/api'
import { useNotifications } from '../../notifications/NotificationProvider'
import type { Emotion } from '../../types/api'
import { fmtDuration } from '../formatTime'
import type { CheckinStatus } from '../keyEvents'
import { SubmissionPanel } from '../SubmissionPanel'
import { VerdictCard } from '../VerdictCard'

interface CheckinIslandProps {
  commitmentId: string
  checkinStatus: CheckinStatus | null
  /** Cadence string (e.g. "daily", "every 2 days") used to project the next check-in time. */
  cadence?: string
  /** 'checkin' = normal, 'late-checkin' = reprimand variant (tone only, not gating) */
  variant: 'checkin' | 'late-checkin' | null
  onKawanSay: (text: string, emotion?: Emotion) => void
  onActivity: () => void
  /** Optional: notify the workspace sub-tour when a check-in verdict arrives. */
  onVerdict?: (v: EvidenceVerdict) => void
}

type Phase = 'idle' | 'checking' | 'submitting' | 'verdict'

const HOUR_MS = 3600000
const DAY_MS = 86400000

// Project a cadence string to a period in ms. The backend's due_at is the last cadence tick
// (last check-in or creation), so the next check-in is due one period after it.
function cadenceToMs(cadence: string | undefined): number {
  if (!cadence) return DAY_MS
  const c = cadence.toLowerCase().trim()
  if (c === 'daily') return DAY_MS
  if (c === 'weekly') return 7 * DAY_MS
  if (c === 'hourly') return HOUR_MS
  const days = c.match(/every\s+(\d+)\s*days?/)
  if (days) return Math.max(1, Number.parseInt(days[1], 10)) * DAY_MS
  const hours = c.match(/every\s+(\d+)\s*hours?/)
  if (hours) return Math.max(1, Number.parseInt(hours[1], 10)) * HOUR_MS
  return DAY_MS
}

export function CheckinIsland({
  commitmentId,
  checkinStatus,
  cadence,
  variant,
  onKawanSay,
  onActivity,
  onVerdict
}: CheckinIslandProps) {
  const { notify } = useNotifications()
  const [expanded, setExpanded] = useState(true)
  const [phase, setPhase] = useState<Phase>('idle')
  const [checkin, setCheckin] = useState<CheckinResponse | null>(null)
  const [verdict, setVerdict] = useState<EvidenceVerdict | null>(null)
  const [checkedIn, setCheckedIn] = useState(false)
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Project the next check-in: one cadence period after the reference tick. Before checking in the
  // reference is the backend's last tick (due_at); after a pass this session it's that moment.
  const referenceTick = checkedIn ? checkedInAt : (checkinStatus?.due_at ?? null)
  const nextDueMs = referenceTick ? new Date(referenceTick).getTime() + cadenceToMs(cadence) : null
  const remainingMs = nextDueMs != null ? nextDueMs - now : null

  // Tick once a second while the countdown is on screen (idle before check-in, or the locked state after).
  const showTimer = referenceTick != null && (checkedIn || phase === 'idle')
  useEffect(() => {
    if (!showTimer) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [showTimer])

  // The countdown line, reused before and after check-in.
  const timerLine =
    remainingMs != null && remainingMs > 0 ? (
      <>
        Next check-in in <strong>{fmtDuration(remainingMs)}</strong>
      </>
    ) : (
      <span className="checkin-island-timer-late">Check-in available now</span>
    )

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
    // Surface the AI's evaluation as an in-app notification (every check-in submission).
    notify(
      v.verdict === 'pass'
        ? 'Check-in approved'
        : v.verdict === 'fail'
          ? 'Check-in not approved'
          : 'Check-in needs more context',
      {
        detail: v.reasoning?.trim() || undefined,
        kind: v.verdict === 'pass' ? 'success' : v.verdict === 'fail' ? 'error' : 'info'
      }
    )
    let line = v.reasoning?.trim() ?? ''
    if (!line) {
      if (v.verdict === 'pass') line = "Logged. That's one more in the bank."
      else if (v.verdict === 'unclear') line = "I can't tell from that. Give me something clearer."
      else line = "That doesn't hold up. Show me the real thing."
    }
    const emotion: Emotion = v.verdict === 'pass' ? 'pleased' : v.verdict === 'fail' ? 'skeptical' : 'neutral'
    onKawanSay(line, emotion)
    if (v.verdict === 'pass') {
      setCheckedInAt(new Date().toISOString())
      setCheckedIn(true)
    }
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

      {/* Body stays mounted (hidden when collapsed) so an in-progress evidence attachment in the
          SubmissionPanel survives collapse/re-expand instead of resetting. */}
      <div className="ws-island-body" hidden={!expanded}>
        {checkedIn ? (
          <div className="checkin-island-locked">
            <Check size={14} aria-hidden="true" />
            <span>Checked in. You're set until the next check-in window.</span>
            {showTimer && <p className="checkin-island-timer">{timerLine}</p>}
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
                {showTimer && (
                  <p className="checkin-island-timer">
                    {checkinStatus?.is_late ? (
                      <span className="checkin-island-timer-late">Check-in overdue</span>
                    ) : (
                      timerLine
                    )}
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
    </div>
  )
}
