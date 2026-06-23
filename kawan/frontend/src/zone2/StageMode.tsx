// StageMode — VN/RPG dialogue box (bottom-center) + action surface (middle-center).
// Driven by mock conversation turns. Tap-to-advance through dialogue.

import type { ConversationTurn } from '../mock/fixtures'
import { CharacterStagePlaceholder } from './CharacterStagePlaceholder'

interface StageModeProps {
  turns: ConversationTurn[]
  currentIndex: number
  onAdvance: () => void
}

export function StageMode({ turns, currentIndex, onAdvance }: StageModeProps) {
  const current = turns[currentIndex]
  const isKawan = current?.speaker === 'kawan'
  const hasAction = current?.action != null

  return (
    <div className="stage-mode">
      {/* Character stage area */}
      <div className="stage-character-area">
        <CharacterStagePlaceholder />
      </div>

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
            placeholder="Type your response…"
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
          {currentIndex < turns.length - 1 ? '▶' : '◼'}
        </button>
      </section>
    </div>
  )
}
