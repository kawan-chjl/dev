// SettingsAudit - /history
// "Who changed what" table. Actor in user | system only (AI is unrepresentable - TR-24).
// "Clear history" button calls DELETE /api/me/history (real backend clear, Gate-1 resolution).
// Under MOCK_AUTH: clears local view only (no backend available).

import { useState } from 'react'
import { MOCK_AUTH } from '../../auth/api'
import { clearHistory } from '../../commitments/api'
import { getActiveCommitment, getAuditLog } from '../../mock/provider'
import { useNotifications } from '../../notifications/NotificationProvider'
import type { AuditRow } from '../../types/api'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { PageHeader } from '../PageHeader'

function formatAt(iso: string): string {
  return new Date(iso).toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatValue(value: string): string {
  if (value.includes('T')) {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return formatAt(value)
  }
  return value
}

export function SettingsAudit() {
  const { notify } = useNotifications()
  const active = getActiveCommitment()
  const initial = active != null ? getAuditLog(active.id) : []
  const [rows, setRows] = useState<AuditRow[]>(initial)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

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
    <Button variant="secondary" onClick={() => setConfirmOpen(true)} disabled={clearing || rows.length === 0}>
      {clearing ? 'Clearing...' : 'Clear history'}
    </Button>
  )

  return (
    <div className="shell-page">
      <PageHeader title="History" subtitle="Every change you made, and when." actions={headerActions} />

      {confirmOpen && (
        <div
          className="commitments-confirm-overlay"
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirm clear history"
        >
          <div className="commitments-confirm-panel">
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
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <Card className="empty-state-card">
          <p className="empty-state-heading">No changes yet</p>
          <p className="empty-state-body">Any time you change a commitment field, it shows up here.</p>
        </Card>
      ) : (
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
                    <td>{formatValue(row.new_value)}</td>
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
