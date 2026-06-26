// Commitments dashboard — /commitments
// Management dashboard: stat row, filter chips, management table with multiselect + multi-delete, pipeline rail.
// Multi-delete calls DELETE /api/commitments/{id} (real permanent delete, per Gate-1 resolution).
// Pagination: 10 per page; prev/next controls shown only when total > 10.

import { CheckCircle, ChevronLeft, ChevronRight, Eye, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_AUTH } from '../../auth/api'
import { deleteCommitment } from '../../commitments/api'
import { useActiveCommitment } from '../../commitments/useActiveCommitment'
import { useCommitments } from '../../commitments/useCommitments'
import { useNotifications } from '../../notifications/NotificationProvider'
import { useTimeline } from '../../timeline/useTimeline'
import type { Commitment, CommitmentStatus } from '../../types/api'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Checkbox } from '../../ui/Checkbox'
import { Chip } from '../../ui/Chip'
import { Modal } from '../../ui/Modal'
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

// Stats row uses the active commitment's timeline
function useActiveStats(commitment: Commitment | null) {
  const { timeline } = useTimeline(commitment?.id ?? null)
  const events = timeline?.events ?? []
  const verified = events.filter((e) => e.type === 'evidence' && e.verdict === 'pass').length
  const checkins = events.filter((e) => e.type === 'evidence').length
  const passRate =
    checkins === 0
      ? null
      : Math.round((events.filter((e) => e.type === 'evidence' && e.verdict === 'pass').length / checkins) * 100)
  const restDaysLeft = commitment ? commitment.skip_days_total - commitment.skip_days_used : 0
  return { verified, checkins, passRate, restDaysLeft }
}

// Pipeline rail — static lifecycle explainer (OQ-6)
function PipelineRail() {
  const steps = [
    { label: 'Draft', desc: 'You set your goal, deadline, and how Kawan checks you.' },
    { label: 'Active', desc: 'Your commitment is live. Kawan checks in on schedule.' },
    { label: 'Checking in', desc: 'Kawan delivers a check-in and waits for your evidence.' },
    { label: 'Verifying', desc: 'Evidence reviewed. Verdict: pass, no pass, or not sure yet.' },
    { label: 'Done', desc: 'Commitment completed or closed. Reflect and go again.' }
  ]
  return (
    <aside className="pipeline-rail">
      <p className="pipeline-rail-heading">How it works</p>
      <ol className="pipeline-rail-steps">
        {steps.map((s, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: stable static list
          <li key={i} className="pipeline-rail-step">
            <div className="pipeline-rail-dot" aria-hidden="true">
              {i + 1}
            </div>
            <div className="pipeline-rail-text">
              <p className="pipeline-rail-label">{s.label}</p>
              <p className="pipeline-rail-desc">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  )
}

export function Commitments() {
  const navigate = useNavigate()
  const { notify } = useNotifications()
  const { commitments, refresh, total, page, pageSize, setPage, hasPrev, hasNext } = useCommitments()
  const [filter, setFilter] = useState<Filter>('All')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Stat row uses the most-recent active commitment ("light current" per the selection model),
  // not commitments[0] from the current page, so figures do not shift as the user pages.
  const { commitment: activeCommitment } = useActiveCommitment()
  const stats = useActiveStats(activeCommitment)

  const totalPages = Math.ceil(total / pageSize)

  const filtered = commitments.filter((c) => matchesFilter(c, filter))
  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id))
  const showPagination = total > pageSize

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((c) => c.id)))
    }
  }

  async function handleDelete() {
    setConfirmOpen(false)
    setDeleting(true)
    try {
      const ids = Array.from(selected)
      if (!MOCK_AUTH) {
        for (const id of ids) {
          await deleteCommitment(id)
        }
      }
      setSelected(new Set())
      await refresh()
    } catch {
      notify('Could not remove the selected commitments. Please try again.', { kind: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="shell-page">
      <PageHeader
        title="Commitments"
        subtitle="All your commitments, active and finished."
        actions={
          <Button variant="accent" onClick={() => navigate('/commitments/new')}>
            Make a commitment
          </Button>
        }
      />

      {/* Stats row */}
      <div className="commitments-stats-row">
        <Card className="commitments-stat-card">
          <span className="commitments-stat-number">{stats.verified}</span>
          <span className="commitments-stat-label">Verified</span>
        </Card>
        <Card className="commitments-stat-card">
          <span className="commitments-stat-number">{stats.checkins}</span>
          <span className="commitments-stat-label">Check-ins</span>
        </Card>
        <Card className="commitments-stat-card">
          <span className="commitments-stat-number">{stats.passRate !== null ? `${stats.passRate}%` : '--'}</span>
          <span className="commitments-stat-label">Pass rate</span>
        </Card>
        <Card className="commitments-stat-card">
          <span className="commitments-stat-number">{stats.restDaysLeft}</span>
          <span className="commitments-stat-label">Rest days left</span>
        </Card>
      </div>

      {/* Dashboard body: table panel + pipeline rail panel */}
      <div className="commitments-dashboard-body">
        <Card className="commitments-main-card">
          <div className="commitments-main">
            {/* Filter row — tabs left, multiselect controls right */}
            <div className="commitments-filter-row-wrap">
              <fieldset className="commitments-filter-row">
                <legend className="commitments-filter-legend">Filter commitments</legend>
                {(['All', 'Ongoing', 'Completed'] as Filter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`commitments-filter-chip${filter === f ? ' commitments-filter-chip-active' : ''}`}
                    onClick={() => {
                      setFilter(f)
                      setSelected(new Set())
                    }}
                    aria-pressed={filter === f}
                  >
                    {f}
                  </button>
                ))}
              </fieldset>
              {selected.size > 0 && (
                <div className="commitments-selection-toolbar">
                  <span className="commitments-selection-count">{selected.size} selected</span>
                  <Button variant="secondary" onClick={() => setConfirmOpen(true)} disabled={deleting}>
                    <Trash2 size={14} aria-hidden="true" />
                    {deleting ? 'Removing...' : 'Remove selected'}
                  </Button>
                  <button type="button" className="commitments-selection-clear" onClick={() => setSelected(new Set())}>
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Confirm dialog — portaled above all shell layers via Modal */}
            <Modal
              open={confirmOpen}
              onClose={() => setConfirmOpen(false)}
              label="Confirm deletion"
              panelClassName="modal-panel-confirm"
            >
              <p className="commitments-confirm-heading">Remove selected commitments?</p>
              <p className="commitments-confirm-body">
                This permanently deletes the selected commitments and all their check-in history. This cannot be undone.
              </p>
              <div className="commitments-confirm-actions">
                <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button variant="accent" onClick={handleDelete}>
                  Remove permanently
                </Button>
              </div>
            </Modal>

            {/* Table or empty state */}
            {filtered.length === 0 ? (
              <Card className="empty-state-card">
                <div className="empty-state-icon-wrap" aria-hidden="true">
                  <CheckCircle size={40} color="var(--ink-faint)" aria-hidden="true" />
                </div>
                <p className="empty-state-heading">
                  {filter === 'All'
                    ? 'Nothing here yet'
                    : filter === 'Completed'
                      ? 'Finished commitments will show here.'
                      : 'No ongoing commitments.'}
                </p>
                <p className="empty-state-body">
                  {filter === 'All'
                    ? 'When you make a commitment, it shows up here.'
                    : filter === 'Completed'
                      ? 'Complete a commitment and it will appear here.'
                      : 'Make a commitment to get started.'}
                </p>
              </Card>
            ) : (
              <div className="commitments-table-wrapper">
                <table className="commitments-table">
                  <thead>
                    <tr>
                      <th scope="col" className="commitments-table-check-col">
                        <Checkbox aria-label="Select all visible" checked={allSelected} onChange={toggleAll} />
                      </th>
                      <th scope="col">Action</th>
                      <th scope="col">Deliverable</th>
                      <th scope="col">Status</th>
                      <th scope="col">Deadline</th>
                      <th scope="col" aria-label="Row actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id} className={selected.has(c.id) ? 'commitments-table-row-selected' : ''}>
                        <td className="commitments-table-check-col">
                          <Checkbox
                            aria-label={`Select commitment: ${c.action}`}
                            checked={selected.has(c.id)}
                            onChange={() => toggleRow(c.id)}
                          />
                        </td>
                        <td className="commitments-table-action">{c.action}</td>
                        <td className="commitments-table-deliverable">{c.deliverable}</td>
                        <td>
                          <Chip variant={c.status === 'active' ? 'sage' : 'default'}>{c.status}</Chip>
                        </td>
                        <td>
                          <Badge variant="muted">{formatDate(c.deadline)}</Badge>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="commitments-table-view-btn"
                            aria-label={`View commitment: ${c.action}`}
                            onClick={() => navigate(`/commitments/${c.id}`)}
                          >
                            <Eye size={14} aria-hidden="true" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination — only when total > 10 */}
            {showPagination && (
              <nav className="commitments-pagination" aria-label="Page navigation">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPage(page - 1)
                    setSelected(new Set())
                  }}
                  disabled={!hasPrev}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  Previous
                </Button>
                <p className="commitments-pagination-indicator" aria-live="polite">
                  Page {page + 1} of {totalPages}
                </p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPage(page + 1)
                    setSelected(new Set())
                  }}
                  disabled={!hasNext}
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight size={14} aria-hidden="true" />
                </Button>
              </nav>
            )}
          </div>
        </Card>

        <Card className="pipeline-rail-card">
          <PipelineRail />
        </Card>
      </div>
    </div>
  )
}
