// Landing — Zone 0, / (public, no shell chrome)
// Full-bleed warm cream editorial hero. Single CTA: "Sign in with Chutes".
// SIWC auth deferred — CTA routes to /welcome for now.

import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'

export function Landing() {
  const navigate = useNavigate()

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
          <Button
            variant="accent"
            className="landing-cta-btn"
            onClick={() => navigate('/welcome')}
            aria-label="Sign in with Chutes to get started"
          >
            Sign in with Chutes
          </Button>
          <p className="landing-cta-note">Billed to your Chutes account · TEE-verified inference</p>
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
