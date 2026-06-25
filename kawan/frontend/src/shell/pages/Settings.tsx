// Settings - V7 "Warm bento" + v4 hotfix
// Persona switcher (portrait-free themed selector), Chutes balance, push toggle, accountability contact,
// "Delete all data" (data-only, keeps login), logout.
// Persona is sourced from me.persona (single source of truth via AuthContext).

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { MOCK_AUTH } from '../../auth/api'
import { deleteMyData } from '../../commitments/api'
import { listPersonas } from '../../mock/provider'
import { useNotifications } from '../../notifications/NotificationProvider'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Modal } from '../../ui/Modal'
import { PageHeader } from '../PageHeader'

export function Settings() {
  const { me, signOut, setPersona } = useAuth()
  const navigate = useNavigate()
  const { notify } = useNotifications()
  const personas = listPersonas()
  const [pushEnabled, setPushEnabled] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Source of truth for the selected persona is me.persona.
  // setPersona does an optimistic update so the selector re-renders immediately.
  const selectedPersona = me?.persona ?? 'kawan'

  async function handleDeleteData() {
    setDeleteConfirmOpen(false)
    setDeleting(true)
    try {
      if (!MOCK_AUTH) {
        await deleteMyData()
      }
      // Refresh to empty/idle state (no sign-out; account stays)
      navigate('/home')
      window.location.reload()
    } catch {
      notify('Could not delete your data. Please try again.', { kind: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="shell-page">
      <PageHeader title="Settings" subtitle="Choose your companion, manage your account, and control your data." />

      {/* Companion selector - portrait-free themed list */}
      <section className="settings-section" aria-labelledby="persona-heading">
        <h3 id="persona-heading" className="settings-section-title">
          Your companion
        </h3>
        <div className="companion-selector">
          {personas.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={selectedPersona === p.id}
              className={`companion-selector-row${selectedPersona === p.id ? ' companion-selector-row-selected' : ''}`}
              onClick={() => setPersona(p.id)}
            >
              <div>
                <p className="companion-selector-name">{p.name}</p>
                <p className="companion-selector-archetype">{p.archetype}</p>
                <p className="companion-selector-tone">{p.tone}</p>
              </div>
            </button>
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

      {/* Delete all data — above sign out */}
      <section className="settings-section settings-danger">
        <Button variant="secondary" disabled={deleting} onClick={() => setDeleteConfirmOpen(true)}>
          {deleting ? 'Deleting...' : 'Delete all data'}
        </Button>
      </section>

      {/* Delete confirm dialog — portaled above all shell layers via Modal */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        label="Confirm delete all data"
        panelClassName="modal-panel-confirm"
      >
        <p className="commitments-confirm-heading">Delete all your data?</p>
        <p className="commitments-confirm-body">
          This permanently deletes all your commitments, check-ins, history, and reflections. Your account stays, but
          this cannot be undone.
        </p>
        <div className="commitments-confirm-actions">
          <Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="accent" onClick={handleDeleteData}>
            Delete everything
          </Button>
        </div>
      </Modal>

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
