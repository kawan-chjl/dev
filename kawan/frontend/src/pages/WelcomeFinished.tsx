// WelcomeFinished — /welcome/finished (step 5 of the guided walkthrough)
// Shown after the user completes the analytics step of the tour.
// CTAs: go to home (staying signed in) or restart tour.

import { PartyPopper } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useDemoTour } from '../demo/DemoTour'
import { Button } from '../ui/Button'

export function WelcomeFinished() {
  const navigate = useNavigate()
  const { finish, start } = useDemoTour()

  function handleGoHome() {
    finish()
    navigate('/home')
  }

  function handleRestart() {
    start()
  }

  return (
    <div className="welcome-root">
      <header className="welcome-header">
        <Link to="/?bypass=1" className="welcome-brand-link" aria-label="Kawan landing page">
          <img src="/kawan-logo.png" alt="" className="welcome-logo" />
          <span className="welcome-wordmark">KAWAN</span>
        </Link>
      </header>

      <main className="welcome-main welcome-finished-main">
        <div className="welcome-finished-icon" aria-hidden="true">
          <PartyPopper size={56} color="var(--accent)" strokeWidth={1.5} />
        </div>

        <h1 className="welcome-heading">You did it.</h1>

        <p className="welcome-sub">
          That&apos;s how Kawan works. Make a commitment, check in with evidence, and Kawan holds you honestly. Your
          real commitments live here whenever you&apos;re ready.
        </p>

        <Button variant="primary" className="welcome-continue-btn" data-tour="finished-home" onClick={handleGoHome}>
          Go to home
        </Button>

        <div className="welcome-bottom-options">
          <button type="button" className="welcome-option-btn" onClick={handleRestart}>
            Run the walkthrough again
          </button>
        </div>
      </main>
    </div>
  )
}
