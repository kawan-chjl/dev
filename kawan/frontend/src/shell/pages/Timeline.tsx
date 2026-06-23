// Timeline — V5 "Momentum journey"
// Doodle journey-line with terracotta iris-dots for check-ins.
// Verdicts: pass/fail/unclear rendered per TR-64 (unclear = neutral, misses = neutral gaps not red).

import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_AUTH } from '../../auth/api'
import { createCommitment } from '../../commitments/api'
import { useActiveCommitment } from '../../commitments/useActiveCommitment'
import type { WsServerMessage } from '../../timeline/api'
import { postDebrief, triggerCheckNow } from '../../timeline/api'
import { useTimeline } from '../../timeline/useTimeline'
import { useWorkspaceSocket } from '../../timeline/useWorkspaceSocket'
import type { Commitment, CommitmentStatus, TimelineEvent } from '../../types/api'
import { Chip } from '../../ui/Chip'

// ── Helpers ────────────────────────────────────────────────────────────────────

function verdictChipVariant(verdict: 'pass' | 'fail' | 'unclear'): 'pass' | 'fail' | 'unclear' {
  return verdict
}

function formatAt(iso: string): string {
  return new Date(iso).toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ── Existing row components (unchanged — reused as-is) ─────────────────────────

function CheckinEventRow({ event }: { event: Extract<TimelineEvent, { type: 'checkin' }> }) {
  return (
    <div className="timeline-event checkin-event">
      <div className="timeline-dot timeline-dot-checkin" aria-hidden="true" />
      <div className="timeline-event-body">
        <div className="timeline-event-header">
          <Chip variant="accent">{event.kind}</Chip>
          <span className="timeline-event-time">{formatAt(event.at)}</span>
        </div>
        <p className="timeline-event-message">{event.message}</p>
      </div>
    </div>
  )
}

function EvidenceEventRow({ event }: { event: Extract<TimelineEvent, { type: 'evidence' }> }) {
  const verdictLabel: Record<string, string> = {
    pass: 'pass',
    fail: 'no pass', // TR-64: honest, not punishing
    unclear: 'not sure yet' // design.md §9: curious, never punishing
  }
  return (
    <div className="timeline-event evidence-event">
      <div className="timeline-dot timeline-dot-evidence" aria-hidden="true" />
      <div className="timeline-event-body">
        <div className="timeline-event-header">
          <Chip variant={verdictChipVariant(event.verdict)}>{verdictLabel[event.verdict]}</Chip>
          <Badge>{event.adapter}</Badge>
          <span className="timeline-event-time">{formatAt(event.at)}</span>
        </div>
        {event.reasoning != null && <p className="timeline-event-message">{event.reasoning}</p>}
      </div>
    </div>
  )
}

function ProposalEventRow({ event }: { event: Extract<TimelineEvent, { type: 'proposal' }> }) {
  return (
    <div className="timeline-event proposal-event">
      <div className="timeline-dot timeline-dot-proposal" aria-hidden="true" />
      <div className="timeline-event-body">
        <div className="timeline-event-header">
          <Chip variant="default">proposal · {event.field}</Chip>
          <Chip variant={event.status === 'open' ? 'accent' : 'default'}>{event.status}</Chip>
          <span className="timeline-event-time">{formatAt(event.at)}</span>
        </div>
        <p className="timeline-event-message">{event.reason}</p>
        {event.status === 'open' && (
          <div className="proposal-actions">
            <button type="button" className="proposal-btn" disabled>
              Apply
            </button>
            <button type="button" className="proposal-btn proposal-btn-dismiss" disabled>
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Small inline badge for evidence rows (pre-existing; shadowing src/ui/Badge intentionally — Open Q8)
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="badge badge-default" style={{ textTransform: 'capitalize' }}>
      {children}
    </span>
  )
}

// ── New: MomentumDots ──────────────────────────────────────────────────────────
// pass = filled terracotta iris; fail/unclear = neutral hollow dot (NEVER red — TR-64).

function MomentumDots({ events }: { events: TimelineEvent[] }) {
  const evidenceEvents = events.filter((e): e is Extract<TimelineEvent, { type: 'evidence' }> => e.type === 'evidence')
  const passCount = evidenceEvents.filter((e) => e.verdict === 'pass').length

  if (evidenceEvents.length === 0) {
    return (
      <div className="momentum-strip">
        <p className="momentum-empty">No verified check-ins yet.</p>
      </div>
    )
  }

  return (
    <div className="momentum-strip">
      <ul className="momentum-dots" aria-label="Check-in momentum">
        {evidenceEvents.map((e, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: stable order from sorted timeline
            key={i}
            className={`momentum-dot ${e.verdict === 'pass' ? 'is-pass' : 'is-neutral'}`}
            aria-label={e.verdict === 'pass' ? 'verified' : 'not verified yet'}
          />
        ))}
      </ul>
      <span className="momentum-count">{passCount} verified</span>
    </div>
  )
}

// ── New: TimelineBeat ──────────────────────────────────────────────────────────
// Transient banner for live WS beats that have no persisted timeline-row equivalent.
// celebrate tone = warm/sage; neutral tone = honest/non-punishing (never red).

interface BeatState {
  message: string
  tone: 'celebrate' | 'neutral'
}

function TimelineBeat({ beat, onDismiss }: { beat: BeatState; onDismiss: () => void }) {
  return (
    <div className={`timeline-beat timeline-beat-${beat.tone}`} role="status" aria-live="polite">
      <p className="timeline-beat-message">{beat.message}</p>
      <button type="button" className="timeline-beat-dismiss" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  )
}

// ── New: HabitLoopClose ────────────────────────────────────────────────────────
// Shown when the commitment outcome is known (completed or missed).
// Iron rule: missed outcome is honest/non-punishing, never shaming (TR-64).

interface HabitLoopCloseProps {
  commitment: Commitment
  onRepeat: () => Promise<void>
  repeating: boolean
}

function HabitLoopClose({ commitment, onRepeat, repeating }: HabitLoopCloseProps) {
  const [reflection, setReflection] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const beatLine =
    commitment.status === 'completed'
      ? 'Verified. That one counts.' // spec §3 H-finding: bound to the verified outcome
      : "It didn't happen — I won't pretend it did. Next one?" // honest, non-punishing (TR-64)

  async function handleSave() {
    if (MOCK_AUTH) {
      setSaved(true)
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await postDebrief(commitment.id, reflection.trim())
      setSaved(true)
    } catch {
      setSaveError("couldn't save — try again")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="habit-loop-close">
      <p className="habit-loop-beat">{beatLine}</p>
      <div className="habit-loop-debrief">
        <label className="habit-loop-debrief-label" htmlFor="debrief-reflection">
          What made this one work?
        </label>
        <textarea
          id="debrief-reflection"
          className="habit-loop-debrief-input"
          value={reflection}
          onChange={(e) => {
            setReflection(e.target.value)
            setSaved(false)
            setSaveError(null)
          }}
          rows={3}
          placeholder="One honest line is enough."
        />
        {saved ? (
          <span className="habit-loop-debrief-hint">saved</span>
        ) : saveError !== null ? (
          <span className="habit-loop-debrief-hint">{saveError}</span>
        ) : (
          <button
            type="button"
            className="habit-loop-debrief-save"
            onClick={handleSave}
            disabled={reflection.trim().length === 0 || saving}
          >
            {saving ? 'Saving…' : 'Save reflection'}
          </button>
        )}
      </div>
      <button type="button" className="btn btn-primary habit-loop-repeat" onClick={onRepeat} disabled={repeating}>
        {repeating ? 'Creating…' : 'Repeat this'}
      </button>
    </div>
  )
}

// ── Active statuses that allow "Check now" ────────────────────────────────────
const CHECK_NOW_STATUSES: CommitmentStatus[] = ['active', 'lapsed', 'verifying', 'grace']

// ── Main Timeline page ─────────────────────────────────────────────────────────

export function Timeline() {
  const navigate = useNavigate()
  const { commitment } = useActiveCommitment()
  const { state, timeline, refresh } = useTimeline(commitment?.id ?? null)

  // Transient beat banner state (from WS pushes)
  const [beat, setBeat] = useState<BeatState | null>(null)
  // Local closed-outcome state for the habit-loop close (Q9: driven by WS outcome beat + timeline.status)
  const [closedCommitment, setClosedCommitment] = useState<Commitment | null>(null)

  // "Check now" busy guard
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)

  // "Repeat this" busy guard
  const [repeating, setRepeating] = useState(false)

  // WS event handler — refetch on any relevant push; show beat banner for non-row moments.
  const onEvent = useCallback(
    (msg: WsServerMessage) => {
      // All relevant pushes trigger a timeline refetch (source of truth).
      if (
        msg.type === 'checkin' ||
        msg.type === 'winback' ||
        msg.type === 'verdict' ||
        msg.type === 'celebration' ||
        msg.type === 'reckoning'
      ) {
        refresh()
      }
      // Non-row moments also surface a transient beat banner.
      if (msg.type === 'winback') {
        setBeat({ message: msg.say, tone: 'neutral' })
      } else if (msg.type === 'verdict') {
        // verdict beat is neutral — unclear/fail never punishing (TR-64)
        const verdictCopy =
          msg.verdict === 'pass'
            ? (msg.reasoning ?? 'Verified.')
            : msg.verdict === 'unclear'
              ? (msg.reasoning ?? 'Not sure yet — give it a moment.')
              : (msg.reasoning ?? 'No pass this time.')
        setBeat({ message: verdictCopy, tone: 'neutral' })
      } else if (msg.type === 'celebration') {
        setBeat({ message: msg.say, tone: 'celebrate' })
        // Stash the last-known commitment for the habit-loop close (Q9).
        if (commitment !== null) setClosedCommitment({ ...commitment, status: 'completed' })
      } else if (msg.type === 'reckoning') {
        setBeat({ message: msg.say, tone: 'neutral' })
        if (commitment !== null) setClosedCommitment({ ...commitment, status: 'missed' })
      }
      // workspace/error are A3 scope — ignored here.
    },
    [refresh, commitment]
  )

  const { connected } = useWorkspaceSocket(onEvent)

  // Determine which commitment to use for the habit-loop close:
  // - WS outcome beat sets closedCommitment immediately (Q9 primary path)
  // - timeline.status completed/missed + current commitment as fallback
  const outcomeCommitment: Commitment | null =
    closedCommitment ??
    (timeline !== null && (timeline.status === 'completed' || timeline.status === 'missed') && commitment !== null
      ? { ...commitment, status: timeline.status }
      : null)

  async function handleCheckNow() {
    if (commitment === null) return
    setChecking(true)
    setCheckError(null)
    try {
      await triggerCheckNow(commitment.id)
      await refresh()
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : 'Check failed')
    } finally {
      setChecking(false)
    }
  }

  async function handleRepeat() {
    const source = outcomeCommitment ?? commitment
    if (source === null) return
    setRepeating(true)
    try {
      if (!MOCK_AUTH) {
        // deadline = now + 7 days (base on today so past-deadline repeats stay future)
        const fresh = new Date()
        fresh.setDate(fresh.getDate() + 7)
        await createCommitment({
          action: source.action,
          deliverable: source.deliverable,
          deadline: fresh.toISOString()
        })
      }
      // Navigate into the Compose/stepper so the user can tweak the new draft (Open Q3).
      navigate('/new')
    } catch (err) {
      // Surface inline, non-fatal.
      setCheckError(err instanceof Error ? err.message : 'Could not repeat commitment')
      setRepeating(false)
    }
  }

  const showCheckNow = !MOCK_AUTH && commitment !== null && CHECK_NOW_STATUSES.includes(commitment.status)

  return (
    <div className="shell-page">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Timeline</h2>
            <p className="page-subtitle">Your momentum journey — every check-in, every verdict.</p>
          </div>
          <div className="page-header-actions">
            {connected && (
              <span className="timeline-live-dot" role="img" aria-label="Live — connected" title="Connected live" />
            )}
            {showCheckNow && (
              <button
                type="button"
                className="btn btn-secondary timeline-check-now"
                onClick={handleCheckNow}
                disabled={checking}
              >
                {checking ? 'Checking…' : 'Check now'}
              </button>
            )}
          </div>
        </div>
        {checkError !== null && <p className="timeline-check-error">{checkError}</p>}
      </div>

      {beat !== null && <TimelineBeat beat={beat} onDismiss={() => setBeat(null)} />}

      {outcomeCommitment !== null && (
        <HabitLoopClose commitment={outcomeCommitment} onRepeat={handleRepeat} repeating={repeating} />
      )}

      {state === 'loading' && <p className="timeline-loading">Loading…</p>}

      {state === 'empty' && (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">
            ~
          </div>
          <p>No timeline yet. Start a commitment to begin.</p>
        </div>
      )}

      {state === 'ready' && timeline !== null && (
        <>
          <MomentumDots events={timeline.events} />
          <div className="timeline-container">
            {timeline.events.map((event) => {
              if (event.type === 'checkin') return <CheckinEventRow key={`checkin-${event.at}`} event={event} />
              if (event.type === 'evidence') return <EvidenceEventRow key={`evidence-${event.at}`} event={event} />
              if (event.type === 'proposal') return <ProposalEventRow key={`proposal-${event.at}`} event={event} />
              return null
            })}
          </div>
        </>
      )}
    </div>
  )
}
