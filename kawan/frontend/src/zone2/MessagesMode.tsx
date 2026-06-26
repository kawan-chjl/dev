// MessagesMode — iMessage/Messenger-style thread over real WorkspaceMessage state.
// A3: input bar enabled; refusal styling; proposal card inline; mic populates input.
// T4: phase-aware — intake phase shows VN action menu; chat shows input bar + contextual starters.
// Layout fix: centered ~720px max-width column, thread anchored near the input.
// Kawan = serif on terracotta-tinted bubble. User = sans on --surface-sunk.

import { MessageCircle, Mic, MicOff, Send, ShieldX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Commitment } from '../types/api'
import type { WorkspaceMessage } from '../workspace/api'
import { renderMarkdown } from './markdown'
import { ProposalCard } from './ProposalCard'
import { starterChipsForState } from './starterChips'
import { useSpeechInput } from './voice/useSpeechInput'
import type { SlotProgress, WorkspacePhase } from './WorkspaceLayout'

interface MessagesModeProps {
  messages: WorkspaceMessage[]
  sending: boolean
  error: string | null
  commitmentId: string
  phase: WorkspacePhase
  slotProgress: SlotProgress
  commitment: Commitment | null
  onSend: (text: string) => Promise<void>
  onIntakeAnswer: (text: string) => Promise<void>
  onRetry: () => void
  onSkipIntake: () => void
  onProposalApplied: (messageId: string) => void
  onProposalDismissed: (messageId: string) => void
}

// Canned intake options matching StageMode (kept in sync here).
const INTAKE_CANNED: string[] = [
  "That's a great question — let me think...",
  'I already know the answer',
  "I'm not sure yet"
]

export function MessagesMode({
  messages,
  sending,
  error,
  commitmentId,
  phase,
  slotProgress,
  commitment,
  onSend,
  onIntakeAnswer,
  onRetry,
  onSkipIntake,
  onProposalApplied,
  onProposalDismissed
}: MessagesModeProps) {
  const [inputText, setInputText] = useState('')
  const [showTypeOwn, setShowTypeOwn] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)
  const mic = useSpeechInput()

  useEffect(() => {
    if (!mic.listening && mic.transcript) {
      setInputText(mic.transcript)
      mic.clearTranscript()
    }
  }, [mic.listening, mic.transcript, mic.clearTranscript])

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

  function handleIntakeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTypeOwnSend()
    }
  }

  function handleTypeOwnSend() {
    const text = inputText.trim()
    if (!text || sending) return
    setInputText('')
    setShowTypeOwn(false)
    void onIntakeAnswer(text)
  }

  function handleCannedSelect(text: string) {
    void onIntakeAnswer(text)
  }

  function handleSkip() {
    void onIntakeAnswer('(skip)')
  }

  function handleMicToggle() {
    if (mic.listening) {
      mic.stop()
    } else {
      mic.start()
    }
  }

  // Starter chips — chat phase, no user messages yet
  const showStarterChips = phase === 'chat' && messages.filter((m) => m.from === 'user').length === 0
  const starterChips = starterChipsForState(commitment)

  return (
    <div className="messages-mode">
      {/* Slot progress bar + skip-ahead escape hatch — intake phase only */}
      {phase === 'intake' && (
        <div className="messages-intake-progress" role="status" aria-live="polite" aria-atomic="true">
          <span className="messages-intake-label">Context</span>
          {Array.from({ length: slotProgress.total }).map((_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: static fixed-length array
              key={i}
              className={`messages-intake-dot${i < slotProgress.filled ? ' messages-intake-dot--filled' : ''}`}
            />
          ))}
          <button type="button" className="messages-intake-skip-ahead" onClick={onSkipIntake}>
            Skip ahead — let's just talk
          </button>
        </div>
      )}

      {/* Thread — centered max-width column, content anchors near input when sparse */}
      <div ref={threadRef} className="messages-thread" role="log" aria-label="Conversation thread" aria-live="polite">
        <div className="messages-thread-inner">
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
                    <div className="message-text">{isKawan ? renderMarkdown(msg.text) : msg.text}</div>
                  </div>

                  {/* Proposal card — inline below the Kawan bubble, visually separate */}
                  {hasProposal && msg.proposal && msg.proposalId && (
                    <div className="message-proposal-sep">
                      <ProposalCard
                        commitmentId={commitmentId}
                        proposalId={msg.proposalId}
                        proposal={msg.proposal}
                        state={msg.proposalState ?? 'open'}
                        onApplied={() => onProposalApplied(msg.id)}
                        onDismissed={() => onProposalDismissed(msg.id)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Starter chips — below greeting in chat phase, separate from message */}
          {showStarterChips && (
            <div className="messages-starters-row">
              {starterChips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  className="messages-starter-chip"
                  onClick={() => setInputText(chip.action.text)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
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

          {/* Friendly error row — never a raw URL/status string */}
          {error && !sending && (
            <div className="messages-error-row" role="alert">
              <span>{error}</span>
              <button type="button" className="messages-error-retry" onClick={onRetry}>
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mic transcript display */}
      {mic.listening && (
        <div className="messages-mic-bar" role="status" aria-live="polite">
          <span className="stage-mic-label">Listening…</span>
          <span className="stage-mic-text">{mic.transcript}</span>
        </div>
      )}

      {/* Phase 1 — intake action menu (VN hybrid: canned + type own + skip) */}
      {phase === 'intake' && !showTypeOwn && (
        <fieldset className="messages-intake-menu">
          <legend className="sr-only">Intake response options</legend>
          {INTAKE_CANNED.map((option) => (
            <button
              key={option}
              type="button"
              className="messages-intake-btn"
              disabled={sending}
              onClick={() => handleCannedSelect(option)}
            >
              {option}
            </button>
          ))}
          <button
            type="button"
            className="messages-intake-btn messages-intake-btn--secondary"
            disabled={sending}
            onClick={() => setShowTypeOwn(true)}
          >
            Type my own answer...
          </button>
          <button
            type="button"
            className="messages-intake-btn messages-intake-btn--skip"
            disabled={sending}
            onClick={handleSkip}
          >
            Skip this question
          </button>
        </fieldset>
      )}

      {/* Type my own — visible during intake after user taps that option */}
      {phase === 'intake' && showTypeOwn && (
        <div className="messages-input-bar">
          <input
            className="messages-input"
            type="text"
            placeholder="Type your answer…"
            aria-label="Custom intake answer"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleIntakeKeyDown}
            disabled={sending}
            // biome-ignore lint/a11y/noAutofocus: intentional — user just tapped "Type my own"
            autoFocus
          />
          <button
            type="button"
            className="messages-send-btn"
            onClick={handleTypeOwnSend}
            disabled={sending || !inputText.trim()}
            aria-label={sending ? 'Sending…' : 'Send answer'}
          >
            <Send size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="messages-intake-cancel"
            onClick={() => {
              setShowTypeOwn(false)
              setInputText('')
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Phase 2 — open chat input bar */}
      {phase === 'chat' && (
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
      )}
    </div>
  )
}
