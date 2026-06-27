// EndingSequence — shown after a commitment reaches a terminal state.
// Two variants: 'win' (completion) and 'failure' (missed/lapsed).
// Win: celebration copy + ShareWinDialog + what's next options.
// Failure: sad/disappointed message + two nav options.
// Reuses ShareWinDialog for win share (spec §11.4, TR-75).

import { PlusCircle } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { ShareWinDialog } from '../share/ShareWinDialog'
import type { Commitment, Persona } from '../types/api'

export type EndingVariant = 'win' | 'failure'

interface EndingSequenceProps {
  variant: EndingVariant
  commitment: Commitment
  winDateIso?: string // required for win variant
}

export function EndingSequence({ variant, commitment, winDateIso }: EndingSequenceProps) {
  const navigate = useNavigate()
  const { me } = useAuth()
  const persona: Persona = me?.persona ?? 'kawan'
  const [shareOpen, setShareOpen] = useState(false)

  if (variant === 'win') {
    return (
      <div className="ending-sequence ending-sequence--win" role="status" aria-live="polite">
        <div className="ending-win-content">
          <div className="ending-win-headline">You did it.</div>
          <p className="ending-win-sub">{commitment.deliverable} — committed and delivered.</p>
          <div className="ending-win-actions">
            <button type="button" className="ending-btn ending-btn--share" onClick={() => setShareOpen(true)}>
              Share your win
            </button>
            <button type="button" className="ending-btn ending-btn--new" onClick={() => navigate('/new')}>
              <PlusCircle size={16} aria-hidden="true" />
              Create new commitment
            </button>
            <button type="button" className="ending-btn ending-btn--ghost" onClick={() => navigate('/commitments')}>
              Return to commitments
            </button>
          </div>
        </div>
        <ShareWinDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          commitment={commitment}
          winDateIso={winDateIso ?? new Date().toISOString()}
          persona={persona}
        />
      </div>
    )
  }

  // Failure variant
  return (
    <div className="ending-sequence ending-sequence--failure" role="status" aria-live="polite">
      <div className="ending-failure-content">
        <div className="ending-failure-headline">This one didn't land.</div>
        <p className="ending-failure-sub">
          {commitment.deliverable} reached its deadline. That's okay — the work doesn't end here.
        </p>
        <div className="ending-failure-actions">
          <button type="button" className="ending-btn ending-btn--new" onClick={() => navigate('/new')}>
            <PlusCircle size={16} aria-hidden="true" />
            Create new commitment
          </button>
          <button type="button" className="ending-btn ending-btn--ghost" onClick={() => navigate('/commitments')}>
            Return to commitments
          </button>
        </div>
      </div>
    </div>
  )
}
