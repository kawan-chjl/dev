// Landing - Zone 0, / (public, no shell chrome)
// Real front door: warm hero + how-it-works band + two CTAs routing to /sign-up and /sign-in.
// Auth logic (SIWC, email/password, guest) lives on those dedicated pages.

import { CheckCircle, Eye, ShieldCheck } from 'lucide-react'
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
        {/* Eye motif - svg not emoji */}
        <div className="landing-eye" aria-hidden="true">
          <Eye size={48} color="var(--accent)" strokeWidth={1.5} aria-hidden="true" />
        </div>

        <h1 className="landing-headline">
          It doesn't believe you.
          <br />
          <em className="landing-headline-sub">Yet.</em>
        </h1>

        <p className="landing-body">
          Kawan is a skeptical accountability companion. Not a cheerleader. One commitment, verified evidence, no
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
      </main>

      {/* How it works band */}
      <section className="landing-how" aria-label="How it works">
        <div className="landing-how-inner">
          <div className="landing-how-item">
            <div className="landing-how-icon" aria-hidden="true">
              <Eye size={22} color="var(--accent)" aria-hidden="true" />
            </div>
            <p className="landing-how-title">You commit</p>
            <p className="landing-how-desc">One goal, one deadline, one evidence source. Kawan holds you to it.</p>
          </div>
          <div className="landing-how-item">
            <div className="landing-how-icon" aria-hidden="true">
              <ShieldCheck size={22} color="var(--sage-deep)" aria-hidden="true" />
            </div>
            <p className="landing-how-title">Evidence is verified</p>
            <p className="landing-how-desc">
              Self-report is not accepted. Evidence is checked in a trusted environment.
            </p>
          </div>
          <div className="landing-how-item">
            <div className="landing-how-icon" aria-hidden="true">
              <CheckCircle size={22} color="var(--sage-deep)" aria-hidden="true" />
            </div>
            <p className="landing-how-title">Trust is earned</p>
            <p className="landing-how-desc">
              Each verified check-in builds momentum. Kawan believes you when you've shown it.
            </p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>2026 Kawan. Built for Chutes Hack.</p>
      </footer>
    </div>
  )
}
