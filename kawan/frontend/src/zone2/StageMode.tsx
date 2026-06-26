// StageMode — VN/RPG dialogue box + input bar + Live2D face reactive to real Kawan turns.
// A3: accepts WorkspaceMessage[] from WorkspaceLayout instead of mock ConversationTurn[].
// Emotion effect keys on the latest Kawan message id (not currentIndex).
// Do NOT remount the stage — Live2DStageView mounts once here (see a3-workspace-chat-design.md §4).

import { Mic, MicOff, Play, ShieldX, Square, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import type { Emotion, Persona } from '../types/api'
import type { WorkspaceMessage } from '../workspace/api'
import type { Live2DStageHandle } from './live2d/Live2DStageView'
import { Live2DStageView } from './live2d/Live2DStageView'
import { ProposalCard } from './ProposalCard'
import { useSpeechInput } from './voice/useSpeechInput'
import { speakLine } from './voice/useVoice'

interface StageModeProps {
  messages: WorkspaceMessage[]
  sending: boolean
  error: string | null
  commitmentId: string
  onSend: (text: string) => Promise<void>
  onProposalApplied: (messageId: string) => void
  onProposalDismissed: (messageId: string) => void
}

// TR-34 emotion enum — matches the expressionMap keys in modelRegistry.
const EMOTIONS: Emotion[] = ['neutral', 'curious', 'pleased', 'skeptical', 'concerned', 'proud']

const MUTE_KEY = 'kawan_voice_muted'

function readMuted(): boolean {
  try {
    const stored = localStorage.getItem(MUTE_KEY)
    // Default to muted when no stored preference exists
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

export function StageMode({
  messages,
  sending,
  error,
  commitmentId,
  onSend,
  onProposalApplied,
  onProposalDismissed
}: StageModeProps) {
  const { me } = useAuth()
  const persona: Persona = me?.persona ?? 'kawan'

  const stageRef = useRef<Live2DStageHandle>(null)
  const [muted, setMuted] = useState(readMuted)
  // gestureUnlocked: audio is blocked until the user has made a gesture (browser autoplay policy).
  const [gestureUnlocked, setGestureUnlocked] = useState(false)
  // Track the last Kawan message id we reacted to — avoids re-firing on re-render.
  const lastSpokenId = useRef<string | null>(null)

  // DEV harness state
  const [devText, setDevText] = useState('Hello, I am your accountability companion.')
  const [devPersona, setDevPersona] = useState<Persona>(persona)
  const [devEmotion, setDevEmotion] = useState<Emotion>('neutral')

  // Controlled input for the dialogue bar
  const [inputText, setInputText] = useState('')

  const mic = useSpeechInput()

  // When mic delivers a final transcript, copy it into the input (user reviews, then sends).
  useEffect(() => {
    if (!mic.listening && mic.transcript) {
      setInputText(mic.transcript)
      mic.clearTranscript()
    }
  }, [mic.listening, mic.transcript, mic.clearTranscript])

  // Latest Kawan message — drives VN box and emotion/voice effect.
  const latestKawan = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].from === 'kawan') return messages[i]
    }
    return null
  }, [messages])

  // React to each new Kawan turn: expression fires always; speech is gated on unmuted + gesture unlock.
  useEffect(() => {
    if (!latestKawan) return
    if (latestKawan.id === lastSpokenId.current) return
    if (!latestKawan.text) return

    lastSpokenId.current = latestKawan.id

    // Expression fires regardless of mute state (audio-only mute, face always reacts)
    if (latestKawan.emotion) {
      stageRef.current?.setExpression(latestKawan.emotion)
    }

    // Speak — gated on unmuted + gesture unlock; text is always readable even if voice fails
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

  // DEV affordance: speak a line per persona + emotion
  async function handleDevSpeak() {
    if (!gestureUnlocked) setGestureUnlocked(true)
    stageRef.current?.setExpression(devEmotion)
    await speakLine(stageRef.current, devText, devPersona)
  }

  // DEV affordance: original spike path (test.wav → TR-08 analyser)
  async function handleDevSpikeWav() {
    const res = await fetch('/spike/test.wav')
    const arrayBuffer = await res.arrayBuffer()
    stageRef.current?.speak(arrayBuffer)
  }

  // Determine the displayed VN box content.
  const latestMsg = messages.length > 0 ? messages[messages.length - 1] : null
  const displayedKawan = latestKawan

  const isRefusal = displayedKawan?.responseType === 'refusal'
  const hasProposal =
    displayedKawan?.responseType === 'proposal' &&
    displayedKawan.proposal &&
    displayedKawan.proposalId &&
    displayedKawan.proposalState !== 'dismissed'

  // Empty-state starter chips — shown only when the only message is the static greeting.
  const showStarterChips = messages.length === 1 && messages[0].from === 'kawan'
  const starterChips = [
    "I shipped something yesterday — here's what I did.",
    "I'm stuck and not sure what to do next.",
    'I want to re-scope this commitment.'
  ]

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

      {/* Empty-state starter chips — shown only on the static greeting, pre-fill input only */}
      {showStarterChips && (
        <ul className="stage-starter-chips" aria-label="Suggested starters">
          {starterChips.map((chip) => (
            <li key={chip}>
              <button type="button" className="stage-starter-chip" onClick={() => setInputText(chip)}>
                {chip}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Inline proposal card — shown below VN box when latest Kawan turn is a proposal */}
      {hasProposal && displayedKawan?.proposal && displayedKawan.proposalId && (
        <div className="stage-proposal-area">
          <ProposalCard
            commitmentId={commitmentId}
            proposalId={displayedKawan.proposalId}
            proposal={displayedKawan.proposal}
            state={displayedKawan.proposalState ?? 'open'}
            onApplied={() => onProposalApplied(displayedKawan.id)}
            onDismissed={() => onProposalDismissed(displayedKawan.id)}
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

      {/* Network error — non-fatal, shown below VN box */}
      {error && !sending && (
        <div className="stage-error" role="alert">
          {error}
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
          <p className="stage-dialogue-line">{latestMsg?.text ?? ''}</p>
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

      {/* Input bar — always shown; send fires handleSend */}
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
