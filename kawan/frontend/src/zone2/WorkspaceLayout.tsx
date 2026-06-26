// WorkspaceLayout — Zone 2 full-screen workspace for /workspace/:id
// No shell chrome. Local viewMode: 'stage' | 'messages'. Shared conversation state.
// T4: phased VN-intake (phase:'intake') → open chat (phase:'chat').
// Phase lives here; stage NEVER remounts (A3 design §4, PO decision 6).

import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MOCK_AUTH } from '../auth/api'
import type { ContextTurnResponse } from '../commitments/api'
import { contextTurn } from '../commitments/api'
import { mockConversation } from '../mock/fixtures'
import type { Commitment, Emotion } from '../types/api'
import type { WorkspaceMessage } from '../workspace/api'
import { workspaceTurn } from '../workspace/api'
import { MessagesMode } from './MessagesMode'
import { StageMode } from './StageMode'

type ViewMode = 'stage' | 'messages'
export type WorkspacePhase = 'intake' | 'chat'

// Slot progress: how many of the 4 soft-context slots are filled.
export interface SlotProgress {
  total: number
  filled: number
}

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

// Static canned mock intake — 2 turns then chat, zero network.
const MOCK_INTAKE_TURNS = [
  { say: "Before we dive in — what's the deeper reason this matters to you?", emotion: 'curious' as Emotion },
  { say: "And what's the main obstacle you're already expecting?", emotion: 'skeptical' as Emotion }
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
  const [messages, setMessages] = useState<WorkspaceMessage[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<WorkspacePhase>('intake')
  const [slotProgress, setSlotProgress] = useState<SlotProgress>({ total: 4, filled: 0 })
  // commitment passed to starters (T5) — null until fetched; starters fall back gracefully
  const commitment = null as Commitment | null

  // Mock intake turn tracker (MOCK_AUTH only)
  const mockIntakeTurnRef = useRef(0)
  // Guard: fire the intake opener only once on mount
  const intakeOpenerFired = useRef(false)
  // Last failed turn — used by handleRetry to re-fire.
  const lastFailedTurnRef = useRef<{ endpoint: 'intake' | 'chat'; text: string } | null>(null)

  // On mount: determine entry phase and fire the intake opener (or start in chat if slots exist).
  // OQ-INTAKE-ENTRY: start intake only when 0 slots captured; otherwise chat.
  // OQ-INTAKE-OPENER: auto-fire one context/turn with empty say to get the first question.
  useEffect(() => {
    if (intakeOpenerFired.current) return
    intakeOpenerFired.current = true

    if (MOCK_AUTH) {
      // MOCK path: canned 2-question intake then flip to chat
      const opener = MOCK_INTAKE_TURNS[0]
      if (opener) {
        setMessages([makeMockIntakeMessage(opener.say, opener.emotion)])
      }
      mockIntakeTurnRef.current = 1
      return
    }

    if (!commitmentId) return

    // Fire opener turn — empty say, backend prompt handles it.
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
        }
      })
      .catch(() => {
        // If opener fails, go straight to chat with the static greeting
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
  }, [commitmentId])

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
        } else {
          // All mock turns done — flip to chat
          setMessages((prev) => [
            ...prev,
            makeMockIntakeMessage("Got it — let's work through this together.", 'pleased')
          ])
          setPhase('chat')
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
        setSlotProgress({ total: 4, filled: slotCount(resp.slots) })
        // OQ-INTAKE-SIGNAL: flip on intake_complete flag, NOT slot count
        if (resp.intake_complete) {
          setPhase('chat')
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
        const reply = await workspaceTurn(commitmentId, trimmed)
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
    [commitmentId, sending]
  )

  function handleRetry() {
    const failed = lastFailedTurnRef.current
    if (!failed) {
      setError(null)
      return
    }
    setError(null)
    lastFailedTurnRef.current = null
    // Re-fire the API call only (user message is already in the thread).
    // Do not call handleIntakeAnswer/handleSend to avoid re-appending the user bubble.
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
          setSlotProgress({ total: 4, filled: slotCount(resp.slots) })
          if (resp.intake_complete) setPhase('chat')
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

  function handleSkipIntake() {
    setPhase('chat')
  }

  const sharedProps = {
    messages,
    sending,
    error,
    commitmentId: commitmentId ?? '',
    phase,
    slotProgress,
    commitment,
    onSend: handleSend,
    onIntakeAnswer: handleIntakeAnswer,
    onRetry: handleRetry,
    onSkipIntake: handleSkipIntake,
    onProposalApplied: handleProposalApplied,
    onProposalDismissed: handleProposalDismissed
  }

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
            onClick={() => setViewMode('stage')}
          >
            Stage
          </button>
          <button
            type="button"
            className={`workspace-mode-btn ${viewMode === 'messages' ? 'workspace-mode-btn-active' : ''}`}
            aria-pressed={viewMode === 'messages'}
            onClick={() => setViewMode('messages')}
          >
            Messages
          </button>
        </div>
        <div className="workspace-spacer" aria-hidden="true" />
      </div>

      {/* Main stage area */}
      <div className="workspace-stage">
        {viewMode === 'stage' ? <StageMode {...sharedProps} /> : <MessagesMode {...sharedProps} />}
      </div>
    </div>
  )
}
