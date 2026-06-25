// Settings - V7 "Warm bento"
// Persona switcher (3 presets), Chutes balance, push toggle, accountability contact, logout.
// Persona is sourced from me.persona (single source of truth via AuthContext) - no detached
// local state. setPersona from useAuth() persists the choice (local + best-effort backend).

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { listPersonas } from '../../mock/provider'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { PageHeader } from '../PageHeader'

export function Settings() {
  const { me, signOut, setPersona } = useAuth()
  const navigate = useNavigate()
  const personas = listPersonas()
  const [pushEnabled, setPushEnabled] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // Source of truth for the selected persona is me.persona (Q8 recommendation).
  // setPersona does an optimistic update so the card re-renders immediately.
  const selectedPersona = me?.persona ?? 'kawan'

  return (
    <div className="shell-page">
      <PageHeader title="Settings" />

      {/* Persona switcher - design.md §7 selected card pattern */}
      <section className="settings-section" aria-labelledby="persona-heading">
        <h3 id="persona-heading" className="settings-section-title">
          Your companion
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
              aria-label={`Select ${p.name}, ${p.archetype}`}
              onClick={() => setPersona(p.id)}
              onKeyDown={(e) => e.key === 'Enter' && setPersona(p.id)}
            >
              <p className="persona-card-name">{p.name}</p>
              <p className="persona-card-archetype">{p.archetype}</p>
              <p className="persona-card-tone">{p.tone}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Chutes account */}
      <section className="settings-section" aria-labelledby="balance-heading">
        <h3 id="balance-heading" className="settings-section-title">
          Your Chutes account
        </h3>
        <Card>
          <div className="balance-row">
            <span className="balance-label">Available balance</span>
            <span className="balance-value">{me?.balance != null ? `$${me.balance.toFixed(2)}` : 'Not set'}</span>
          </div>
          <p className="balance-note">Inference is billed to your Chutes account via sign-in with Chutes.</p>
        </Card>
      </section>

      {/* Check-in notifications */}
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

      {/* Accountability contact */}
      <section className="settings-section" aria-labelledby="stake-heading">
        <h3 id="stake-heading" className="settings-section-title">
          Accountability contact
        </h3>
        <Card>
          <p className="settings-placeholder">Add a contact who gets a message if you miss your commitment.</p>
          <Button variant="secondary" className="settings-add-btn" disabled>
            Add contact
          </Button>
        </Card>
      </section>

      {/* Sign out */}
      <section className="settings-section settings-danger">
        <Button
          variant="secondary"
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true)
            try {
              await signOut()
              navigate('/')
            } finally {
              setSigningOut(false)
            }
          }}
        >
          Sign out
        </Button>
      </section>
    </div>
  )
}
