// Landing — Zone 0, / (public, no shell chrome)
// Real front door: hero copy + two CTAs routing to /sign-up and /sign-in.
// Auth logic (SIWC, email/password, guest) lives on those dedicated pages.

import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export function Landing() {
  const { status } = useAuth()

  // Authenticated users visiting / (e.g. after the IdP redirect) go straight to the app.
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
        {/* Eye motif */}
        <div className="landing-eye" aria-hidden="true">
          ◉
        </div>

        <h1 className="landing-headline">
          It doesn't believe you.
          <br />
          <span className="landing-headline-sub">Yet.</span>
        </h1>

        <p className="landing-body">
          Kawan is a skeptical accountability companion — not a cheerleader. One commitment, verified evidence, no
          self-report. Earn the trust.
        </p>

        <div className="landing-cta-group">
          <Link to="/sign-up" className="btn btn-accent landing-cta-btn">
            Get started
          </Link>
          <Link to="/sign-in" className="btn btn-secondary landing-cta-btn">
            Sign in
          </Link>
        </div>

        {/* Decorative doodle placeholder */}
        <div className="landing-doodle" aria-hidden="true">
          <div className="landing-doodle-line" />
          <div className="landing-doodle-dot" />
          <div className="landing-doodle-dot" />
          <div className="landing-doodle-dot" style={{ background: 'var(--accent)' }} />
        </div>
      </main>

      <footer className="landing-footer">
        <p>© 2026 Kawan · Built for Chutes Hack</p>
      </footer>
    </div>
  )
}
