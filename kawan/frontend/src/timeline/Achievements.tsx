// Achievements: surfaces the behavioral badge collection on the Analytics page (spec §11.4, B6, ADR-0004).
// Read-only consumer of GET /api/me/achievements. Earned first, locked greyed. No backend change.

import type { LucideIcon } from 'lucide-react'
import { Award, Camera, Flame, Lock, Medal, Repeat, Ship, Sparkles, Sunrise } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MOCK_AUTH } from '../auth/api'
import type { Achievement } from '../types/api'
import { Card } from '../ui/Card'
import { fetchAchievements } from './api'

// code -> lucide icon map (verified present in lucide-react@1.21.0; no emoji)
const ICON_MAP: Record<string, LucideIcon> = {
  first_win: Ship,
  comeback: Repeat,
  clean_win: Sparkles,
  early_bird: Sunrise,
  screenshot_win: Camera,
  on_fire: Flame
}
const DEFAULT_ICON: LucideIcon = Medal

function iconFor(code: string): LucideIcon {
  return ICON_MAP[code] ?? DEFAULT_ICON
}

// Mock fixture: 2 of 6 earned so the offline grid shows earned + locked and the chip reads "2 of 6".
const MOCK_ACHIEVEMENTS: Achievement[] = [
  {
    code: 'first_win',
    label: 'First Ship',
    description: 'Your first verified win.',
    earned: true,
    awarded_at: '2026-06-14T10:00:00Z'
  },
  {
    code: 'comeback',
    label: 'Comeback',
    description: 'A verified win right after a miss.',
    earned: false,
    awarded_at: null
  },
  {
    code: 'clean_win',
    label: 'Clean Run',
    description: 'Verified without spending a skip-day.',
    earned: true,
    awarded_at: '2026-06-20T14:30:00Z'
  },
  {
    code: 'early_bird',
    label: 'Early Bird',
    description: 'Verified at least 24h before the deadline.',
    earned: false,
    awarded_at: null
  },
  {
    code: 'screenshot_win',
    label: "Show, Don't Tell",
    description: 'A win verified by a screenshot.',
    earned: false,
    awarded_at: null
  },
  { code: 'on_fire', label: 'On Fire', description: 'Three verified wins in a row.', earned: false, awarded_at: null }
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function Achievements() {
  const [items, setItems] = useState<Achievement[] | null>(null)

  useEffect(() => {
    if (MOCK_AUTH) {
      setItems(MOCK_ACHIEVEMENTS)
      return
    }
    fetchAchievements()
      .then((a) => setItems(a ?? []))
      .catch(() => {
        // Backend unreachable: show empty collection as safe default.
        setItems([])
      })
  }, [])

  if (items === null) return null

  const earned = items.filter((a) => a.earned)
  const locked = items.filter((a) => !a.earned)
  // Earned first, locked after
  const ordered = [...earned, ...locked]
  const earnedCount = earned.length
  const total = items.length

  return (
    <Card className="achievements-section">
      <div className="achievements-header">
        <Award size={16} aria-hidden="true" className="achievements-header-icon" />
        <span className="achievements-header-label">Achievements</span>
        <span className="achievements-count-chip" title={`${earnedCount} of ${total} earned`}>
          {earnedCount} of {total}
        </span>
      </div>

      {earnedCount === 0 && (
        <div className="achievements-empty">
          <div className="empty-state-icon-wrap" aria-hidden="true">
            <Award size={40} color="var(--ink-faint)" aria-hidden="true" />
          </div>
          <p className="empty-state-heading">No achievements yet</p>
          <p className="empty-state-body">Finish a commitment and Kawan will start awarding badges for how you ship.</p>
        </div>
      )}

      {total > 0 && (
        <ul className="achievements-grid" aria-label="Achievement badges">
          {ordered.map((achievement) => {
            const Icon = iconFor(achievement.code)
            return (
              <li
                key={achievement.code}
                className={`achievements-tile${achievement.earned ? ' is-earned' : ' is-locked'}`}
              >
                <div className="achievements-tile-icon" aria-hidden="true">
                  <Icon size={20} />
                </div>
                <span className="achievements-tile-label">{achievement.label}</span>
                <span className="achievements-tile-desc">{achievement.description}</span>
                {achievement.earned && achievement.awarded_at !== null && (
                  <span className="achievements-tile-date">Earned {formatDate(achievement.awarded_at)}</span>
                )}
                {!achievement.earned && (
                  <span className="achievements-tile-locked-row">
                    <Lock size={11} aria-hidden="true" />
                    <span className="sr-only">Locked</span>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
