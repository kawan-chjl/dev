// WorkspaceLayout — Zone 2 full-screen workspace for /workspace/:id
// No shell chrome. Local viewMode: 'stage' | 'messages'. Shared conversation state.
// T4: phased VN-intake (phase:'intake') → open chat (phase:'chat').
// Phase lives here; stage NEVER remounts (A3 design §4, PO decision 6).

import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MOCK_AUTH } from '../auth/api'
import type { ContextTurnResponse } from '../commitments/api'
import { contextTurn, fetchCommitmentById } from '../commitments/api'
import { mockConversation } from '../mock/fixtures'
import type { Commitment, Emotion } from '../types/api'
import type { WorkspaceMessage } from '../workspace/api'
import { workspaceTurn } from '../workspace/api'
import { fetchMessages } from '../workspace/messagesApi'
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
    say: "Before we dive in — I have 4 quick questions to get the full picture. First: what's the deeper reason this matters to you?",
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
        // History exists — determine phase from slot count
        // Count how many slots look filled by examining message count heuristic.
        // A robust signal: if messages include 4+ user turns, intake is complete.
        const userTurns = history.filter((m) => m.from === 'user').length
        setMessages(history)
        if (userTurns >= 4) {
          setPhase('chat')
          setSlotProgress({ total: 4, filled: 4 })
          setIntakeStep(4)
        } else {
          // Partial intake — resume from where we left off
          setPhase('intake')
          setSlotProgress({ total: 4, filled: userTurns })
          setIntakeStep(userTurns)
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

    generatePlan(commitmentId)
      .then((result) => {
        if (result) setPlan(result)
      })
      .catch(() => {
        // Non-fatal — no plan, no crash
      })
  }, [phase, commitmentId])

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

  // plan is held in state for Phase 3 islands; views don't consume it directly yet.
  void plan

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
    onSend: handleSend,
    onIntakeAnswer: handleIntakeAnswer,
    onRetry: handleRetry,
    onProposalApplied: handleProposalApplied,
    onProposalDismissed: handleProposalDismissed
  }

  const isLoading = openerLoading || viewSwitching

  return (
    <div className="workspace-root">
      {/* Header bar */}
      <div className="workspace-topbar">
        <button
          type="button"
          className="workspace-back-btn"
          aria-label="Back to commitment"
          onClick={() => navigate(`/commitments/${commitmentId}`)}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back</span>
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
      </div>
    </div>
  )
}
