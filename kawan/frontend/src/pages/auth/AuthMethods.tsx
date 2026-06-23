// AuthMethods — shared block rendered by /sign-in and /sign-up.
// Offers three auth entries: SIWC, email/password, guest.
// mode: 'sign-in' drives login(); 'sign-up' drives register().
// On success, refresh() → existing status==='authenticated' → /home redirect in the parent page.

import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import {
  BadCredentialsError,
  EmailAlreadyRegisteredError,
  guestLogin,
  login,
  loginRedirect,
  register
} from '../../auth/api'
import { Button } from '../../ui/Button'

interface AuthMethodsProps {
  mode: 'sign-in' | 'sign-up'
}

export function AuthMethods({ mode }: AuthMethodsProps) {
  const { refresh } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  const [guestBusy, setGuestBusy] = useState(false)
  const [guestError, setGuestError] = useState<string | null>(null)

  async function handleEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (emailBusy) return
    setEmailBusy(true)
    setEmailError(null)
    try {
      if (mode === 'sign-up') {
        await register(email, password)
      } else {
        await login(email, password)
      }
      await refresh()
      // refresh() → status → 'authenticated' → parent <Navigate to="/home"> fires.
    } catch (err) {
      if (err instanceof EmailAlreadyRegisteredError) {
        setEmailError('That email is already registered. Sign in instead?')
      } else if (err instanceof BadCredentialsError) {
        setEmailError('Wrong email or password.')
      } else {
        setEmailError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    } finally {
      setEmailBusy(false)
    }
  }

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

  const isSignUp = mode === 'sign-up'

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

      {/* 2. Email / password form */}
      <form className="auth-methods-form" onSubmit={handleEmailSubmit} noValidate>
        <label className="auth-methods-label" htmlFor="auth-email">
          Email
        </label>
        <input
          id="auth-email"
          className="auth-methods-input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={emailBusy}
          placeholder="you@example.com"
        />
        <label className="auth-methods-label" htmlFor="auth-password">
          Password
        </label>
        <input
          id="auth-password"
          className="auth-methods-input"
          type="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={emailBusy}
          placeholder={isSignUp ? 'At least 8 characters' : ''}
        />
        {emailError && (
          <p className="auth-methods-error" role="alert">
            {emailError}
          </p>
        )}
        <Button variant="primary" type="submit" className="auth-methods-btn" disabled={emailBusy}>
          {emailBusy ? (isSignUp ? 'Creating account…' : 'Signing in…') : isSignUp ? 'Create account' : 'Sign in'}
        </Button>
      </form>

      <p className="auth-methods-switch">
        {isSignUp ? (
          <>
            Already have an account? <Link to="/sign-in">Sign in</Link>
          </>
        ) : (
          <>
            No account yet? <Link to="/sign-up">Create one</Link>
          </>
        )}
      </p>

      <div className="auth-methods-divider" aria-hidden="true">
        <span>or</span>
      </div>

      {/* 3. Guest */}
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
