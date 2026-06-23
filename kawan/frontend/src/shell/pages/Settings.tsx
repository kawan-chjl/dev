// Settings — V6
// Persona switcher (3 presets), Chutes balance, push toggle, stake contact book, logout.

import { useState } from 'react'
import { getMe, listPersonas } from '../../mock/provider'
import type { Persona } from '../../types/api'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'

export function Settings() {
  const me = getMe()
  const personas = listPersonas()
  const [selectedPersona, setSelectedPersona] = useState<Persona>(me.persona)
  const [pushEnabled, setPushEnabled] = useState(false)

  return (
    <div className="shell-page">
      <div className="page-header">
        <h2>Settings</h2>
      </div>

      {/* Persona switcher — design.md §7 selected card pattern */}
      <section className="settings-section" aria-labelledby="persona-heading">
        <h3 id="persona-heading" className="settings-section-title">
          Companion
        </h3>
        <div className="persona-grid">
          {personas.map((p) => (
            <Card
              key={p.id}
              selected={selectedPersona === p.id}
              className="persona-card"
              role="button"
              tabIndex={0}
              aria-pressed={selectedPersona === p.id}
              aria-label={`Select ${p.name} — ${p.archetype}`}
              onClick={() => setSelectedPersona(p.id)}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedPersona(p.id)}
            >
              <p className="persona-card-name">{p.name}</p>
              <p className="persona-card-archetype">{p.archetype}</p>
              <p className="persona-card-tone">{p.tone}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Chutes balance */}
      <section className="settings-section" aria-labelledby="balance-heading">
        <h3 id="balance-heading" className="settings-section-title">
          Chutes balance
        </h3>
        <Card>
          <div className="balance-row">
            <span className="balance-label">Available</span>
            <span className="balance-value">{me.balance != null ? `$${me.balance.toFixed(2)}` : '—'}</span>
          </div>
          <p className="balance-note">Inference is billed to your Chutes account via SIWC.</p>
        </Card>
      </section>

      {/* Push notifications */}
      <section className="settings-section" aria-labelledby="push-heading">
        <h3 id="push-heading" className="settings-section-title">
          Check-in notifications
        </h3>
        <Card>
          <div className="toggle-row">
            <div>
              <p className="toggle-label">Push notifications</p>
              <p className="toggle-sub">Allow Kawan to deliver check-ins to this device.</p>
            </div>
            <button
              type="button"
              className={`toggle-btn ${pushEnabled ? 'toggle-btn-on' : ''}`}
              role="switch"
              aria-checked={pushEnabled}
              aria-label="Toggle push notifications"
              onClick={() => setPushEnabled((v) => !v)}
            >
              <span className="toggle-knob" />
            </button>
          </div>
        </Card>
      </section>

      {/* Stake contact book */}
      <section className="settings-section" aria-labelledby="stake-heading">
        <h3 id="stake-heading" className="settings-section-title">
          Stake contacts
        </h3>
        <Card>
          <p className="settings-placeholder">
            Add an accountability contact — they'll receive a message if you miss your commitment.
          </p>
          <Button variant="secondary" className="settings-add-btn" disabled>
            Add contact
          </Button>
        </Card>
      </section>

      {/* Logout */}
      <section className="settings-section settings-danger">
        <Button variant="secondary">Sign out</Button>
      </section>
    </div>
  )
}
