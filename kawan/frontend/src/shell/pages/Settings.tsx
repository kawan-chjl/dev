// Settings - V7 "Warm bento" + v4 hotfix
// Persona switcher (portrait-free themed selector), Chutes balance, push toggle, accountability contact,
// "Delete all data" (data-only, keeps login), logout.
// Persona is sourced from me.persona (single source of truth via AuthContext).

import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { MOCK_AUTH } from '../../auth/api'
import { deleteMyData } from '../../commitments/api'
import { listPersonas } from '../../mock/provider'
import { useNotifications } from '../../notifications/NotificationProvider'
import { getTelegramStatus, linkTelegram, unlinkTelegram } from '../../notifications/telegram'
import type { PushStatus } from '../../notifications/webPush'
import { subscribeToPush, unsubscribeFromPush } from '../../notifications/webPush'
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
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null)
  const [pushBusy, setPushBusy] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [tgLinked, setTgLinked] = useState<boolean | null>(null)
  const [tgBusy, setTgBusy] = useState(false)
  const pollTimer = useRef<number | null>(null)
  const polling = useRef(false)

  // Reflect the server's Telegram link state (X-NOTIF). MOCK_AUTH dev has no backend.
  useEffect(() => {
    if (MOCK_AUTH) {
      setTgLinked(false)
      return
    }
    let cancelled = false
    getTelegramStatus()
      .then((s) => {
        if (!cancelled) setTgLinked(s.linked)
      })
      .catch(() => {
        if (!cancelled) setTgLinked(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Stop any in-flight link poll when leaving Settings.
  useEffect(
    () => () => {
      if (pollTimer.current !== null) window.clearTimeout(pollTimer.current)
    },
    []
  )

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

  async function handleTelegramConnect() {
    if (MOCK_AUTH) {
      setTgLinked(true)
      return
    }
    if (polling.current) return // a link attempt is already in flight
    setTgBusy(true)
    try {
      const link = await linkTelegram()
      if (!link.configured || !link.url) {
        notify('Telegram isn’t set up on the server yet.', { kind: 'error' })
        return
      }
      window.open(link.url, '_blank', 'noopener')
      notify('Opening Telegram — tap Start to finish linking.', { kind: 'info' })
      // Poll for the /start to land (the user taps Start in Telegram), up to ~2 min.
      polling.current = true
      const deadline = Date.now() + 120_000
      const poll = async () => {
        if (Date.now() > deadline) {
          polling.current = false
          return
        }
        const s = await getTelegramStatus().catch(() => null)
        if (s?.linked) {
          polling.current = false
          setTgLinked(true)
          notify('Telegram connected.', { kind: 'success' })
          return
        }
        pollTimer.current = window.setTimeout(poll, 3000)
      }
      pollTimer.current = window.setTimeout(poll, 3000)
    } catch {
      notify('Could not start Telegram linking. Please try again.', { kind: 'error' })
    } finally {
      setTgBusy(false)
    }
  }

  async function handleTelegramDisconnect() {
    if (MOCK_AUTH) {
      setTgLinked(false)
      return
    }
    setTgBusy(true)
    try {
      await unlinkTelegram()
      setTgLinked(false)
    } catch {
      notify('Could not disconnect Telegram. Please try again.', { kind: 'error' })
    } finally {
      setTgBusy(false)
    }
  }

  return (
    <div className="shell-page">
      <PageHeader title="Settings" subtitle="Choose your companion, manage your account, and control your data." />

      {/* Companion selector - horizontal cube-card grid (matches onboarding companion cards) */}
      <section className="settings-section" aria-labelledby="persona-heading">
        <h3 id="persona-heading" className="settings-section-title">
          Your companion
        </h3>
        <div className="nc-companion-grid">
          {personas.map((p) => {
            const isSelected = selectedPersona === p.id
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={isSelected}
                className={`nc-companion-card${isSelected ? ' nc-companion-card-selected' : ''}`}
                onClick={() => setPersona(p.id)}
              >
                <div className="nc-companion-card-body">
                  <p className="nc-companion-name">{p.name}</p>
                  <p className="nc-companion-archetype">{p.archetype}</p>
                  <p className="nc-companion-tone">{p.tone}</p>
                </div>
                {isSelected && (
                  <div className="nc-companion-check" aria-hidden="true">
                    <Check size={12} />
                  </div>
                )}
              </button>
            )
          })}
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
              <p className="toggle-label">In-app</p>
              <p className="toggle-sub">Always on — check-ins appear in your timeline.</p>
            </div>
          </div>
          <div className="toggle-row">
            <div>
              <p className="toggle-label">Email</p>
              <p className="toggle-sub">Set a reminder email per commitment when you create it.</p>
            </div>
          </div>
          <div className="toggle-row">
            <div>
              <p className="toggle-label">Push notifications</p>
              <p className="toggle-sub push-status-copy">
                {pushStatus === 'subscribed' || pushEnabled
                  ? 'Notifications are on.'
                  : pushStatus === 'denied'
                    ? 'Notifications are blocked in your browser settings.'
                    : pushStatus === 'unsupported'
                      ? 'This browser does not support notifications.'
                      : 'Turn on notifications to get nudged when the tab is closed.'}
              </p>
            </div>
            <button
              type="button"
              className={`toggle-btn ${pushEnabled ? 'toggle-btn-on' : ''}`}
              role="switch"
              aria-checked={pushEnabled}
              aria-label="Toggle push notifications"
              disabled={pushBusy || pushStatus === 'unsupported' || pushStatus === 'denied'}
              onClick={async () => {
                if (MOCK_AUTH) {
                  setPushEnabled((v) => !v)
                  return
                }
                if (pushEnabled) {
                  setPushBusy(true)
                  await unsubscribeFromPush()
                  setPushEnabled(false)
                  setPushStatus(null)
                  setPushBusy(false)
                  return
                }
                setPushBusy(true)
                const status = await subscribeToPush()
                setPushStatus(status)
                setPushEnabled(status === 'subscribed')
                setPushBusy(false)
              }}
            >
              <span className="toggle-knob" />
            </button>
          </div>
          <div className="toggle-row">
            <div>
              <p className="toggle-label">Telegram</p>
              <p className="toggle-sub">
                {tgLinked
                  ? 'Connected — check-ins are also sent to your Telegram.'
                  : 'Connect to also get check-ins in Telegram.'}
              </p>
            </div>
            <Button
              variant="secondary"
              disabled={tgBusy || tgLinked === null}
              onClick={tgLinked ? handleTelegramDisconnect : handleTelegramConnect}
            >
              {tgLinked ? 'Disconnect' : tgBusy ? 'Connecting…' : 'Connect'}
            </Button>
          </div>
        </Card>
      </section>

      {/* Delete all data — above sign out */}
      <section className="settings-section settings-danger">
        <Button variant="danger" disabled={deleting} onClick={() => setDeleteConfirmOpen(true)}>
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
