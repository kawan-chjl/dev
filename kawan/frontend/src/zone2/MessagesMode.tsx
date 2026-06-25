// MessagesMode — iMessage/Messenger-style thread over the same conversation state.
// Kawan = serif on terracotta-tinted bubble. User = sans on --surface-sunk.
// Proposal cards have inert [Apply]/[Dismiss] buttons (non-functional per Q7).

import { MessageCircle, Send } from 'lucide-react'
import type { ConversationTurn } from '../mock/fixtures'

interface MessagesModeProps {
  turns: ConversationTurn[]
  currentIndex: number
}

export function MessagesMode({ turns, currentIndex }: MessagesModeProps) {
  // Show turns up to and including currentIndex (same state as stage)
  const visibleTurns = turns.slice(0, currentIndex + 1)

  return (
    <div className="messages-mode">
      <div className="messages-thread" role="log" aria-label="Conversation thread" aria-live="polite">
        {visibleTurns.map((turn, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: conversation turns have no stable id
          <div key={i} className={`message-row ${turn.speaker === 'kawan' ? 'message-row-kawan' : 'message-row-user'}`}>
            {turn.speaker === 'kawan' && (
              <div className="message-avatar" aria-hidden="true">
                <MessageCircle size={18} />
              </div>
            )}
            <div className={`message-bubble ${turn.speaker === 'kawan' ? 'bubble-kawan' : 'bubble-user'}`}>
              <p className="message-text">{turn.text}</p>

              {/* Options surface rendered inline in messages mode */}
              {turn.action === 'options' && turn.options != null && (
                <div className="message-options">
                  {turn.options.map((opt, j) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: option list has no stable id
                    <button key={j} type="button" className="message-option-btn" disabled>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Text input (inert per Q7) */}
      <div className="messages-input-bar">
        <input
          className="messages-input"
          type="text"
          placeholder="Message Kawan..."
          aria-label="Message input"
          disabled
        />
        <button type="button" className="messages-send-btn" disabled aria-label="Send message">
          <Send size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
