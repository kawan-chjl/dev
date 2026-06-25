// Commitments dashboard — /commitments
// Filter chips: All / Ongoing / Completed (over the single active commitment).
// Q-E1: no list/history endpoint, so filters bucket the single active commitment by status.

import { CheckCircle, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveCommitment } from '../../commitments/useActiveCommitment'
import type { Commitment, CommitmentStatus } from '../../types/api'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Chip } from '../../ui/Chip'
import { PageHeader } from '../PageHeader'

type Filter = 'All' | 'Ongoing' | 'Completed'

const ONGOING_STATUSES: CommitmentStatus[] = ['active', 'lapsed', 'verifying', 'grace']
const COMPLETED_STATUSES: CommitmentStatus[] = ['completed', 'missed']

function matchesFilter(c: Commitment, filter: Filter): boolean {
  if (filter === 'All') return true
  if (filter === 'Ongoing') return ONGOING_STATUSES.includes(c.status)
  return COMPLETED_STATUSES.includes(c.status)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function Commitments() {
  const navigate = useNavigate()
  const { commitment } = useActiveCommitment()
  const [filter, setFilter] = useState<Filter>('All')

  const all = commitment !== null ? [commitment] : []
  const filtered = all.filter((c) => matchesFilter(c, filter))

  const headerActions = (
    <Button variant="accent" onClick={() => navigate('/commitments/new')}>
      <Plus size={16} aria-hidden="true" />
      Make a commitment
    </Button>
  )

  return (
    <div className="shell-page">
      <PageHeader title="Commitments" subtitle="One active commitment at a time." actions={headerActions} />

      <fieldset className="commitments-filter-row">
        <legend className="commitments-filter-legend">Filter commitments</legend>
        {(['All', 'Ongoing', 'Completed'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`commitments-filter-chip${filter === f ? ' commitments-filter-chip-active' : ''}`}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
          >
            {f}
          </button>
        ))}
      </fieldset>

      {filtered.length === 0 && filter !== 'All' ? (
        <Card className="empty-state-card">
          <div className="empty-state-icon-wrap" aria-hidden="true">
            <CheckCircle size={40} color="var(--ink-faint)" aria-hidden="true" />
          </div>
          <p className="empty-state-heading">
            {filter === 'Completed' ? 'Finished commitments will show here.' : 'No ongoing commitments.'}
          </p>
          <p className="empty-state-body">
            {filter === 'Completed'
              ? 'Complete your first commitment and it will appear here.'
              : 'Make a commitment to get started.'}
          </p>
          <Button variant="accent" onClick={() => navigate('/commitments/new')}>
            Make a commitment
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="empty-state-card">
          <div className="empty-state-icon-wrap" aria-hidden="true">
            <CheckCircle size={40} color="var(--ink-faint)" aria-hidden="true" />
          </div>
          <p className="empty-state-heading">Nothing here yet</p>
          <p className="empty-state-body">When you make a commitment, it shows up here. One at a time, for real.</p>
          <Button variant="accent" onClick={() => navigate('/commitments/new')}>
            Make a commitment
          </Button>
        </Card>
      ) : (
        <ul className="commitment-list">
          {filtered.map((c) => (
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
