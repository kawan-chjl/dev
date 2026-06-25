// AuthMethods — shared block rendered by /sign-in.
// Offers two auth entries: SIWC and guest.

import { useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { guestLogin, loginRedirect } from '../../auth/api'
import { Button } from '../../ui/Button'

export function AuthMethods() {
  const { refresh } = useAuth()

  const [guestBusy, setGuestBusy] = useState(false)
  const [guestError, setGuestError] = useState<string | null>(null)

  async function handleGuest() {
    if (guestBusy) return
    setGuestBusy(true)
    setGuestError(null)
    try {
      await guestLogin()
      await refresh()
    } catch (err) {
      setGuestError(err instanceof Error ? err.message : 'Guest sign-in failed. Please try again.')
    } finally {
      setGuestBusy(false)
    }
  }

  return (
    <div className="auth-methods">
      {/* 1. Sign in with Chutes */}
      <Button variant="accent" className="auth-methods-btn" onClick={() => loginRedirect()}>
        Sign in with Chutes
      </Button>
      <p className="landing-cta-note">Billed to your Chutes account · TEE-verified inference</p>

      <div className="auth-methods-divider" aria-hidden="true">
        <span>or</span>
      </div>

      {/* 2. Guest */}
      <Button variant="secondary" className="auth-methods-btn" onClick={handleGuest} disabled={guestBusy}>
        {guestBusy ? 'Signing in…' : 'Continue as guest'}
      </Button>
      <p className="landing-cta-note">No Chutes account? Try it with a guest session.</p>
      {guestError && (
        <p className="auth-methods-error" role="alert">
          {guestError}
        </p>
      )}
    </div>
  )
}
