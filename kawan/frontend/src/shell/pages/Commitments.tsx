// Commitments list - /commitments
// Shows active commitment as xl-radius card. Clicking routes to /commitments/:id.
// Reads real data via useActiveCommitment() with mock fallback.

import { CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useActiveCommitment } from '../../commitments/useActiveCommitment'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Chip } from '../../ui/Chip'
import { PageHeader } from '../PageHeader'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function Commitments() {
  const navigate = useNavigate()
  const { commitment } = useActiveCommitment()
  const all = commitment !== null ? [commitment] : []

  return (
    <div className="shell-page">
      <PageHeader title="Commitments" subtitle="One active commitment at a time." />

      {all.length === 0 ? (
        <Card className="empty-state-card">
          <div className="empty-state-icon-wrap" aria-hidden="true">
            <CheckCircle size={40} color="var(--ink-faint)" aria-hidden="true" />
          </div>
          <p className="empty-state-heading">Nothing here yet</p>
          <p className="empty-state-body">When you make a commitment, it shows up here. One at a time, for real.</p>
          <Button variant="accent" onClick={() => navigate('/new')}>
            Make a commitment
          </Button>
        </Card>
      ) : (
        <ul className="commitment-list">
          {all.map((c) => (
            <li key={c.id}>
              <Card
                className="commitment-card"
                role="button"
                tabIndex={0}
                aria-label={`View commitment: ${c.action} ${c.deliverable}`}
                onClick={() => navigate(`/commitments/${c.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/commitments/${c.id}`)}
              >
                <div className="commitment-card-header">
                  <p className="commitment-card-action">{c.action}</p>
                  <Chip variant={c.status === 'active' ? 'sage' : 'default'}>{c.status}</Chip>
                </div>
                <p className="commitment-card-deliverable">{c.deliverable}</p>
                <div className="commitment-card-meta">
                  <Badge variant="muted">Due {formatDate(c.deadline)}</Badge>
                  <Badge variant="muted">{c.evidence_type}</Badge>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
