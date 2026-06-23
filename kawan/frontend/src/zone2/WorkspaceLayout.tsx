// WorkspaceLayout — Zone 2 full-screen workspace for /workspace/:id
// No shell chrome. Local viewMode: 'stage' | 'messages'. Shared conversation state.
// design.md §6 Zone 2.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMockConversation } from '../mock/provider'
import { MessagesMode } from './MessagesMode'
import { StageMode } from './StageMode'

type ViewMode = 'stage' | 'messages'

export function WorkspaceLayout() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<ViewMode>('stage')
  const [turnIndex, setTurnIndex] = useState(0)

  const turns = getMockConversation()

  function handleAdvance() {
    setTurnIndex((i) => Math.min(i + 1, turns.length - 1))
  }

  return (
    <div className="workspace-root">
      {/* Header bar */}
      <div className="workspace-topbar">
        <button
          type="button"
          className="workspace-back-btn"
          aria-label="Back to home"
          onClick={() => navigate('/home')}
        >
          ← Back
        </button>
        <div className="workspace-mode-toggle" aria-label="View mode" role="toolbar">
          <button
            type="button"
            className={`workspace-mode-btn ${viewMode === 'stage' ? 'workspace-mode-btn-active' : ''}`}
            aria-pressed={viewMode === 'stage'}
            onClick={() => setViewMode('stage')}
          >
            Stage
          </button>
          <button
            type="button"
            className={`workspace-mode-btn ${viewMode === 'messages' ? 'workspace-mode-btn-active' : ''}`}
            aria-pressed={viewMode === 'messages'}
            onClick={() => setViewMode('messages')}
          >
            Messages
          </button>
        </div>
        <div className="workspace-spacer" aria-hidden="true" />
      </div>

      {/* Main stage area */}
      <div className="workspace-stage">
        {viewMode === 'stage' ? (
          <StageMode turns={turns} currentIndex={turnIndex} onAdvance={handleAdvance} />
        ) : (
          <MessagesMode turns={turns} currentIndex={turnIndex} />
        )}
      </div>
    </div>
  )
}
