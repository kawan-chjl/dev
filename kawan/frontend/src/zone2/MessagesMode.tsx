// MessagesMode — iMessage/Messenger-style thread over real WorkspaceMessage state.
// A3: input bar enabled; refusal styling; proposal card inline.
// T4: phase-aware — intake shows VN glassmorphism options; chat shows input bar + starters.
// 2.2: mic/mute/stop/Skip removed. 2.3: intake input hidden; glassmorphism options rendered.
// 2.5: persona portrait replaces lucide MessageCircle avatar.
// Layout fix: centered ~720px max-width column, thread anchored near the input.
// Kawan = serif on terracotta-tinted bubble. User = sans on --surface-sunk.

import { Send, ShieldX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import type { Commitment, Persona } from '../types/api'
import type { WorkspaceMessage } from '../workspace/api'
import { type IntakeSlot, optionsForStep } from './intakeOptions'
import { renderMarkdown } from './markdown'
import { ProposalCard } from './ProposalCard'
import { PERSONA_PORTRAITS } from './personaPortraits'
import { starterChipsForState } from './starterChips'
import type { IntakeSlotName, SlotProgress, WorkspacePhase } from './WorkspaceLayout'

const INTAKE_SLOTS: IntakeSlotName[] = ['why', 'obstacles', 'time_constraints', 'skill']

interface MessagesModeProps {
  messages: WorkspaceMessage[]
  sending: boolean
  error: string | null
  commitmentId: string
  phase: WorkspacePhase
  slotProgress: SlotProgress
  commitment: Commitment | null
  intakeStep: number
  openerLoading: boolean
  // Phase 3: passed from WorkspaceLayout for key-event routing (islands handle the UI, not Messages)
  keyEvent?: string | null
  checkinStatus?: unknown
  onSend: (text: string) => Promise<void>
  onIntakeAnswer: (text: string) => Promise<void>
  onRetry: () => void
  onProposalApplied: (messageId: string) => void
  onProposalDismissed: (messageId: string) => void
}

// 2.5: Persona avatar with initial-letter fallback on image error
function KawanAvatar({ persona }: { persona: Persona }) {
  const [failed, setFailed] = useState(false)
  const src = PERSONA_PORTRAITS[persona]
  const initial = persona.charAt(0).toUpperCase()

  if (failed) {
    return (
      <div className="message-avatar message-avatar-fallback" aria-hidden="true">
        {initial}
      </div>
    )
  }
  return (
    <div className="message-avatar message-avatar-portrait" aria-hidden="true">
      <img src={src} alt={persona} className="message-avatar-img" onError={() => setFailed(true)} />
    </div>
  )
}

export function MessagesMode({
  messages,
  sending,
  error,
  commitmentId,
  phase,
  slotProgress,
  commitment,
  intakeStep,
  openerLoading,
  onSend,
  onIntakeAnswer,
  onRetry,
  onProposalApplied,
  onProposalDismissed
}: MessagesModeProps) {
  const { me } = useAuth()
  const persona: Persona = me?.persona ?? 'kawan'

  const [inputText, setInputText] = useState('')
  // Inline input for "type own words" during intake
  const [showTypeOwn, setShowTypeOwn] = useState(false)
  const [typeOwnText, setTypeOwnText] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)

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

  // Intake option tap — submits text or reveals the type-own inline input
  function handleOptionTap(text: string, isOpenEnded?: boolean) {
    if (isOpenEnded) {
      setShowTypeOwn(true)
      return
    }
    void onIntakeAnswer(text)
  }

  function handleTypeOwnSend() {
    const text = typeOwnText.trim()
    if (!text || sending) return
    setTypeOwnText('')
    setShowTypeOwn(false)
    void onIntakeAnswer(text)
  }

  function handleTypeOwnKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTypeOwnSend()
    }
    if (e.key === 'Escape') {
      setShowTypeOwn(false)
      setTypeOwnText('')
    }
  }

  // Starter chips — chat phase, no user messages yet
  const showStarterChips = phase === 'chat' && messages.filter((m) => m.from === 'user').length === 0
  const starterChips = starterChipsForState(commitment)

  // Intake VN options — current slot derived from intakeStep
  const currentSlot: IntakeSlotName | null =
    phase === 'intake' && intakeStep < INTAKE_SLOTS.length ? INTAKE_SLOTS[intakeStep] : null
  const intakeOptions =
    currentSlot && commitment
      ? optionsForStep(currentSlot as IntakeSlot, {
          action: commitment.action,
          deliverable: commitment.deliverable,
          deadline: commitment.deadline
        })
      : null

  return (
    <div className="messages-mode">
      {/* Slot progress bar — intake phase only, not while opener loads */}
      {phase === 'intake' && !openerLoading && (
        <div className="messages-intake-progress" role="status" aria-live="polite" aria-atomic="true">
          <span className="messages-intake-label">Context</span>
          {Array.from({ length: slotProgress.total }).map((_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: static fixed-length array
              key={i}
              className={`messages-intake-dot${i < slotProgress.filled ? ' messages-intake-dot--filled' : ''}`}
            />
          ))}
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
                {/* 2.5: persona portrait avatar */}
                {isKawan && <KawanAvatar persona={persona} />}
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

          {/* Typing indicator bubble — 2.5: persona portrait avatar */}
          {sending && (
            <div className="message-row message-row-kawan">
              <KawanAvatar persona={persona} />
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

      {/* 2.3: Intake VN glassmorphism options — rendered below thread during intake */}
      {phase === 'intake' && !openerLoading && !sending && intakeOptions && !showTypeOwn && (
        <fieldset className="messages-intake-menu" aria-label={`Question ${intakeStep + 1} of 4`}>
          <legend className="sr-only">Intake options</legend>
          {intakeOptions.map((opt) => (
            <button
              key={opt.text}
              type="button"
              className={`messages-intake-btn${opt.isOpenEnded ? ' messages-intake-btn--secondary' : ''}`}
              onClick={() => handleOptionTap(opt.text, opt.isOpenEnded)}
              disabled={sending}
            >
              {opt.text}
            </button>
          ))}
        </fieldset>
      )}

      {/* Fix A: INTAKE DEAD-END FIX — when commitment/options are unavailable, show the
          open-ended input directly so intake can never dead-end. Always available during intake. */}
      {phase === 'intake' && !openerLoading && !sending && !intakeOptions && !showTypeOwn && (
        <div className="messages-input-bar">
          <input
            className="messages-input"
            type="text"
            placeholder="Type your answer..."
            aria-label="Your answer"
            value={typeOwnText}
            onChange={(e) => setTypeOwnText(e.target.value)}
            onKeyDown={handleTypeOwnKeyDown}
            disabled={sending}
          />
          <button
            type="button"
            className="messages-send-btn"
            onClick={handleTypeOwnSend}
            disabled={sending || !typeOwnText.trim()}
            aria-label={sending ? 'Sending...' : 'Send answer'}
          >
            <Send size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Inline type-own input — shown when "Answer in my own words" is tapped */}
      {phase === 'intake' && showTypeOwn && (
        <div className="messages-input-bar">
          <input
            className="messages-input"
            type="text"
            placeholder="Type your answer..."
            aria-label="Your answer"
            value={typeOwnText}
            onChange={(e) => setTypeOwnText(e.target.value)}
            onKeyDown={handleTypeOwnKeyDown}
            disabled={sending}
          />
          <button
            type="button"
            className="messages-send-btn"
            onClick={handleTypeOwnSend}
            disabled={sending || !typeOwnText.trim()}
            aria-label={sending ? 'Sending...' : 'Send answer'}
          >
            <Send size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="messages-intake-cancel"
            onClick={() => {
              setShowTypeOwn(false)
              setTypeOwnText('')
            }}
            aria-label="Cancel"
          >
            x
          </button>
        </div>
      )}

      {/* Chat input bar — only shown in chat phase (hidden during intake per 2.3) */}
      {phase === 'chat' && (
        <div className="messages-input-bar">
          <input
            className="messages-input"
            type="text"
            placeholder={sending ? 'Kawan is thinking...' : 'Message Kawan...'}
            aria-label="Message input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <button
            type="button"
            className="messages-send-btn"
            onClick={handleSend}
            disabled={sending || !inputText.trim()}
            aria-label={sending ? 'Sending...' : 'Send message'}
          >
            <Send size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
