// StageMode — VN/RPG dialogue box + input bar + Live2D face reactive to real Kawan turns.
// A3: accepts WorkspaceMessage[] from WorkspaceLayout instead of mock ConversationTurn[].
// T4: phase-aware — intake phase shows VN glassmorphism options; chat phase shows input bar + starters.
// Emotion effect keys on the latest Kawan message id (not currentIndex).
// Do NOT remount the stage — Live2DStageView mounts once here (see a3-workspace-chat-design.md §4).

import { Play, ShieldX, Square } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import type { Commitment, Emotion, Persona } from '../types/api'
import type { WorkspaceMessage } from '../workspace/api'
import { type IntakeSlot, optionsForStep } from './intakeOptions'
import type { Live2DStageHandle } from './live2d/Live2DStageView'
import { Live2DStageView } from './live2d/Live2DStageView'
import { renderMarkdown } from './markdown'
import { ProposalCard } from './ProposalCard'
import { starterChipsForState } from './starterChips'
import { speakLine } from './voice/useVoice'
import type { IntakeSlotName, SlotProgress, WorkspacePhase } from './WorkspaceLayout'

const INTAKE_SLOTS: IntakeSlotName[] = ['why', 'obstacles', 'time_constraints', 'skill']

interface StageModeProps {
  messages: WorkspaceMessage[]
  sending: boolean
  error: string | null
  commitmentId: string
  phase: WorkspacePhase
  slotProgress: SlotProgress
  commitment: Commitment | null
  intakeStep: number
  openerLoading: boolean
  onSend: (text: string) => Promise<void>
  onIntakeAnswer: (text: string) => Promise<void>
  onRetry: () => void
  onProposalApplied: (messageId: string) => void
  onProposalDismissed: (messageId: string) => void
}

// TR-34 emotion enum — matches the expressionMap keys in modelRegistry.
const EMOTIONS: Emotion[] = ['neutral', 'curious', 'pleased', 'skeptical', 'concerned', 'proud']

export function StageMode({
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
}: StageModeProps) {
  const { me } = useAuth()
  const persona: Persona = me?.persona ?? 'kawan'

  const stageRef = useRef<Live2DStageHandle>(null)
  const [gestureUnlocked, setGestureUnlocked] = useState(false)
  const lastSpokenId = useRef<string | null>(null)

  // DEV harness state
  const [devText, setDevText] = useState('Hello, I am your accountability companion.')
  const [devPersona, setDevPersona] = useState<Persona>(persona)
  const [devEmotion, setDevEmotion] = useState<Emotion>('neutral')

  // Controlled input for open chat
  const [inputText, setInputText] = useState('')
  // Inline input for "type own words" during intake
  const [showTypeOwn, setShowTypeOwn] = useState(false)
  const [typeOwnText, setTypeOwnText] = useState('')

  const latestKawan = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].from === 'kawan') return messages[i]
    }
    return null
  }, [messages])

  useEffect(() => {
    if (!latestKawan) return
    if (latestKawan.id === lastSpokenId.current) return
    if (!latestKawan.text) return

    lastSpokenId.current = latestKawan.id

    if (latestKawan.emotion) {
      stageRef.current?.setExpression(latestKawan.emotion)
    }
  }, [latestKawan])

  function handleSendClick() {
    if (!gestureUnlocked) setGestureUnlocked(true)
    const text = inputText
    setInputText('')
    void onSend(text)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendClick()
    }
  }

  // Intake option tap — submits the option text as the answer
  function handleOptionTap(text: string, isOpenEnded?: boolean) {
    if (!gestureUnlocked) setGestureUnlocked(true)
    if (isOpenEnded) {
      setShowTypeOwn(true)
      return
    }
    void onIntakeAnswer(text)
  }

  function handleTypeOwnSend() {
    const text = typeOwnText.trim()
    if (!text || sending) return
    if (!gestureUnlocked) setGestureUnlocked(true)
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

  async function handleDevSpeak() {
    if (!gestureUnlocked) setGestureUnlocked(true)
    stageRef.current?.setExpression(devEmotion)
    await speakLine(stageRef.current, devText, devPersona)
  }

  async function handleDevSpikeWav() {
    const res = await fetch('/spike/test.wav')
    const arrayBuffer = await res.arrayBuffer()
    stageRef.current?.speak(arrayBuffer)
  }

  const latestMsg = messages.length > 0 ? messages[messages.length - 1] : null
  const isRefusal = latestKawan?.responseType === 'refusal'
  const hasProposal =
    latestKawan?.responseType === 'proposal' &&
    latestKawan.proposal &&
    latestKawan.proposalId &&
    latestKawan.proposalState !== 'dismissed'

  // Starter chips — chat phase empty state only
  const showStarterChips = phase === 'chat' && messages.filter((m) => m.from === 'user').length === 0
  const starterChips = starterChipsForState(commitment)

  // Intake VN options — derive from current slot and commitment
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
    <div className="stage-mode">
      {/* Character stage area — single mount, never remounts (A3 design §4) */}
      <div className="stage-character-area">
        <Live2DStageView ref={stageRef} persona={persona} />
      </div>

      {/* DEV-only: extended harness with persona, emotion, text, and original spike */}
      {import.meta.env.DEV && (
        <div className="stage-dev-controls" role="toolbar" aria-label="Dev controls">
          <select
            className="stage-dev-btn"
            value={devPersona}
            onChange={(e) => setDevPersona(e.target.value as Persona)}
            aria-label="Dev persona"
          >
            <option value="kawan">kawan</option>
            <option value="adik">adik</option>
            <option value="cik_maid">cik_maid</option>
          </select>
          <select
            className="stage-dev-btn"
            value={devEmotion}
            onChange={(e) => setDevEmotion(e.target.value as Emotion)}
            aria-label="Dev emotion"
          >
            {EMOTIONS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <input
            className="stage-dev-text"
            value={devText}
            onChange={(e) => setDevText(e.target.value)}
            aria-label="Dev speak text"
          />
          <button
            type="button"
            className="stage-dev-btn"
            onClick={handleDevSpeak}
            aria-label="Speak via Piper/WebSpeech"
          >
            <Play size={12} aria-hidden="true" /> Speak
          </button>
          <button type="button" className="stage-dev-btn" onClick={handleDevSpikeWav} aria-label="Play spike WAV">
            <Play size={12} aria-hidden="true" /> WAV
          </button>
          <button
            type="button"
            className="stage-dev-btn"
            onClick={() => stageRef.current?.stopSpeaking()}
            aria-label="Stop speaking"
          >
            <Square size={12} aria-hidden="true" /> Stop
          </button>
          {EMOTIONS.map((emotion) => (
            <button
              key={emotion}
              type="button"
              className="stage-dev-btn"
              onClick={() => stageRef.current?.setExpression(emotion)}
            >
              {emotion}
            </button>
          ))}
        </div>
      )}

      {/* Intake phase: slot progress indicator (no skip-ahead button — task 2.2/2.3) */}
      {phase === 'intake' && !openerLoading && (
        <div className="stage-intake-progress" role="status" aria-live="polite" aria-atomic="true">
          <span className="stage-intake-progress-label">Context</span>
          {Array.from({ length: slotProgress.total }).map((_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: static fixed-length array
              key={i}
              className={`stage-intake-dot${i < slotProgress.filled ? ' stage-intake-dot--filled' : ''}`}
            />
          ))}
        </div>
      )}

      {/* Starter chips — chat phase empty state */}
      {showStarterChips && !openerLoading && (
        <div className="stage-starter-chips">
          {starterChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              className="stage-starter-chip"
              onClick={() => setInputText(chip.action.text)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* 2.3: Intake VN glassmorphism options — rendered OVER the L2D stage during intake */}
      {phase === 'intake' && !openerLoading && !sending && intakeOptions && !showTypeOwn && (
        <fieldset className="stage-intake-menu" aria-label={`Question ${intakeStep + 1} of 4`}>
          <legend className="sr-only">Intake options</legend>
          {intakeOptions.map((opt) => (
            <button
              key={opt.text}
              type="button"
              className={`stage-intake-btn${opt.isOpenEnded ? ' stage-intake-btn--secondary' : ''}`}
              onClick={() => handleOptionTap(opt.text, opt.isOpenEnded)}
              disabled={sending}
            >
              {opt.text}
            </button>
          ))}
        </fieldset>
      )}

      {/* Inline type-own input — shown when "Answer in my own words" is tapped */}
      {phase === 'intake' && showTypeOwn && (
        <div className="stage-input-bar" style={{ zIndex: 20 }}>
          <input
            className="stage-input"
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
            className="stage-send-btn"
            onClick={handleTypeOwnSend}
            disabled={sending || !typeOwnText.trim()}
            aria-label={sending ? 'Sending...' : 'Send answer'}
          >
            {sending ? '...' : '>'}
          </button>
          <button
            type="button"
            className="stage-intake-cancel-btn"
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

      {/* Inline proposal card — shown below VN box when latest Kawan turn is a proposal */}
      {hasProposal && latestKawan?.proposal && latestKawan.proposalId && (
        <div className="stage-proposal-area">
          <ProposalCard
            commitmentId={commitmentId}
            proposalId={latestKawan.proposalId}
            proposal={latestKawan.proposal}
            state={latestKawan.proposalState ?? 'open'}
            onApplied={() => onProposalApplied(latestKawan.id)}
            onDismissed={() => onProposalDismissed(latestKawan.id)}
          />
        </div>
      )}

      {/* Typing / thinking indicator — suppressed while openerLoading (2.1) */}
      {sending && (
        <div className="stage-thinking" role="status" aria-live="polite" aria-label="Kawan is thinking">
          <span className="stage-thinking-dot" />
          <span className="stage-thinking-dot" />
          <span className="stage-thinking-dot" />
        </div>
      )}

      {/* Network error — friendly retry, never raw URL/status */}
      {error && !sending && (
        <div className="stage-error" role="alert">
          <span>{error}</span>
          <button type="button" className="stage-error-retry" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      {/* VN dialogue box — bottom-center; shows latest Kawan line; hidden while opener loads */}
      {!openerLoading && (
        <section
          className={`stage-dialogue-box${isRefusal ? ' stage-dialogue-box--refusal' : ''}`}
          aria-label="Dialogue"
          aria-live="polite"
        >
          <div className="stage-dialogue-inner">
            {isRefusal && (
              <div className="stage-refusal-chip">
                <ShieldX size={12} aria-hidden="true" />
                <span>won't do that</span>
              </div>
            )}
            <p className="stage-speaker-name">{latestMsg?.from === 'user' ? 'You' : 'Kawan'}</p>
            <div className="stage-dialogue-line">{renderMarkdown(latestMsg?.text ?? '')}</div>
          </div>
        </section>
      )}

      {/* Chat input bar — only shown in chat phase (input hidden during intake per 2.3) */}
      {phase === 'chat' && (
        <div className="stage-input-bar">
          <input
            className="stage-input"
            type="text"
            placeholder={sending ? 'Kawan is thinking...' : 'Say something...'}
            aria-label="Message input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <button
            type="button"
            className="stage-send-btn"
            onClick={handleSendClick}
            disabled={sending || !inputText.trim()}
            aria-label={sending ? 'Sending...' : 'Send message'}
          >
            {sending ? '...' : '>'}
          </button>
        </div>
      )}
    </div>
  )
}
