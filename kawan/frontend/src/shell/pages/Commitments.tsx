// Commitments list — /commitments
// Shows mock commitments as xl-radius cards. Clicking routes to /commitments/:id.

import { useNavigate } from 'react-router-dom'
import { getActiveCommitment } from '../../mock/provider'
import { Badge } from '../../ui/Badge'
import { Card } from '../../ui/Card'
import { Chip } from '../../ui/Chip'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function Commitments() {
  const navigate = useNavigate()
  const active = getActiveCommitment()
  const all = active != null ? [active] : []

  return (
    <div className="shell-page">
      <div className="page-header">
        <h2>Commitments</h2>
        <p className="page-subtitle">One active commitment at a time.</p>
      </div>

      {all.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">
            ◎
          </div>
          <p>No commitments yet.</p>
        </div>
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
