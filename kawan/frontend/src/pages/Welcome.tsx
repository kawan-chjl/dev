// Welcome — /welcome (first-run persona picker, no shell chrome)
// 3 preset cards: kawan / adik / cik_maid. Selected = filled --ink/inverted.
// "Continue" → persists choice via setPersona (local + best-effort backend) → /home.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { listPersonas } from '../mock/provider'
import type { Persona } from '../types/api'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function Welcome() {
  const navigate = useNavigate()
  const { me, setPersona } = useAuth()
  const personas = listPersonas()
  // Seed from the persisted me.persona so returning users see their current choice.
  const [selected, setSelected] = useState<Persona>(me?.persona ?? 'kawan')

  async function handleContinue() {
    await setPersona(selected)
    navigate('/home')
  }

  return (
    <div className="welcome-root">
      <header className="welcome-header">
        <img src="/kawan-logo.png" alt="Kawan" className="welcome-logo" />
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
          onClick={handleContinue}
          aria-label={`Continue with ${selected} companion`}
        >
          Continue with {personas.find((p) => p.id === selected)?.name}
        </Button>
      </main>
    </div>
  )
}
