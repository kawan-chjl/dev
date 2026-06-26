// WorkspaceLayout — Zone 2 full-screen workspace for /workspace/:id
// No shell chrome. Local viewMode: 'stage' | 'messages'. Shared conversation state.
// A3: wired off getMockConversation() onto the B5 REST endpoint (POST workspace/turn).
// Transcript lives in React state only — no DB (PO decision, per a3-workspace-chat-design.md §5).

import { ArrowLeft } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MOCK_AUTH } from '../auth/api'
import { mockConversation } from '../mock/fixtures'
import type { Emotion } from '../types/api'
import type { WorkspaceMessage } from '../workspace/api'
import { workspaceTurn } from '../workspace/api'
import { MessagesMode } from './MessagesMode'
import { StageMode } from './StageMode'

type ViewMode = 'stage' | 'messages'

// Static client greeting — shown on empty state (no network call on mount, per design §6).
const GREETING_TEXT = 'So — what are we actually doing here?'
const GREETING_EMOTION: Emotion = 'neutral'

function makeGreeting(): WorkspaceMessage {
  return {
    id: crypto.randomUUID(),
    from: 'kawan',
    text: GREETING_TEXT,
    emotion: GREETING_EMOTION,
    responseType: 'coaching'
  }
}

function mockReply(userText: string): WorkspaceMessage {
  // Cycle through the mock conversation for variety in MOCK_AUTH mode.
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
  const [messages, setMessages] = useState<WorkspaceMessage[]>([makeGreeting()])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || sending) return

      // Append user turn immediately for responsiveness.
      const userMsg: WorkspaceMessage = { id: crypto.randomUUID(), from: 'user', text: trimmed }
      setMessages((prev) => [...prev, userMsg])
      setSending(true)
      setError(null)

      if (MOCK_AUTH) {
        // Offline mode — canned reply, zero network.
        await new Promise<void>((r) => setTimeout(r, 400))
        setMessages((prev) => [...prev, mockReply(trimmed)])
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
          // Only attach proposal data when response_type is 'proposal' AND proposal_id exists.
          proposal: reply.response_type === 'proposal' && reply.proposal_id ? reply.proposal : null,
          proposalId: reply.response_type === 'proposal' ? reply.proposal_id : undefined,
          proposalState: reply.response_type === 'proposal' && reply.proposal_id ? 'open' : undefined
        }
        setMessages((prev) => [...prev, kawanMsg])
      } catch (err) {
        // Non-fatal: preserve the user's typed text via the already-appended userMsg;
        // surface the error but NEVER fabricate an AI reply.
        setError(err instanceof Error ? err.message : "Couldn't reach Kawan — try again")
      } finally {
        setSending(false)
      }
    },
    [commitmentId, sending]
  )

  function handleProposalApplied(messageId: string) {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, proposalState: 'applied' } : m)))
  }

  function handleProposalDismissed(messageId: string) {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, proposalState: 'dismissed' } : m)))
  }

  return (
    <div className="workspace-root">
      {/* Header bar */}
      <div className="workspace-topbar">
        <button
          type="button"
          className="workspace-back-btn"
          aria-label="Back to home"
          onClick={() => navigate('/home')}
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
        {viewMode === 'stage' ? (
          <StageMode
            messages={messages}
            sending={sending}
            error={error}
            commitmentId={commitmentId ?? ''}
            onSend={handleSend}
            onProposalApplied={handleProposalApplied}
            onProposalDismissed={handleProposalDismissed}
          />
        ) : (
          <MessagesMode
            messages={messages}
            sending={sending}
            error={error}
            commitmentId={commitmentId ?? ''}
            onSend={handleSend}
            onProposalApplied={handleProposalApplied}
            onProposalDismissed={handleProposalDismissed}
          />
        )}
      </div>
    </div>
  )
}
