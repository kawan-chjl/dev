// SettingsAudit - /settings/audit (TR-28)
// "Who changed what" table. Actor in user | system only (AI is unrepresentable - TR-24).

import { getActiveCommitment, getAuditLog } from '../../mock/provider'
import { Badge } from '../../ui/Badge'
import { Card } from '../../ui/Card'

export function SettingsAudit() {
  const active = getActiveCommitment()
  const rows = active != null ? getAuditLog(active.id) : []

  return (
    <div className="shell-page">
      <div className="page-header">
        <h2>History</h2>
        <p className="page-subtitle">Every change you made, and when.</p>
      </div>

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
                    <td className="audit-value-old">{row.old_value ?? 'None yet'}</td>
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
        </Card>
      )}
    </div>
  )
}
