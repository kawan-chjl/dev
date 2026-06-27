// ProductivityMeter: shows a fill-bar that rises with verified wins (spec §11.4, TR-75).
// Milestones at 1/3/5/10 match the identity-title thresholds (TR-74). The bar fills 0->10
// continuously with tick marks; it never resets to zero (TR-75).
// Reuses deriveTitle() from IdentityTitle for threshold logic. A separate fetchStats() call
// is intentional: we do not edit the shipped A7 component (OQ-A8-DEDUP decision).

import { TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MOCK_AUTH } from '../auth/api'
import { fetchStats } from './api'
import { deriveTitle } from './IdentityTitle'

// Mirror IdentityTitle's mock constant so both components read consistently on the same page.
const MOCK_WINS = 1

// Milestone tick positions as percentage of the 0->10 range.
const TICKS: { wins: number; pct: number }[] = [
  { wins: 1, pct: 10 },
  { wins: 3, pct: 30 },
  { wins: 5, pct: 50 },
  { wins: 10, pct: 100 }
]

export function ProductivityMeter() {
  const [wins, setWins] = useState<number | null>(null)

  useEffect(() => {
    if (MOCK_AUTH) {
      setWins(MOCK_WINS)
      return
    }
    fetchStats()
      .then((s) => {
        setWins(s?.verified_wins ?? 0)
      })
      .catch(() => {
        // Backend unreachable: show empty bar as safe default.
        setWins(0)
      })
  }, [])

  if (wins === null) return null

  const info = deriveTitle(wins)
  const fillPct = info.nextThreshold === null ? 100 : Math.round((wins / 10) * 100)

  const nextHint =
    info.nextThreshold !== null
      ? `${info.nextThreshold - wins} more verified win${info.nextThreshold - wins === 1 ? '' : 's'} to ${deriveTitle(info.nextThreshold).label}`
      : 'Top rank reached'

  const pluralWins = wins === 1 ? 'verified win' : 'verified wins'

  return (
    <div className="productivity-meter">
      <div className="productivity-meter-header">
        <TrendingUp size={16} aria-hidden="true" className="productivity-meter-icon" />
        <span className="productivity-meter-label">Productivity meter</span>
        <span className="productivity-meter-value">
          {wins} {pluralWins}
        </span>
      </div>

      <div
        className="productivity-meter-track"
        role="progressbar"
        aria-valuenow={wins}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-label={`Productivity meter, ${wins} of 10 verified wins`}
      >
        <div className="productivity-meter-fill" style={{ width: `${fillPct}%` }} />
        {TICKS.map((tick) => (
          <div
            key={tick.wins}
            className={`productivity-meter-tick${wins >= tick.wins ? ' is-reached' : ''}`}
            style={{ left: `${tick.pct}%` }}
            aria-hidden="true"
          />
        ))}
      </div>

      <p className="productivity-meter-hint">{nextHint}</p>
    </div>
  )
}
