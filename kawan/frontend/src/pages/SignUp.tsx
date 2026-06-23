// SignUp — /sign-up (public, no shell chrome)
// Thin Zone-0 wrapper around AuthMethods in sign-up mode.

import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { AuthMethods } from './auth/AuthMethods'

export function SignUp() {
  const { status } = useAuth()

  if (status === 'authenticated') return <Navigate to="/home" replace />

  return (
    <div className="landing-root">
      <header className="landing-header">
        <div className="landing-logo-row">
          <img src="/kawan-logo.png" alt="Kawan" className="landing-logo" />
          <span className="landing-logo-text">Kawan</span>
        </div>
      </header>

      <main className="landing-main">
        <div className="auth-page-eye" aria-hidden="true">
          ◉
        </div>
        <h1 className="auth-page-heading">Get started.</h1>
        <AuthMethods mode="sign-up" />
      </main>

      <footer className="landing-footer">
        <p>© 2026 Kawan · Built for Chutes Hack</p>
      </footer>
    </div>
  )
}
