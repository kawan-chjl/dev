// CommitmentDetail — /commitments/:id
// Shows hard-field summary; fields are visibly locked/read-only (design.md §7, iron rule).

import { useParams } from 'react-router-dom'
import { getActiveCommitment } from '../../mock/provider'
import { Badge } from '../../ui/Badge'
import { Card } from '../../ui/Card'

function LockIcon() {
  return <span title="Hard field — GUI only, cannot be edited by AI">🔒</span>
}

function ReadOnlyField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="detail-field">
      <span className="detail-field-label">
        {label}
        <LockIcon />
      </span>
      <span className="detail-field-value">{value ?? '—'}</span>
    </div>
  )
}

export function CommitmentDetail() {
  const { id } = useParams<{ id: string }>()
  const active = getActiveCommitment()

  // Mock: only one commitment exists; show it if id matches, else not found
  const commitment = active?.id === id ? active : null

  if (commitment == null) {
    return (
      <div className="shell-page">
        <p className="page-not-found">Commitment not found.</p>
      </div>
    )
  }

  return (
    <div className="shell-page">
      <div className="page-header">
        <h2>Commitment detail</h2>
        <Badge variant="muted">{commitment.id}</Badge>
      </div>

      <Card className="detail-card">
        <p className="detail-card-note">Hard fields are locked — only you can change them via this interface.</p>

        <div className="detail-fields">
          <ReadOnlyField label="Action" value={commitment.action} />
          <ReadOnlyField label="Deliverable" value={commitment.deliverable} />
          <ReadOnlyField label="Deadline" value={new Date(commitment.deadline).toLocaleString('en-MY')} />
          <ReadOnlyField label="Cadence" value={commitment.cadence} />
          <ReadOnlyField label="Evidence type" value={commitment.evidence_type} />
          <ReadOnlyField
            label="Stake"
            value={commitment.stake_enabled ? `Contact: ${commitment.stake_contact_name ?? '—'}` : 'Not enabled'}
          />
          <ReadOnlyField
            label="Skip days"
            value={`${commitment.skip_days_used} used of ${commitment.skip_days_total}`}
          />
          <ReadOnlyField label="Status" value={commitment.status} />
          <ReadOnlyField label="Escalation" value={String(commitment.escalation)} />
        </div>
      </Card>
    </div>
  )
}
