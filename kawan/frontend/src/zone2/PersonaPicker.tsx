// PersonaPicker — portrait-card step for the persona selection in NewCommitment.
// Shows portrait previews with a check badge on the selected card.
// Falls back to a glyph initial if the image fails to load.

import { Check } from 'lucide-react'
import { useState } from 'react'
import { listPersonas } from '../mock/provider'
import type { Persona } from '../types/api'
import { PERSONA_PORTRAITS } from './personaPortraits'

interface PersonaPickerProps {
  selected: Persona
  onSelect: (p: Persona) => void
}

function PersonaPortrait({ persona, name }: { persona: Persona; name: string }) {
  const [imgFailed, setImgFailed] = useState(false)
  const initial = name.charAt(0).toUpperCase()

  if (imgFailed) {
    return (
      <div className="persona-portrait-fallback" aria-hidden="true">
        {initial}
      </div>
    )
  }

  return (
    <img
      className="persona-portrait-img"
      src={PERSONA_PORTRAITS[persona]}
      alt={`Portrait of ${name}`}
      onError={() => setImgFailed(true)}
      loading="lazy"
    />
  )
}

export function PersonaPicker({ selected, onSelect }: PersonaPickerProps) {
  const personas = listPersonas()

  return (
    <div className="persona-picker">
      <h2 className="persona-picker-heading">Choose your companion</h2>
      <p className="persona-picker-sub">
        Your companion checks in with you, reviews your evidence, and gives you a verdict. Pick the one that fits how
        you want to be held to account.
      </p>
      <div className="persona-picker-grid">
        {personas.map((p) => {
          const isSelected = selected === p.id
          return (
            <button
              key={p.id}
              type="button"
              className={`persona-picker-card${isSelected ? ' persona-picker-card-selected' : ''}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(p.id as Persona)}
            >
              <div className="persona-picker-portrait">
                <PersonaPortrait persona={p.id as Persona} name={p.name} />
              </div>
              <div className="persona-picker-card-header">
                <div className="persona-picker-info">
                  <p className="persona-picker-name">{p.name}</p>
                  <p className="persona-picker-archetype">{p.archetype}</p>
                  <p className="persona-picker-tone">{p.tone}</p>
                </div>
                {isSelected && (
                  <div className="persona-picker-check" aria-hidden="true">
                    <Check size={13} />
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
