// Welcome — /welcome (guided demo launcher, no shell chrome)
// "Start the walkthrough" → starts the DemoTour → /welcome/commitments.

import { BarChart3, ClipboardCheck, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { guestLogin } from '../auth/api'
import { useDemoTour } from '../demo/DemoTour'
import { setWelcomeDismissed } from '../demo/welcomeFlag'
import { Button } from '../ui/Button'

const DEMO_FEATURES = [
  {
    icon: ClipboardCheck,
    title: 'Create one guided commitment',
    body: 'Walk through the same commitment flow a real user uses, with demo defaults filled in where typing would slow you down.'
  },
  {
    icon: MessageCircle,
    title: 'See how Kawan checks in',
    body: 'Enter the workspace, respond to the check-in, and see how evidence turns into a verdict.'
  },
  {
    icon: BarChart3,
    title: 'Finish with the dashboard',
    body: 'Review the analytics preview and return home with the main app layout already familiar.'
  }
]

export function Welcome() {
  const navigate = useNavigate()
  const { status, refresh } = useAuth()
  const { start } = useDemoTour()

  function handleSkip() {
    navigate('/home')
  }

  function handleDontShowAgain() {
    setWelcomeDismissed()
    navigate('/home')
  }

  async function handleStartWalkthrough() {
    // The walkthrough creates a real commitment (POST /api/commitments), which 401s without a
    // session. Establish a guest session first, but only when definitively unauthenticated so a
    // real (or still-loading) SIWC session is never clobbered.
    if (status === 'unauthenticated') {
      try {
        await guestLogin()
        await refresh()
      } catch {
        // Non-fatal: start() still runs; the create step guards itself too.
      }
    }
    start()
  }

  return (
    <div className="welcome-root">
      <header className="welcome-header">
        <img src="/kawan-logo.png" alt="" className="welcome-logo" />
        <span className="welcome-wordmark">Kawan</span>
      </header>

      <main className="welcome-main">
        <p className="welcome-kicker">Demo mode</p>
        <h1 className="welcome-heading">Take the guided walkthrough</h1>
        <p className="welcome-sub">
          This short tour shows the hackathon demo flow without making you figure out where to click first.
        </p>

        <div className="welcome-demo-grid">
          {DEMO_FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <section key={feature.title} className="welcome-demo-card">
                <div className="welcome-demo-icon" aria-hidden="true">
                  <Icon size={20} />
                </div>
                <h2 className="welcome-demo-title">{feature.title}</h2>
                <p className="welcome-demo-body">{feature.body}</p>
              </section>
            )
          })}
        </div>

        <Button
          variant="primary"
          className="welcome-continue-btn"
          onClick={handleStartWalkthrough}
          aria-label="Start the guided walkthrough"
        >
          Start the walkthrough
        </Button>

        <p className="welcome-demo-note">
          You will choose a companion inside the commitment setup, where that choice has context.
        </p>

        <div className="welcome-bottom-options">
          <button type="button" className="welcome-option-btn" onClick={handleSkip}>
            Skip to home
          </button>
          <button type="button" className="welcome-option-btn" onClick={handleDontShowAgain}>
            Don&apos;t show again
          </button>
        </div>
      </main>
    </div>
  )
}
