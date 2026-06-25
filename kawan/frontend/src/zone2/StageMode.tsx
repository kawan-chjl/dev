// StageMode — VN/RPG dialogue box (bottom-center) + action surface (middle-center).
// Driven by mock conversation turns. Tap-to-advance through dialogue.

import { ChevronRight, Mic, Play, Square } from 'lucide-react'
import { useRef } from 'react'
import { useAuth } from '../auth/AuthProvider'
import type { ConversationTurn } from '../mock/fixtures'
import type { Emotion } from '../types/api'
import type { Live2DStageHandle } from './live2d/Live2DStageView'
import { Live2DStageView } from './live2d/Live2DStageView'

interface StageModeProps {
  turns: ConversationTurn[]
  currentIndex: number
  onAdvance: () => void
}

// TR-34 emotion enum — matches the expressionMap keys in modelRegistry.
const EMOTIONS: Emotion[] = ['neutral', 'curious', 'pleased', 'skeptical', 'concerned', 'proud']

export function StageMode({ turns, currentIndex, onAdvance }: StageModeProps) {
  const current = turns[currentIndex]
  const isKawan = current?.speaker === 'kawan'
  const hasAction = current?.action != null
  const { me } = useAuth()
  const persona = me?.persona ?? 'kawan'

  const stageRef = useRef<Live2DStageHandle>(null)

  // DEV affordance (import.meta.env.DEV): demonstrates lip-sync + expression hooks.
  // Removed in prod builds — a demonstration harness, not product UI (Task 4 / Q10).
  async function handleSpeak() {
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

      {/* DEV-only: lip-sync demo + emotion buttons (Task 4 / Q10). Not shown in prod. */}
      {import.meta.env.DEV && (
        <div className="stage-dev-controls" role="toolbar" aria-label="Dev controls, lip-sync and expression demo">
          <button type="button" className="stage-dev-btn" onClick={handleSpeak} aria-label="Play sample audio">
            <Play size={12} aria-hidden="true" /> Speak
          </button>
          <button
            type="button"
            className="stage-dev-btn"
            onClick={() => stageRef.current?.stopSpeaking()}
            aria-label="Stop speaking"
          >
            <Square size={12} aria-hidden="true" /> Stop
          </button>
          <button type="button" className="stage-dev-btn" aria-label="Microphone (placeholder)">
            <Mic size={12} aria-hidden="true" /> Mic
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
            <button key={i} type="button" className="stage-option-card" onClick={onAdvance}>
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
          />
        </div>
      )}

      {/* VN dialogue box — bottom-center */}
      <section className="stage-dialogue-box" aria-label="Dialogue" aria-live="polite">
        <div className="stage-dialogue-inner">
          <p className="stage-speaker-name">{current?.speaker === 'kawan' ? 'Kawan' : 'You'}</p>
          <p className="stage-dialogue-line">{current?.text ?? ''}</p>
        </div>
        <button
          type="button"
          className="stage-advance-btn"
          aria-label={currentIndex < turns.length - 1 ? 'Next line' : 'End of conversation'}
          onClick={onAdvance}
          disabled={currentIndex >= turns.length - 1 && !hasAction}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </section>
    </div>
  )
}
