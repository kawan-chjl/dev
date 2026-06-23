// SettingsAudit — /settings/audit (TR-28)
// "Who changed what" table. Actor ∈ user | system only (AI is unrepresentable — TR-24).

import { getActiveCommitment, getAuditLog } from '../../mock/provider'
import { Badge } from '../../ui/Badge'

export function SettingsAudit() {
  const active = getActiveCommitment()
  const rows = active != null ? getAuditLog(active.id) : []

  return (
    <div className="shell-page">
      <div className="page-header">
        <h2>Audit log</h2>
        <p className="page-subtitle">Every hard-field change — who made it, when.</p>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <p>No changes recorded yet.</p>
        </div>
      ) : (
        <section className="audit-table-wrapper" aria-label="Audit log">
          <table className="audit-table">
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Old value</th>
                <th scope="col">New value</th>
                <th scope="col">Actor</th>
                <th scope="col">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.field}</td>
                  <td className="audit-value-old">{row.old_value ?? '—'}</td>
                  <td>{row.new_value}</td>
                  <td>
                    <Badge variant={row.actor === 'user' ? 'accent' : 'default'}>{row.actor}</Badge>
                  </td>
                  <td className="audit-time">
                    {new Date(row.at).toLocaleString('en-MY', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
