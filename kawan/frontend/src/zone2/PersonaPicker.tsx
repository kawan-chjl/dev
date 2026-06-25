// PersonaPicker — portrait-card step for the persona selection in NewCommitment.
// Shows head-to-torso portrait previews for the three companions.
// Falls back to a glyph initial if the image fails to load (so a missing portrait never breaks the card).

import { useState } from 'react'
import { listPersonas } from '../mock/provider'
import type { Persona } from '../types/api'

// Portrait image paths: Haru/Hiyori use their texture sheets as stand-in portraits.
// LiveroiD uses the bundled icon (Q-G1: PO GPU portrait would replace this file).
const PORTRAIT_PATHS: Record<Persona, string> = {
  kawan: '/models/haru/haru_greeter_t03.2048/texture_00.png',
  adik: '/models/hiyori/Hiyori.2048/texture_00.png',
  cik_maid: '/models/liveroid/LiveroiD_A-Y01/ico_LiveroiD_A-Y01.png'
}

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
      src={PORTRAIT_PATHS[persona]}
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
              <div className="persona-picker-info">
                <p className="persona-picker-name">{p.name}</p>
                <p className="persona-picker-archetype">{p.archetype}</p>
                <p className="persona-picker-tone">{p.tone}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
