// ContextIsland — top-right vertical 4-dot step indicator.
// One dot per soft-context slot (why / obstacles / time_constraints / skill).
// Expandable: shows each slot's AI-extracted text on expand.
// Data: dots reflect slotProgress.filled; expanded text from GET /{id}/soft-context.

import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchSoftContext, type SoftContextSlots } from '../keyEvents'
import type { SlotProgress } from '../WorkspaceLayout'

const SLOT_LABELS: Record<keyof SoftContextSlots, string> = {
  why: 'Why',
  obstacles: 'Obstacles',
  time_constraints: 'Time',
  skill: 'Skill'
}

const SLOT_KEYS: (keyof SoftContextSlots)[] = ['why', 'obstacles', 'time_constraints', 'skill']

interface ContextIslandProps {
  commitmentId: string
  slotProgress: SlotProgress
}

export function ContextIsland({ commitmentId, slotProgress }: ContextIslandProps) {
  const [expanded, setExpanded] = useState(true)
  const [slots, setSlots] = useState<SoftContextSlots | null>(null)
  const [loading, setLoading] = useState(false)

  // Load soft-context when expanding for the first time, or when slots fill.
  useEffect(() => {
    if (!expanded) return
    if (slots !== null) return
    setLoading(true)
    fetchSoftContext(commitmentId)
      .then((s) => setSlots(s))
      .finally(() => setLoading(false))
  }, [expanded, commitmentId, slots])

  // Refresh slot text when a new slot fills (slotProgress.filled changes).
  useEffect(() => {
    if (!expanded) return
    if (slotProgress.filled === 0) return
    fetchSoftContext(commitmentId).then((s) => setSlots(s))
  }, [slotProgress.filled, expanded, commitmentId])

  return (
    <div className="ws-island context-island">
      <button
        type="button"
        className="ws-island-header"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="context-island-dots" aria-hidden="true">
          {SLOT_KEYS.map((_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: static 4-dot array
              key={i}
              className={`context-dot${i < slotProgress.filled ? ' context-dot--filled' : ''}`}
            />
          ))}
        </div>
        <span className="ws-island-title">Context</span>
        {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
      </button>

      {expanded && (
        <div className="ws-island-body context-island-body">
          {loading && <p className="ws-island-empty">Loading...</p>}
          {!loading && slots === null && <p className="ws-island-empty">Could not load context.</p>}
          {!loading &&
            slots !== null &&
            SLOT_KEYS.map((key) => (
              <div key={key} className="context-slot-row">
                <span className="context-slot-label">{SLOT_LABELS[key]}</span>
                <span className="context-slot-value">{slots[key] ?? '—'}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
