// CommitmentDetail - /commitments/:id
// Calm overview: read-only locked fields + primary actions (Open workspace, Check now).
// Both actions navigate to /workspace/:id (locked decision #1).

import { ExternalLink, Lock } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useActiveCommitment } from '../../commitments/useActiveCommitment'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Chip } from '../../ui/Chip'
import { PageHeader } from '../PageHeader'

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

const escalationLabels: Record<0 | 1 | 2, string> = {
  0: 'Gentle',
  1: 'Direct',
  2: 'Blunt'
}

export function CommitmentDetail() {
  const { id } = useParams<{ id: string }>()
  const { commitment } = useActiveCommitment()
  const navigate = useNavigate()

  // Single active commitment: show it if id matches, else not found.
  const match = commitment?.id === id ? commitment : null

  if (match === null) {
    return (
      <div className="shell-page">
        <PageHeader title="Commitment" subtitle="Details and settings." />
        <p className="page-not-found">Commitment not found.</p>
      </div>
    )
  }

  return (
    <div className="shell-page">
      <PageHeader title="Commitment" subtitle="Read-only summary of your current commitment." />

      <div className="detail-status-header">
        <span className="detail-status-label">Status</span>
        <Chip variant={match.status === 'active' ? 'sage' : 'default'}>{match.status}</Chip>
        <Badge variant="muted">{match.id}</Badge>
      </div>

      <div className="detail-actions">
        <Button variant="accent" onClick={() => navigate(`/workspace/${match.id}`)}>
          <ExternalLink size={16} aria-hidden="true" />
          Open workspace
        </Button>
        <Button variant="primary" onClick={() => navigate(`/workspace/${match.id}`)}>
          Check now
        </Button>
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
          <ReadOnlyField label="How firm Kawan is" value={escalationLabels[match.escalation]} />
        </div>
      </Card>
    </div>
  )
}
