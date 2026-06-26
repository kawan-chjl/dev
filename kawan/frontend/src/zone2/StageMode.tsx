// StageMode — VN/RPG dialogue box + input bar + Live2D face reactive to real Kawan turns.
// A3: accepts WorkspaceMessage[] from WorkspaceLayout instead of mock ConversationTurn[].
// T4: phase-aware — intake phase shows VN action menu; chat phase shows input bar + starters.
// Emotion effect keys on the latest Kawan message id (not currentIndex).
// Do NOT remount the stage — Live2DStageView mounts once here (see a3-workspace-chat-design.md §4).

import { Mic, MicOff, Play, ShieldX, Square, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import type { Commitment, Emotion, Persona } from '../types/api'
import type { WorkspaceMessage } from '../workspace/api'
import type { Live2DStageHandle } from './live2d/Live2DStageView'
import { Live2DStageView } from './live2d/Live2DStageView'
import { renderMarkdown } from './markdown'
import { ProposalCard } from './ProposalCard'
import { starterChipsForState } from './starterChips'
import { useSpeechInput } from './voice/useSpeechInput'
import { speakLine } from './voice/useVoice'
import type { SlotProgress, WorkspacePhase } from './WorkspaceLayout'

interface StageModeProps {
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

// TR-34 emotion enum — matches the expressionMap keys in modelRegistry.
const EMOTIONS: Emotion[] = ['neutral', 'curious', 'pleased', 'skeptical', 'concerned', 'proud']

const MUTE_KEY = 'kawan_voice_muted'

function readMuted(): boolean {
  try {
    const stored = localStorage.getItem(MUTE_KEY)
    return stored === null ? true : stored === 'true'
  } catch {
    return true
  }
}

function writeMuted(v: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, String(v))
  } catch {
    // ignore
  }
}

// Canned intake action options shown to the user in the VN action menu.
// Always includes Type my own + Skip (per OQ-INTAKE-MENU hybrid design).
const INTAKE_CANNED: string[] = [
  "That's a great question — let me think...",
  'I already know the answer',
  "I'm not sure yet"
]

export function StageMode({
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
}: StageModeProps) {
  const { me } = useAuth()
  const persona: Persona = me?.persona ?? 'kawan'

  const stageRef = useRef<Live2DStageHandle>(null)
  const [muted, setMuted] = useState(readMuted)
  const [gestureUnlocked, setGestureUnlocked] = useState(false)
  const lastSpokenId = useRef<string | null>(null)

  // DEV harness state
  const [devText, setDevText] = useState('Hello, I am your accountability companion.')
  const [devPersona, setDevPersona] = useState<Persona>(persona)
  const [devEmotion, setDevEmotion] = useState<Emotion>('neutral')

  // Controlled input for the dialogue bar (chat phase) and custom intake answer
  const [inputText, setInputText] = useState('')
  const [showTypeOwn, setShowTypeOwn] = useState(false)

  const mic = useSpeechInput()

  useEffect(() => {
    if (!mic.listening && mic.transcript) {
      setInputText(mic.transcript)
      mic.clearTranscript()
    }
  }, [mic.listening, mic.transcript, mic.clearTranscript])

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

    if (!muted && gestureUnlocked) {
      void speakLine(stageRef.current, latestKawan.text, persona)
    }
  }, [latestKawan, muted, gestureUnlocked, persona])

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

  function handleIntakeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTypeOwnSend()
    }
  }

  function handleTypeOwnSend() {
    if (!gestureUnlocked) setGestureUnlocked(true)
    const text = inputText.trim()
    if (!text || sending) return
    setInputText('')
    setShowTypeOwn(false)
    void onIntakeAnswer(text)
  }

  function handleCannedSelect(text: string) {
    if (!gestureUnlocked) setGestureUnlocked(true)
    void onIntakeAnswer(text)
  }

  function handleSkip() {
    if (!gestureUnlocked) setGestureUnlocked(true)
    void onIntakeAnswer('(skip)')
  }

  function toggleMute() {
    const next = !muted
    setMuted(next)
    writeMuted(next)
    if (next) stageRef.current?.stopSpeaking()
  }

  function handleMicToggle() {
    if (mic.listening) {
      mic.stop()
    } else {
      mic.start()
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

  return (
    <div className="stage-mode">
      {/* Character stage area — single mount, never remounts (A3 design §4) */}
      <div className="stage-character-area">
        <Live2DStageView ref={stageRef} persona={persona} />
      </div>

      {/* Mute toggle + Stop — always visible in workspace */}
      <fieldset className="stage-voice-controls">
        <legend className="sr-only">Voice controls</legend>
        <button
          type="button"
          className="stage-voice-btn"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute voice' : 'Mute voice'}
          title={muted ? 'Unmute voice' : 'Mute voice'}
        >
          {muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="stage-voice-btn"
          onClick={() => stageRef.current?.stopSpeaking()}
          aria-label="Stop speaking"
          title="Stop speaking"
        >
          <Square size={14} aria-hidden="true" />
        </button>
      </fieldset>

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

      {/* Intake phase: slot progress indicator + skip-ahead escape hatch */}
      {phase === 'intake' && (
        <div className="stage-intake-progress" role="status" aria-live="polite" aria-atomic="true">
          <span className="stage-intake-progress-label">Context</span>
          {Array.from({ length: slotProgress.total }).map((_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: static fixed-length array
              key={i}
              className={`stage-intake-dot${i < slotProgress.filled ? ' stage-intake-dot--filled' : ''}`}
            />
          ))}
          <button type="button" className="stage-intake-skip-ahead" onClick={onSkipIntake}>
            Skip ahead — let's just talk
          </button>
        </div>
      )}

      {/* Starter chips — chat phase empty state */}
      {showStarterChips && (
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

      {/* Typing / thinking indicator */}
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

      {/* VN dialogue box — bottom-center; shows latest Kawan line */}
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

        {/* Mic button in the dialogue bar */}
        <button
          type="button"
          className="stage-voice-btn stage-mic-bar-btn"
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
          {mic.listening ? <MicOff size={14} aria-hidden="true" /> : <Mic size={14} aria-hidden="true" />}
        </button>
      </section>

      {/* Phase 1 — VN intake action menu (replaces free-text bar during intake) */}
      {phase === 'intake' && !showTypeOwn && (
        <fieldset className="stage-intake-menu">
          <legend className="sr-only">Intake response options</legend>
          {INTAKE_CANNED.map((option) => (
            <button
              key={option}
              type="button"
              className="stage-intake-btn"
              disabled={sending}
              onClick={() => handleCannedSelect(option)}
            >
              {option}
            </button>
          ))}
          <button
            type="button"
            className="stage-intake-btn stage-intake-btn--secondary"
            disabled={sending}
            onClick={() => setShowTypeOwn(true)}
          >
            Type my own answer...
          </button>
          <button
            type="button"
            className="stage-intake-btn stage-intake-btn--skip"
            disabled={sending}
            onClick={handleSkip}
          >
            Skip this question
          </button>
        </fieldset>
      )}

      {/* Type my own — inline input that appears in intake phase */}
      {phase === 'intake' && showTypeOwn && (
        <div className="stage-input-bar">
          <input
            className="stage-input"
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
            className="stage-send-btn"
            onClick={handleTypeOwnSend}
            disabled={sending || !inputText.trim()}
            aria-label={sending ? 'Sending…' : 'Send answer'}
          >
            {sending ? '…' : '›'}
          </button>
          <button
            type="button"
            className="stage-intake-cancel-btn"
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
        <div className="stage-input-bar">
          <input
            className="stage-input"
            type="text"
            placeholder={sending ? 'Kawan is thinking…' : 'Say something…'}
            aria-label="Message input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            readOnly={mic.listening}
          />
          <button
            type="button"
            className="stage-send-btn"
            onClick={handleSendClick}
            disabled={sending || !inputText.trim()}
            aria-label={sending ? 'Sending…' : 'Send message'}
          >
            {sending ? '…' : '›'}
          </button>
        </div>
      )}

      {/* Mic transcript display (shown while listening) */}
      {mic.listening && (
        <div className="stage-mic-transcript" role="status" aria-live="polite">
          <span className="stage-mic-label">Listening…</span>
          <span className="stage-mic-text">{mic.transcript}</span>
        </div>
      )}
    </div>
  )
}
