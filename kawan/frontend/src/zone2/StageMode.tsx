// StageMode — VN/RPG dialogue box (bottom-center) + action surface (middle-center).
// Driven by mock conversation turns. Tap-to-advance through dialogue.
// D2: voice output (Piper primary, WebSpeech fallback), mic input, mute toggle, emotion wiring.

import { ChevronRight, Mic, MicOff, Play, Square, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import type { ConversationTurn } from '../mock/fixtures'
import type { Emotion, Persona } from '../types/api'
import type { Live2DStageHandle } from './live2d/Live2DStageView'
import { Live2DStageView } from './live2d/Live2DStageView'
import { useSpeechInput } from './voice/useSpeechInput'
import { speakLine } from './voice/useVoice'

interface StageModeProps {
  turns: ConversationTurn[]
  currentIndex: number
  onAdvance: () => void
}

// TR-34 emotion enum — matches the expressionMap keys in modelRegistry.
const EMOTIONS: Emotion[] = ['neutral', 'curious', 'pleased', 'skeptical', 'concerned', 'proud']

const MUTE_KEY = 'kawan_voice_muted'

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === 'true'
  } catch {
    return false
  }
}

function writeMuted(v: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, String(v))
  } catch {
    // ignore
  }
}

export function StageMode({ turns, currentIndex, onAdvance }: StageModeProps) {
  const current = turns[currentIndex]
  const isKawan = current?.speaker === 'kawan'
  const hasAction = current?.action != null
  const { me } = useAuth()
  const persona: Persona = me?.persona ?? 'kawan'

  const stageRef = useRef<Live2DStageHandle>(null)
  const [muted, setMuted] = useState(readMuted)
  // gestureUnlocked: audio is blocked until the user has made a gesture (browser autoplay policy).
  const [gestureUnlocked, setGestureUnlocked] = useState(false)
  // Track which turn index we last spoke so we don't re-speak on re-render.
  const lastSpokenIndex = useRef<number>(-1)

  // DEV harness state
  const [devText, setDevText] = useState('Hello, I am your accountability companion.')
  const [devPersona, setDevPersona] = useState<Persona>(persona)
  const [devEmotion, setDevEmotion] = useState<Emotion>('neutral')

  const mic = useSpeechInput()

  // Speak each new Kawan turn automatically (gated on gesture unlock + unmuted).
  useEffect(() => {
    if (muted) return
    if (!gestureUnlocked) return
    if (!isKawan) return
    if (currentIndex === lastSpokenIndex.current) return
    if (!current?.text) return

    lastSpokenIndex.current = currentIndex

    // Set expression if the turn carries an emotion
    if (current.emotion) {
      stageRef.current?.setExpression(current.emotion)
    }

    // Speak — fire and forget; text is always readable even if voice fails
    void speakLine(stageRef.current, current.text, persona)
  }, [currentIndex, isKawan, muted, gestureUnlocked, current, persona])

  function handleAdvance() {
    // First tap unlocks audio (browser autoplay policy)
    if (!gestureUnlocked) setGestureUnlocked(true)
    onAdvance()
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

  return (
    <div className="stage-mode">
      {/* Character stage area */}
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

      {/* Action surface — middle-center, shown when Kawan asks */}
      {isKawan && hasAction && current.action === 'options' && (
        <div className="stage-action-surface">
          {(current.options ?? []).map((opt, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: option list has no stable id
            <button key={i} type="button" className="stage-option-card" onClick={handleAdvance}>
              {opt}
            </button>
          ))}
        </div>
      )}
      {isKawan && hasAction && current.action === 'input' && (
        <div className="stage-action-surface">
          <input
            className="stage-text-input"
            type="text"
            placeholder="Type your response..."
            aria-label="Open text response"
            value={mic.transcript}
            onChange={(e) => {
              // Allow manual editing of mic transcript
              void e
            }}
            readOnly={mic.listening}
          />
          <button
            type="button"
            className="stage-dev-btn stage-mic-btn"
            onClick={handleMicToggle}
            aria-label={
              mic.supported
                ? mic.listening
                  ? 'Stop listening'
                  : 'Start voice input'
                : 'Voice input not supported in this browser'
            }
            aria-pressed={mic.listening}
            disabled={!mic.supported}
            title={!mic.supported ? 'Voice input needs Chrome or a supported browser' : undefined}
          >
            {mic.listening ? <MicOff size={14} aria-hidden="true" /> : <Mic size={14} aria-hidden="true" />}
          </button>
          {/* LANE C: send transcript to workspace-turn endpoint
              When Lane C is wired, add a submit handler here that POSTs mic.transcript
              to POST /api/commitments/{id}/context/turn and clears the transcript.
              Do NOT fake an AI reply. */}
        </div>
      )}

      {/* VN dialogue box — bottom-center */}
      <section className="stage-dialogue-box" aria-label="Dialogue" aria-live="polite">
        <div className="stage-dialogue-inner">
          <p className="stage-speaker-name">{current?.speaker === 'kawan' ? 'Kawan' : 'You'}</p>
          <p className="stage-dialogue-line">{current?.text ?? ''}</p>
        </div>
        {/* Mic button in the dialogue bar (always visible, not just when action=input) */}
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
          disabled={!mic.supported}
          title={!mic.supported ? 'Voice input needs Chrome or a supported browser' : undefined}
        >
          {mic.listening ? <MicOff size={14} aria-hidden="true" /> : <Mic size={14} aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="stage-advance-btn"
          aria-label={currentIndex < turns.length - 1 ? 'Next line' : 'End of conversation'}
          onClick={handleAdvance}
          disabled={currentIndex >= turns.length - 1 && !hasAction}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </section>

      {/* Mic transcript display (shown while listening or when transcript is non-empty) */}
      {(mic.listening || mic.transcript) && (
        <div className="stage-mic-transcript" role="status" aria-live="polite">
          <span className="stage-mic-label">{mic.listening ? 'Listening...' : 'Heard:'}</span>
          <span className="stage-mic-text">{mic.transcript}</span>
          {!mic.listening && mic.transcript && (
            <button type="button" className="stage-dev-btn" onClick={mic.clearTranscript} aria-label="Clear transcript">
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
