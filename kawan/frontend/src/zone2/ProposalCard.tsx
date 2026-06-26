// ProposalCard — inline Apply/Dismiss card for response_type:'proposal' turns.
// Shared by StageMode and MessagesMode. Apply calls the existing apply endpoint.
// Dismiss is client-only (no dismiss endpoint). Non-fatal errors stay inline on the card.

import { CheckCircle, X } from 'lucide-react'
import { useState } from 'react'
import type { WorkspaceProposal } from '../workspace/api'
import { applyProposal } from '../workspace/api'

interface ProposalCardProps {
  commitmentId: string
  proposalId: string
  proposal: WorkspaceProposal
  state: 'open' | 'applied' | 'dismissed'
  onApplied: () => void
  onDismissed: () => void
}

export function ProposalCard({ commitmentId, proposalId, proposal, state, onApplied, onDismissed }: ProposalCardProps) {
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  if (state === 'dismissed') return null

  if (state === 'applied') {
    return (
      <div className="proposal-card proposal-card--applied">
        <CheckCircle size={14} aria-hidden="true" className="proposal-card-icon" />
        <span className="proposal-card-applied-text">Applied — {proposal.field} updated</span>
      </div>
    )
  }

  async function handleApply() {
    if (applying) return
    setApplying(true)
    setApplyError(null)
    try {
      await applyProposal(commitmentId, proposalId)
      onApplied()
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : 'Failed to apply')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="proposal-card">
      <div className="proposal-card-header">
        <span className="proposal-card-label">PROPOSAL</span>
        <span className="proposal-card-field">{proposal.field}</span>
      </div>
      <p className="proposal-card-value">{proposal.proposed_value}</p>
      <p className="proposal-card-reason">{proposal.reason}</p>
      {applyError && <p className="proposal-card-error">{applyError}</p>}
      <div className="proposal-card-actions">
        <button
          type="button"
          className="proposal-card-btn proposal-card-btn--dismiss"
          onClick={onDismissed}
          disabled={applying}
          aria-label="Dismiss proposal"
        >
          <X size={12} aria-hidden="true" />
          Dismiss
        </button>
        <button
          type="button"
          className="proposal-card-btn proposal-card-btn--apply"
          onClick={handleApply}
          disabled={applying}
          aria-label={applying ? 'Applying…' : 'Apply proposal'}
        >
          {applying ? 'Applying…' : 'Apply'}
        </button>
      </div>
    </div>
  )
}
