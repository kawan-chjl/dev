// CommitmentDetail - /commitments/:id
// Shows hard-field summary; fields are visibly locked/read-only (design.md §7, iron rule).
// Reads real data via useActiveCommitment() with mock fallback.

import { Lock } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useActiveCommitment } from '../../commitments/useActiveCommitment'
import { Badge } from '../../ui/Badge'
import { Card } from '../../ui/Card'

function LockIcon() {
  return <Lock size={13} color="var(--ink-faint)" aria-hidden="true" />
}

function ReadOnlyField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="detail-field">
      <span className="detail-field-label">
        {label}
        <LockIcon />
      </span>
      <span className="detail-field-value">{value ?? 'Not set'}</span>
    </div>
  )
}

export function CommitmentDetail() {
  const { id } = useParams<{ id: string }>()
  const { commitment } = useActiveCommitment()

  // A2: single active commitment - show it if id matches, else not found.
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
        <p className="detail-card-note">Only you can change these fields. Kawan reads them but never edits them.</p>

        <div className="detail-fields">
          <ReadOnlyField label="Action" value={match.action} />
          <ReadOnlyField label="Deliverable" value={match.deliverable} />
          <ReadOnlyField label="Deadline" value={new Date(match.deadline).toLocaleString('en-MY')} />
          <ReadOnlyField label="Cadence" value={match.cadence} />
          <ReadOnlyField label="Evidence type" value={match.evidence_type} />
          <ReadOnlyField
            label="Accountability contact"
            value={match.stake_enabled ? `Contact: ${match.stake_contact_name ?? 'None yet'}` : 'Not enabled'}
          />
          <ReadOnlyField label="Rest days" value={`${match.skip_days_used} used of ${match.skip_days_total}`} />
          <ReadOnlyField label="Status" value={match.status} />
          <ReadOnlyField label="How firm Kawan is" value={String(match.escalation)} />
        </div>
      </Card>
    </div>
  )
}
