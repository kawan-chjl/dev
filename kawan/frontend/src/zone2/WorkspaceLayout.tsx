// WorkspaceLayout — Zone 2 full-screen workspace for /workspace/:id
// No shell chrome. Local viewMode: 'stage' | 'messages'. Shared conversation state.
// T4: phased VN-intake (phase:'intake') → open chat (phase:'chat').
// Phase lives here; stage NEVER remounts (A3 design §4, PO decision 6).
// Phase 3: Context/Plan/Check-In/Finish islands + Activity card overlaid as DOM siblings.

import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MOCK_AUTH } from '../auth/api'
import type { ContextTurnResponse } from '../commitments/api'
import { contextTurn, fetchCommitmentById } from '../commitments/api'
import { useDemoTour } from '../demo/DemoTour'
import { mockConversation } from '../mock/fixtures'
import type { Commitment, Emotion } from '../types/api'
import type { WorkspaceMessage } from '../workspace/api'
import { workspaceTurn } from '../workspace/api'
import { fetchMessages } from '../workspace/messagesApi'
import { EndingSequence } from './EndingSequence'
import { ActivityCard } from './islands/ActivityCard'
import { CheckinIsland } from './islands/CheckinIsland'
import { ContextIsland } from './islands/ContextIsland'
import { FinishIsland } from './islands/FinishIsland'
import { PlanIsland } from './islands/PlanIsland'
import {
  type CheckinStatus,
  countFilledSlots,
  detectKeyEvent,
  fetchCheckinStatus,
  fetchSoftContext,
  type KeyEventKind
} from './keyEvents'
import { MessagesMode } from './MessagesMode'
import { generatePlan, type PlanResult } from './planApi'
import { StageMode } from './StageMode'

type ViewMode = 'stage' | 'messages'
export type WorkspacePhase = 'intake' | 'chat'

// Slot progress: how many of the 4 soft-context slots are filled.
export interface SlotProgress {
  total: number
  filled: number
}

// The 4 intake slots in order — each answer advances the counter.
export type IntakeSlotName = 'why' | 'obstacles' | 'time_constraints' | 'skill'

function slotCount(slots: ContextTurnResponse['slots']): number {
  return [slots.why, slots.obstacles, slots.time_constraints, slots.skill].filter((v) => v !== null).length
}

function makeMockIntakeMessage(text: string, emotion: Emotion = 'curious'): WorkspaceMessage {
  return {
    id: crypto.randomUUID(),
    from: 'kawan',
    text,
    emotion,
    responseType: 'coaching'
  }
}

// Static canned mock intake — 4 turns then chat, zero network.
const MOCK_INTAKE_TURNS = [
  {
    say: "Before we dive in, I have 4 quick questions to get the full picture. First: what's the deeper reason this matters to you?",
    emotion: 'curious' as Emotion
  },
  { say: "And what's the main obstacle you're already expecting?", emotion: 'skeptical' as Emotion },
  { say: 'How tight is your timeline for this?', emotion: 'curious' as Emotion },
  { say: 'How confident are you in your skills for this task?', emotion: 'curious' as Emotion }
]

function mockChatReply(userText: string): WorkspaceMessage {
  const kawanTurns = mockConversation.filter((t) => t.speaker === 'kawan')
  const pick = kawanTurns[Math.floor(Math.random() * kawanTurns.length)]
  return {
    id: crypto.randomUUID(),
    from: 'kawan',
    text: pick?.text ?? `You said: ${userText}. (mock reply)`,
    emotion: pick?.emotion ?? 'neutral',
    responseType: 'coaching'
  }
}

export function WorkspaceLayout() {
  const navigate = useNavigate()
  const { id: commitmentId } = useParams<{ id: string }>()
  const { active: tourActive, currentStep: tourStep } = useDemoTour()
  const [viewMode, setViewMode] = useState<ViewMode>('stage')
  const [viewSwitching, setViewSwitching] = useState(false)
  const [messages, setMessages] = useState<WorkspaceMessage[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<WorkspacePhase>('intake')
  const [slotProgress, setSlotProgress] = useState<SlotProgress>({ total: 4, filled: 0 })
  // Current intake slot index (0–3); 4 means all done.
  const [intakeStep, setIntakeStep] = useState(0)
  // Commitment fetched on mount for intake options + starters
  const [commitment, setCommitment] = useState<Commitment | null>(null)
  // Plan result — generated once after intake completes
  const [plan, setPlan] = useState<PlanResult | null>(null)

  // Plan generating flag — true while /plan is in-flight
  const [planGenerating, setPlanGenerating] = useState(false)
  // Checkin status from GET /{id}/checkin-status — drives key-event detection
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus | null>(null)
  // Key event kind derived from commitment state + checkin status
  const [keyEvent, setKeyEvent] = useState<KeyEventKind>(null)

  // Mock intake turn tracker (MOCK_AUTH only)
  const mockIntakeTurnRef = useRef(0)
  // Guard: fire the intake opener only once on mount
  const intakeOpenerFired = useRef(false)
  // Guard: generatePlan fires only once after intake completes
  const planFiredRef = useRef(false)
  // Last failed turn — used by handleRetry to re-fire.
  const lastFailedTurnRef = useRef<{ endpoint: 'intake' | 'chat'; text: string } | null>(null)

  // On mount: fetch the commitment + load persisted history, then decide phase.
  // 1.3: hydrate messages from backend; if non-empty + intake done → chat; else opener.
  // 2.4: fetch commitment for intakeOptions/starters.
  useEffect(() => {
    if (intakeOpenerFired.current) return
    intakeOpenerFired.current = true

    if (MOCK_AUTH) {
      // MOCK path: canned 4-question intake then flip to chat
      const opener = MOCK_INTAKE_TURNS[0]
      if (opener) {
        setMessages([makeMockIntakeMessage(opener.say, opener.emotion)])
      }
      mockIntakeTurnRef.current = 1
      return
    }

    if (!commitmentId) return

    async function init() {
      if (!commitmentId) return

      // Fetch the commitment for intakeOptions + starters (2.4)
      try {
        const c = await fetchCommitmentById(commitmentId)
        setCommitment(c)
      } catch {
        // Non-fatal — starters + options fall back gracefully
      }

      // 1.3: load persisted history
      let history: WorkspaceMessage[] = []
      try {
        history = await fetchMessages(commitmentId)
      } catch {
        // Non-fatal — treat as empty history, run opener
      }

      if (history.length > 0) {
        // Fix B: use real slot count from GET /{id}/soft-context, not userTurns heuristic.
        // intake complete = all 4 slots non-null; otherwise resume at the filled-slot index.
        const slots = await fetchSoftContext(commitmentId)
        const filledCount = slots ? countFilledSlots(slots) : 0
        setMessages(history)
        if (filledCount >= 4) {
          setPhase('chat')
          setSlotProgress({ total: 4, filled: 4 })
          setIntakeStep(4)
        } else {
          // Partial intake — resume from the real filled-slot index
          setPhase('intake')
          setSlotProgress({ total: 4, filled: filledCount })
          setIntakeStep(filledCount)
        }
        // Don't re-fire the opener when history exists
        return
      }

      // No history — fire opener turn
      setSending(true)
      contextTurn(commitmentId, '')
        .then((resp) => {
          const msg: WorkspaceMessage = {
            id: crypto.randomUUID(),
            from: 'kawan',
            text: resp.say,
            emotion: resp.emotion,
            responseType: 'coaching'
          }
          setMessages([msg])
          setSlotProgress({ total: 4, filled: slotCount(resp.slots) })
          if (resp.intake_complete) {
            setPhase('chat')
            setIntakeStep(4)
          }
        })
        .catch(() => {
          setMessages([
            {
              id: crypto.randomUUID(),
              from: 'kawan',
              text: 'So — what are we actually doing here?',
              emotion: 'neutral',
              responseType: 'coaching'
            }
          ])
          setPhase('chat')
        })
        .finally(() => setSending(false))
    }

    void init()
  }, [commitmentId])

  // 1.6: fire generatePlan ONCE when phase flips to 'chat'
  useEffect(() => {
    if (phase !== 'chat') return
    if (planFiredRef.current) return
    if (!commitmentId || MOCK_AUTH) return
    planFiredRef.current = true

    setPlanGenerating(true)
    generatePlan(commitmentId)
      .then((result) => {
        if (result) setPlan(result)
      })
      .catch(() => {
        // Non-fatal — no plan, no crash
      })
      .finally(() => setPlanGenerating(false))
  }, [phase, commitmentId])

  // 3.6: load checkin status and derive key event when in chat phase
  useEffect(() => {
    if (phase !== 'chat') return
    if (!commitmentId || MOCK_AUTH || !commitment) return

    fetchCheckinStatus(commitmentId).then((status) => {
      setCheckinStatus(status)
      const kind = detectKeyEvent(commitment.status, commitment.deadline, status)
      setKeyEvent(kind)
    })
  }, [phase, commitmentId, commitment])

  // Handle an intake answer — calls context/turn, updates slots, flips phase when complete.
  const handleIntakeAnswer = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || sending) return

      const userMsg: WorkspaceMessage = { id: crypto.randomUUID(), from: 'user', text: trimmed }
      setMessages((prev) => [...prev, userMsg])
      setSending(true)
      setError(null)

      if (MOCK_AUTH) {
        await new Promise<void>((r) => setTimeout(r, 350))
        const nextIdx = mockIntakeTurnRef.current
        const next = MOCK_INTAKE_TURNS[nextIdx]
        if (next) {
          mockIntakeTurnRef.current = nextIdx + 1
          setMessages((prev) => [...prev, makeMockIntakeMessage(next.say, next.emotion)])
          setIntakeStep(nextIdx + 1)
          setSlotProgress({ total: 4, filled: nextIdx + 1 })
        } else {
          setMessages((prev) => [
            ...prev,
            makeMockIntakeMessage("Got it — let's work through this together.", 'pleased')
          ])
          setPhase('chat')
          setIntakeStep(4)
          setSlotProgress({ total: 4, filled: 4 })
        }
        setSending(false)
        return
      }

      if (!commitmentId) {
        setError('No commitment ID — cannot reach Kawan.')
        setSending(false)
        return
      }

      try {
        const resp = await contextTurn(commitmentId, trimmed)
        const kawanMsg: WorkspaceMessage = {
          id: crypto.randomUUID(),
          from: 'kawan',
          text: resp.say,
          emotion: resp.emotion,
          responseType: 'coaching'
        }
        setMessages((prev) => [...prev, kawanMsg])
        const filled = slotCount(resp.slots)
        setSlotProgress({ total: 4, filled })
        setIntakeStep(filled)
        if (resp.intake_complete) {
          setPhase('chat')
          setIntakeStep(4)
        }
      } catch (err) {
        lastFailedTurnRef.current = { endpoint: 'intake', text: trimmed }
        setError(err instanceof Error ? err.message : "Kawan couldn't reply just now — tap to retry")
      } finally {
        setSending(false)
      }
    },
    [commitmentId, sending]
  )

  // Handle open-chat send — workspace/turn endpoint.
  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || sending) return

      const userMsg: WorkspaceMessage = { id: crypto.randomUUID(), from: 'user', text: trimmed }
      setMessages((prev) => [...prev, userMsg])
      setSending(true)
      setError(null)

      if (MOCK_AUTH) {
        await new Promise<void>((r) => setTimeout(r, 400))
        setMessages((prev) => [...prev, mockChatReply(trimmed)])
        setSending(false)
        return
      }

      if (!commitmentId) {
        setError('No commitment ID in URL — cannot reach Kawan.')
        setSending(false)
        return
      }

      try {
        const recentTurns = messages.map((m) => ({
          role: m.from === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.text
        }))
        const reply = await workspaceTurn(commitmentId, trimmed, recentTurns)
        const kawanMsg: WorkspaceMessage = {
          id: crypto.randomUUID(),
          from: 'kawan',
          text: reply.say,
          emotion: reply.emotion,
          responseType: reply.response_type,
          proposal: reply.response_type === 'proposal' && reply.proposal_id ? reply.proposal : null,
          proposalId: reply.response_type === 'proposal' ? reply.proposal_id : undefined,
          proposalState: reply.response_type === 'proposal' && reply.proposal_id ? 'open' : undefined
        }
        setMessages((prev) => [...prev, kawanMsg])
      } catch (err) {
        lastFailedTurnRef.current = { endpoint: 'chat', text: trimmed }
        setError(err instanceof Error ? err.message : "Kawan couldn't reply just now — tap to retry")
      } finally {
        setSending(false)
      }
    },
    [commitmentId, sending, messages]
  )

  function handleRetry() {
    const failed = lastFailedTurnRef.current
    if (!failed) {
      setError(null)
      return
    }
    setError(null)
    lastFailedTurnRef.current = null
    setSending(true)
    if (failed.endpoint === 'intake' && commitmentId) {
      contextTurn(commitmentId, failed.text)
        .then((resp) => {
          const kawanMsg: WorkspaceMessage = {
            id: crypto.randomUUID(),
            from: 'kawan',
            text: resp.say,
            emotion: resp.emotion,
            responseType: 'coaching'
          }
          setMessages((prev) => [...prev, kawanMsg])
          const filled = slotCount(resp.slots)
          setSlotProgress({ total: 4, filled })
          setIntakeStep(filled)
          if (resp.intake_complete) {
            setPhase('chat')
            setIntakeStep(4)
          }
        })
        .catch((err) => {
          lastFailedTurnRef.current = failed
          setError(err instanceof Error ? err.message : "Kawan couldn't reply just now — tap to retry")
        })
        .finally(() => setSending(false))
    } else if (failed.endpoint === 'chat' && commitmentId) {
      workspaceTurn(commitmentId, failed.text)
        .then((reply) => {
          const kawanMsg: WorkspaceMessage = {
            id: crypto.randomUUID(),
            from: 'kawan',
            text: reply.say,
            emotion: reply.emotion,
            responseType: reply.response_type,
            proposal: reply.response_type === 'proposal' && reply.proposal_id ? reply.proposal : null,
            proposalId: reply.response_type === 'proposal' ? reply.proposal_id : undefined,
            proposalState: reply.response_type === 'proposal' && reply.proposal_id ? 'open' : undefined
          }
          setMessages((prev) => [...prev, kawanMsg])
        })
        .catch((err) => {
          lastFailedTurnRef.current = failed
          setError(err instanceof Error ? err.message : "Kawan couldn't reply just now — tap to retry")
        })
        .finally(() => setSending(false))
    } else {
      setSending(false)
    }
  }

  function handleProposalApplied(messageId: string) {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, proposalState: 'applied' } : m)))
  }

  function handleProposalDismissed(messageId: string) {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, proposalState: 'dismissed' } : m)))
  }

  // 2.1: openerLoading — true while the very first Kawan message is fetching.
  // Once messages.length > 0 it clears (catch path always sets a message too).
  const openerLoading = phase === 'intake' && messages.length === 0 && sending

  // 2.1: brief loading state on viewMode switch — clears on next paint via requestAnimationFrame.
  function handleViewModeSwitch(next: ViewMode) {
    if (next === viewMode) return
    setViewSwitching(true)
    setViewMode(next)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setViewSwitching(false))
    })
  }

  const sharedProps = {
    messages,
    // 2.1: suppress typing-dots in views while openerLoading is true
    sending: openerLoading ? false : sending,
    error,
    commitmentId: commitmentId ?? '',
    phase,
    slotProgress,
    commitment,
    intakeStep,
    openerLoading,
    keyEvent,
    checkinStatus,
    onSend: handleSend,
    onIntakeAnswer: handleIntakeAnswer,
    onRetry: handleRetry,
    onProposalApplied: handleProposalApplied,
    onProposalDismissed: handleProposalDismissed
  }

  // 3.6: commitment failure — overlay the ending sequence instead of the normal workspace
  const isFailure = keyEvent === 'failure' && commitment !== null

  const isLoading = openerLoading || viewSwitching

  return (
    <div className="workspace-root">
      {/* Header bar */}
      <div className="workspace-topbar">
        <button
          type="button"
          className="workspace-back-btn"
          aria-label={tourActive && tourStep === 2 ? 'Continue to analytics' : 'Back to commitment'}
          onClick={() =>
            tourActive && tourStep === 2 ? navigate('/welcome/analytics') : navigate(`/commitments/${commitmentId}`)
          }
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{tourActive && tourStep === 2 ? 'Analytics' : 'Back'}</span>
        </button>
        <div className="workspace-mode-toggle" role="toolbar" aria-label="View mode">
          <button
            type="button"
            className={`workspace-mode-btn ${viewMode === 'stage' ? 'workspace-mode-btn-active' : ''}`}
            aria-pressed={viewMode === 'stage'}
            onClick={() => handleViewModeSwitch('stage')}
          >
            Stage
          </button>
          <button
            type="button"
            className={`workspace-mode-btn ${viewMode === 'messages' ? 'workspace-mode-btn-active' : ''}`}
            aria-pressed={viewMode === 'messages'}
            onClick={() => handleViewModeSwitch('messages')}
          >
            Messages
          </button>
        </div>
        <div className="workspace-spacer" aria-hidden="true" />
      </div>

      {/* Main stage area — wrapper gets blur class while loading; stage never remounts */}
      <div className={`workspace-stage${isLoading ? ' workspace-loading' : ''}`} aria-busy={isLoading}>
        {viewMode === 'stage' ? <StageMode {...sharedProps} /> : <MessagesMode {...sharedProps} />}
        {/* 2.1: single labeled spinner ABOVE the blur layer, explicit z-index */}
        {isLoading && (
          <div className="workspace-loading-spinner" role="status" aria-label="Loading">
            <span className="workspace-spinner-ring" aria-hidden="true" />
            <span className="workspace-spinner-label">Loading...</span>
          </div>
        )}

        {/* 3.6: Commitment failure overlay — replaces normal workspace interaction */}
        {isFailure && (
          <div className="workspace-failure-overlay">
            <EndingSequence variant="failure" commitment={commitment} />
          </div>
        )}

        {/* Phase 3 islands — DOM siblings over the stage, never cause a remount.
            Only shown in chat phase (post-intake) and when not in failure state. */}
        {phase === 'chat' && !isFailure && commitmentId && (
          <>
            {/* Top-left: Activity card */}
            <div className="workspace-island-topleft">
              <ActivityCard commitmentId={commitmentId} />
            </div>

            {/* Top-right: all four islands stacked vertically, always available.
                keyEvent drives late tone on Check-In but never hides it.
                Finish requires commitment to be non-null for the ending sequence. */}
            <div className="workspace-island-topright">
              <ContextIsland commitmentId={commitmentId} slotProgress={slotProgress} />
              <PlanIsland plan={plan} commitment={commitment} generating={planGenerating} />
              <CheckinIsland
                commitmentId={commitmentId}
                checkinStatus={checkinStatus}
                variant={keyEvent === 'late-checkin' ? 'late-checkin' : keyEvent === 'checkin' ? 'checkin' : null}
              />
              {commitment && <FinishIsland commitmentId={commitmentId} commitment={commitment} />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
