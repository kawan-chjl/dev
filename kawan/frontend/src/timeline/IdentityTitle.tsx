// IdentityTitle — shows the user's earned title + next-threshold hint (spec §11.4, TR-74).
// Thresholds: 0 wins = Starter (pre-first-win), 1 = Starter, 3 = Finisher, 5 = Shipper, 10 = Serial Shipper.
// Misses do not count (TR-64). The title only advances, never retreats.

import { Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MOCK_AUTH } from '../auth/api'
import { Tooltip } from '../ui/Tooltip'
import { fetchStats } from './api'

export interface TitleInfo {
  label: string
  nextThreshold: number | null
  wins: number
}

export function deriveTitle(wins: number): TitleInfo {
  if (wins >= 10) return { label: 'Serial Shipper', nextThreshold: null, wins }
  if (wins >= 5) return { label: 'Shipper', nextThreshold: 10, wins }
  if (wins >= 3) return { label: 'Finisher', nextThreshold: 5, wins }
  if (wins >= 1) return { label: 'Starter', nextThreshold: 3, wins }
  return { label: 'Starter', nextThreshold: 1, wins }
}

// In mock mode, represent a user with 1 verified win (shows "Starter", hints toward Finisher).
const MOCK_WINS = 1

export function IdentityTitle() {
  const [info, setInfo] = useState<TitleInfo | null>(null)

  useEffect(() => {
    if (MOCK_AUTH) {
      setInfo(deriveTitle(MOCK_WINS))
      return
    }
    fetchStats()
      .then((s) => {
        setInfo(deriveTitle(s?.verified_wins ?? 0))
      })
      .catch(() => {
        // Backend unreachable — show Starter as a safe default.
        setInfo(deriveTitle(0))
      })
  }, [])

  if (info === null) return null

  const nextHint =
    info.wins === 0
      ? '1 verified win to get started'
      : info.nextThreshold !== null
        ? `${info.nextThreshold - info.wins} more verified win${info.nextThreshold - info.wins === 1 ? '' : 's'} to ${deriveTitle(info.nextThreshold).label}`
        : null

  return (
    <div className="identity-title-block">
      <Trophy size={16} aria-hidden="true" className="identity-title-icon" />
      <span className="identity-title-name">
        <span className="identity-title-label">{info.label}</span>
        <Tooltip text="Your current Kawan title, based on verified wins. It only moves up." />
      </span>
      {nextHint !== null && <span className="identity-title-hint">{nextHint}</span>}
    </div>
  )
}
