// Welcome — /welcome (tour intro + first-run persona picker, no shell chrome)
// 3 preset cards: kawan / adik / cik_maid. Selected = filled --ink/inverted.
// "Continue" → persists choice via setPersona (local + best-effort backend) → /home.
// "Start the walkthrough" → starts the DemoTour → /welcome/commitments.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { guestLogin } from '../auth/api'
import { useDemoTour } from '../demo/DemoTour'
import { setWelcomeDismissed } from '../demo/welcomeFlag'
import { listPersonas } from '../mock/provider'
import type { Persona } from '../types/api'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function Welcome() {
  const navigate = useNavigate()
  const { me, setPersona, status, refresh } = useAuth()
  const { start } = useDemoTour()
  const personas = listPersonas()
  // Seed from the persisted me.persona so returning users see their current choice.
  const [selected, setSelected] = useState<Persona>(me?.persona ?? 'kawan')

  function handleSkip() {
    navigate('/home')
  }

  function handleDontShowAgain() {
    setWelcomeDismissed()
    navigate('/home')
  }

  async function handleStartWalkthrough() {
    await setPersona(selected)
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
        <h1 className="welcome-heading">Pick your companion</h1>
        <p className="welcome-sub">
          You can change this anytime in Settings. Their tone shifts, but your commitment stays yours.
        </p>

        <div className="persona-grid persona-grid-welcome">
          {personas.map((p) => (
            <Card
              key={p.id}
              selected={selected === p.id}
              className="persona-card"
              role="button"
              tabIndex={0}
              aria-pressed={selected === p.id}
              aria-label={`Choose ${p.name}, ${p.archetype}`}
              onClick={() => setSelected(p.id)}
              onKeyDown={(e) => e.key === 'Enter' && setSelected(p.id)}
            >
              <p className="persona-card-name">{p.name}</p>
              <p className="persona-card-archetype">{p.archetype}</p>
              <p className="persona-card-tone">{p.tone}</p>
            </Card>
          ))}
        </div>

        <Button
          variant="primary"
          className="welcome-continue-btn"
          onClick={handleStartWalkthrough}
          aria-label="Start the guided walkthrough"
        >
          Start the walkthrough
        </Button>

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
