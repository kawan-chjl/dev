// SettingsAudit - /history
// "Who changed what" table. Actor in user | system only (AI is unrepresentable - TR-24).
// "Clear history" button calls DELETE /api/me/history (real backend clear, Gate-1 resolution).
// Under MOCK_AUTH: uses mock rows from fixture; clear is local-only (no backend available).

import { useEffect, useState } from 'react'
import { MOCK_AUTH } from '../../auth/api'
import { clearHistory, fetchHistory } from '../../commitments/api'
import { getActiveCommitment, getAuditLog } from '../../mock/provider'
import { useNotifications } from '../../notifications/NotificationProvider'
import type { AuditRow } from '../../types/api'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Modal } from '../../ui/Modal'
import { Skeleton } from '../../ui/Skeleton'
import { PageHeader } from '../PageHeader'

function formatAt(iso: string): string {
  return new Date(iso).toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kuala_Lumpur'
  })
}

function formatValue(value: string): string {
  if (value.includes('T')) {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return formatAt(value)
  }
  return value
}

function SettingsAuditSkeleton() {
  return (
    <Card aria-hidden="true">
      <section className="audit-table-wrapper" aria-label="Change history loading">
        <div className="skeleton-table">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative loading rows
              key={index}
              className="skeleton-audit-row"
            >
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="block" width={52} height={24} radius="var(--radius-pill)" />
              <Skeleton variant="text" width="100%" />
            </div>
          ))}
        </div>
      </section>
    </Card>
  )
}

export function SettingsAudit() {
  const { notify } = useNotifications()
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(!MOCK_AUTH)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  // Load rows: use mock fixture under MOCK_AUTH, real endpoint otherwise.
  useEffect(() => {
    if (MOCK_AUTH) {
      const active = getActiveCommitment()
      setRows(active != null ? getAuditLog(active.id) : [])
      return
    }
    setLoading(true)
    fetchHistory()
      .then(setRows)
      .catch(() => {
        // Fall back to mock rows so the page still renders on network failure
        const active = getActiveCommitment()
        setRows(active != null ? getAuditLog(active.id) : [])
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleClear() {
    setConfirmOpen(false)
    setClearing(true)
    try {
      if (!MOCK_AUTH) {
        await clearHistory()
      }
      // Clear the on-screen view in both mock and real modes
      setRows([])
    } catch {
      notify('Could not clear history. Please try again.', { kind: 'error' })
    } finally {
      setClearing(false)
    }
  }

  const headerActions = (
    <Button
      variant="secondary"
      onClick={() => setConfirmOpen(true)}
      disabled={clearing || loading || rows.length === 0}
    >
      {clearing ? 'Clearing...' : 'Clear history'}
    </Button>
  )

  return (
    <div className="shell-page">
      <PageHeader title="History" subtitle="Every change you made, and when." actions={headerActions} />

      {loading && <SettingsAuditSkeleton />}

      {/* Confirm dialog — portaled above all shell layers via Modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        label="Confirm clear history"
        panelClassName="modal-panel-confirm"
      >
        <p className="commitments-confirm-heading">Clear history?</p>
        <p className="commitments-confirm-body">
          This permanently removes all change records from your history. This cannot be undone.
        </p>
        <div className="commitments-confirm-actions">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="accent" onClick={handleClear}>
            Clear history
          </Button>
        </div>
      </Modal>

      {!loading && rows.length === 0 && (
        <Card className="empty-state-card">
          <p className="empty-state-heading">No changes yet</p>
          <p className="empty-state-body">Any time you change a commitment field, it shows up here.</p>
        </Card>
      )}
      {!loading && rows.length > 0 && (
        <Card>
          <section className="audit-table-wrapper" aria-label="Change history">
            <table className="audit-table">
              <thead>
                <tr>
                  <th scope="col">Field</th>
                  <th scope="col">Before</th>
                  <th scope="col">After</th>
                  <th scope="col">Who</th>
                  <th scope="col">When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.field}</td>
                    <td className="audit-value-old">
                      {row.old_value != null ? formatValue(row.old_value) : 'None yet'}
                    </td>
                    <td>{row.new_value != null ? formatValue(row.new_value) : 'None yet'}</td>
                    <td>
                      <Badge variant={row.actor === 'user' ? 'accent' : 'default'}>{row.actor}</Badge>
                    </td>
                    <td className="audit-time">{formatAt(row.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </Card>
      )}
    </div>
  )
}
