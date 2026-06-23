// CommitmentDetail — /commitments/:id
// Shows hard-field summary; fields are visibly locked/read-only (design.md §7, iron rule).
// Reads real data via useActiveCommitment() with mock fallback.

import { useParams } from 'react-router-dom'
import { useActiveCommitment } from '../../commitments/useActiveCommitment'
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
  const { commitment } = useActiveCommitment()

  // A2: single active commitment — show it if id matches, else not found.
  const match = commitment?.id === id ? commitment : null

  if (match === null) {
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
        <Badge variant="muted">{match.id}</Badge>
      </div>

      <Card className="detail-card">
        <p className="detail-card-note">Hard fields are locked — only you can change them via this interface.</p>

        <div className="detail-fields">
          <ReadOnlyField label="Action" value={match.action} />
          <ReadOnlyField label="Deliverable" value={match.deliverable} />
          <ReadOnlyField label="Deadline" value={new Date(match.deadline).toLocaleString('en-MY')} />
          <ReadOnlyField label="Cadence" value={match.cadence} />
          <ReadOnlyField label="Evidence type" value={match.evidence_type} />
          <ReadOnlyField
            label="Stake"
            value={match.stake_enabled ? `Contact: ${match.stake_contact_name ?? '—'}` : 'Not enabled'}
          />
          <ReadOnlyField label="Skip days" value={`${match.skip_days_used} used of ${match.skip_days_total}`} />
          <ReadOnlyField label="Status" value={match.status} />
          <ReadOnlyField label="Escalation" value={String(match.escalation)} />
        </div>
      </Card>
    </div>
  )
}
