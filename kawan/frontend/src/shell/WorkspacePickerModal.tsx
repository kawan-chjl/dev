// WorkspacePickerModal — lists in-flight commitments; selecting one navigates to /workspace/:id.
// Portaled to document.body via Modal so it stacks above sidebar and topbar.
// Filters to in-flight statuses (active / lapsed / verifying / grace) — up to 3 active at once.

import { Plus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { statusLabel } from '../commitments/statusLabel'
import type { Commitment, CommitmentStatus } from '../types/api'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Modal } from '../ui/Modal'

const IN_FLIGHT: CommitmentStatus[] = ['active', 'lapsed', 'verifying', 'grace']

interface WorkspacePickerModalProps {
  open: boolean
  commitments: Commitment[]
  onClose: () => void
}

export function WorkspacePickerModal({ open, commitments, onClose }: WorkspacePickerModalProps) {
  const navigate = useNavigate()

  // Only show in-flight commitments — completed/missed/draft are not workspaces.
  const inFlight = commitments.filter((c) => IN_FLIGHT.includes(c.status))

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
    <Modal open={open} onClose={onClose} label="Choose a workspace to open">
      <div className="ws-modal-header">
        <p className="ws-modal-title">Open workspace</p>
        <button type="button" className="ws-modal-close" aria-label="Close" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {inFlight.length === 0 ? (
        <div className="ws-modal-empty">
          <p className="ws-modal-empty-text">You have no active commitments to open yet.</p>
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
          {inFlight.map((c) => (
            <li key={c.id}>
              <button type="button" className="ws-modal-item" onClick={() => openWorkspace(c.id)}>
                <div className="ws-modal-item-text">
                  <span className="ws-modal-item-action">{c.action}</span>
                  <span className="ws-modal-item-deliverable">{c.deliverable}</span>
                </div>
                <Chip variant={formatStatus(c.status)}>{statusLabel(c.status)}</Chip>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
