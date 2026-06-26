// MessagesMode — iMessage/Messenger-style thread over real WorkspaceMessage state.
// A3: input bar enabled; refusal styling; proposal card inline; mic populates input.
// Kawan = serif on terracotta-tinted bubble. User = sans on --surface-sunk.

import { MessageCircle, Mic, MicOff, Send, ShieldX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { WorkspaceMessage } from '../workspace/api'
import { ProposalCard } from './ProposalCard'
import { useSpeechInput } from './voice/useSpeechInput'

interface MessagesModeProps {
  messages: WorkspaceMessage[]
  sending: boolean
  error: string | null
  commitmentId: string
  onSend: (text: string) => Promise<void>
  onProposalApplied: (messageId: string) => void
  onProposalDismissed: (messageId: string) => void
}

// Empty-state starter chips — shown only when the only message is the static greeting.
const STARTER_CHIPS = [
  "I shipped something yesterday — here's what I did.",
  "I'm stuck and not sure what to do next.",
  'I want to re-scope this commitment.'
]

export function MessagesMode({
  messages,
  sending,
  error,
  commitmentId,
  onSend,
  onProposalApplied,
  onProposalDismissed
}: MessagesModeProps) {
  const [inputText, setInputText] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)
  const mic = useSpeechInput()

  // When mic delivers a final transcript, copy it into the input (user reviews, then sends).
  useEffect(() => {
    if (!mic.listening && mic.transcript) {
      setInputText(mic.transcript)
      mic.clearTranscript()
    }
  }, [mic.listening, mic.transcript, mic.clearTranscript])

  // Auto-scroll to bottom on new messages.
  // biome-ignore lint/correctness/useExhaustiveDependencies: threadRef.current is a DOM ref, not a reactive dep
  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, sending])

  function handleSend() {
    const text = inputText.trim()
    if (!text || sending) return
    setInputText('')
    void onSend(text)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleMicToggle() {
    if (mic.listening) {
      mic.stop()
    } else {
      mic.start()
    }
  }

  const showStarterChips = messages.length === 1 && messages[0].from === 'kawan'

  return (
    <div className="messages-mode">
      <div ref={threadRef} className="messages-thread" role="log" aria-label="Conversation thread" aria-live="polite">
        {messages.map((msg) => {
          const isKawan = msg.from === 'kawan'
          const isRefusal = isKawan && msg.responseType === 'refusal'
          const hasProposal =
            isKawan &&
            msg.responseType === 'proposal' &&
            msg.proposal &&
            msg.proposalId &&
            msg.proposalState !== 'dismissed'

          return (
            <div key={msg.id} className={`message-row ${isKawan ? 'message-row-kawan' : 'message-row-user'}`}>
              {isKawan && (
                <div className="message-avatar" aria-hidden="true">
                  <MessageCircle size={18} />
                </div>
              )}
              <div className="message-col">
                <div
                  className={[
                    'message-bubble',
                    isKawan ? 'bubble-kawan' : 'bubble-user',
                    isRefusal ? 'bubble-kawan--refusal' : ''
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {isRefusal && (
                    <div className="message-refusal-chip">
                      <ShieldX size={12} aria-hidden="true" />
                      <span>won't do that</span>
                    </div>
                  )}
                  <p className="message-text">{msg.text}</p>
                </div>

                {/* Proposal card — inline below the Kawan bubble */}
                {hasProposal && msg.proposal && msg.proposalId && (
                  <ProposalCard
                    commitmentId={commitmentId}
                    proposalId={msg.proposalId}
                    proposal={msg.proposal}
                    state={msg.proposalState ?? 'open'}
                    onApplied={() => onProposalApplied(msg.id)}
                    onDismissed={() => onProposalDismissed(msg.id)}
                  />
                )}
              </div>
            </div>
          )
        })}

        {/* Empty-state starter chips — below greeting, pre-fill input only (not auto-send) */}
        {showStarterChips && (
          <ul className="messages-starter-chips" aria-label="Suggested starters">
            {STARTER_CHIPS.map((chip) => (
              <li key={chip}>
                <button type="button" className="messages-starter-chip" onClick={() => setInputText(chip)}>
                  {chip}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Typing indicator bubble */}
        {sending && (
          <div className="message-row message-row-kawan">
            <div className="message-avatar" aria-hidden="true">
              <MessageCircle size={18} />
            </div>
            <div className="message-col">
              <div className="message-bubble bubble-kawan">
                <div className="message-typing-indicator" role="status" aria-label="Kawan is thinking">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Network error row — above input, non-fatal */}
        {error && !sending && (
          <div className="messages-error-row" role="alert">
            {error}
          </div>
        )}
      </div>

      {/* Mic transcript display */}
      {mic.listening && (
        <div className="messages-mic-bar" role="status" aria-live="polite">
          <span className="stage-mic-label">Listening…</span>
          <span className="stage-mic-text">{mic.transcript}</span>
        </div>
      )}

      {/* Text input bar — enabled */}
      <div className="messages-input-bar">
        <button
          type="button"
          className="messages-mic-btn stage-voice-btn"
          onClick={handleMicToggle}
          aria-label={
            !mic.supported
              ? 'Voice input not supported in this browser'
              : mic.listening
                ? 'Stop listening'
                : 'Start voice input'
          }
          aria-pressed={mic.listening}
          disabled={!mic.supported || sending}
          title={!mic.supported ? 'Voice input needs Chrome or a supported browser' : undefined}
        >
          {mic.listening ? <MicOff size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
        </button>
        <input
          className="messages-input"
          type="text"
          placeholder={sending ? 'Kawan is thinking…' : 'Message Kawan…'}
          aria-label="Message input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          readOnly={mic.listening}
        />
        <button
          type="button"
          className="messages-send-btn"
          onClick={handleSend}
          disabled={sending || !inputText.trim()}
          aria-label={sending ? 'Sending…' : 'Send message'}
        >
          <Send size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
