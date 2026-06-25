// WorkspacePickerModal — centered floating modal over a blurred backdrop.
// Lists commitments from useCommitments(); selecting one navigates to /workspace/:id.
// Accessible: focus-trapped, role="dialog", aria-modal, Escape closes.

import { Plus, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Commitment } from '../types/api'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'

interface WorkspacePickerModalProps {
  commitments: Commitment[]
  onClose: () => void
}

export function WorkspacePickerModal({ commitments, onClose }: WorkspacePickerModalProps) {
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)

  // Escape closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Focus the panel on open so keyboard users are inside the dialog
  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  function openWorkspace(id: string) {
    onClose()
    navigate(`/workspace/${id}`)
  }

  function formatStatus(status: string): 'sage' | 'accent' | 'default' {
    if (status === 'active') return 'sage'
    if (status === 'verifying') return 'accent'
    return 'default'
  }

  return (
    <div
      className="ws-modal-backdrop"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      aria-hidden="true"
    >
      <div
        className="ws-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Choose a workspace to open"
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="ws-modal-header">
          <p className="ws-modal-title">Open workspace</p>
          <button type="button" className="ws-modal-close" aria-label="Close" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {commitments.length === 0 ? (
          <div className="ws-modal-empty">
            <p className="ws-modal-empty-text">You have no commitments to open yet.</p>
            <Button
              variant="accent"
              onClick={() => {
                onClose()
                navigate('/commitments/new')
              }}
            >
              <Plus size={16} aria-hidden="true" />
              Make a commitment
            </Button>
          </div>
        ) : (
          <ul className="ws-modal-list">
            {commitments.map((c) => (
              <li key={c.id}>
                <button type="button" className="ws-modal-item" onClick={() => openWorkspace(c.id)}>
                  <div className="ws-modal-item-text">
                    <span className="ws-modal-item-action">{c.action}</span>
                    <span className="ws-modal-item-deliverable">{c.deliverable}</span>
                  </div>
                  <Chip variant={formatStatus(c.status)}>{c.status}</Chip>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
