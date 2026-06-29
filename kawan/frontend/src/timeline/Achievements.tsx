// Achievements: surfaces the behavioral badge collection on the Analytics page (spec §11.4, B6, ADR-0004).
// Read-only consumer of GET /api/me/achievements. Earned first, locked greyed.

import type { LucideIcon } from 'lucide-react'
import { Award, Camera, Flame, Lock, Medal, Repeat, Ship, Sparkles, Sunrise } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MOCK_AUTH } from '../auth/api'
import type { Achievement } from '../types/api'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { Tooltip } from '../ui/Tooltip'
import { fetchAchievements } from './api'

// code -> lucide icon map (verified present in lucide-react@1.21.0; no emoji)
const ICON_MAP: Record<string, LucideIcon> = {
  first_win: Ship,
  comeback: Repeat,
  clean_win: Sparkles,
  early_bird: Sunrise,
  screenshot_win: Camera,
  on_fire: Flame,
  steady_signal: Medal,
  deadline_cushion: Sunrise,
  proofsmith: Camera,
  no_skip_week: Sparkles,
  tiny_step: Ship,
  follow_through: Award,
  warm_start: Sunrise,
  receipts_ready: Camera,
  momentum_maker: Flame
}
const DEFAULT_ICON: LucideIcon = Medal
const PREVIEW_LIMIT = 12
const MOCK_EARNED: Record<string, string> = {
  first_win: '2026-06-14T10:00:00Z',
  clean_win: '2026-06-20T14:30:00Z',
  screenshot_win: '2026-06-28T09:45:00Z'
}

function iconFor(code: string): LucideIcon {
  return ICON_MAP[code] ?? DEFAULT_ICON
}

const ACHIEVEMENT_CATALOG: Omit<Achievement, 'earned' | 'awarded_at'>[] = [
  {
    code: 'first_win',
    label: 'First Ship',
    description: 'Your first verified win.'
  },
  {
    code: 'comeback',
    label: 'Comeback',
    description: 'A verified win right after a miss.'
  },
  {
    code: 'clean_win',
    label: 'Clean Run',
    description: 'Verified without spending a skip-day.'
  },
  {
    code: 'early_bird',
    label: 'Early Bird',
    description: 'Verified at least 24h before the deadline.'
  },
  {
    code: 'screenshot_win',
    label: "Show, Don't Tell",
    description: 'A win verified by a screenshot.'
  },
  { code: 'on_fire', label: 'On Fire', description: 'Three verified wins in a row.' },
  {
    code: 'steady_signal',
    label: 'Steady Signal',
    description: 'Checked in on three separate days.'
  },
  {
    code: 'deadline_cushion',
    label: 'Deadline Cushion',
    description: 'Finished with room to breathe.'
  },
  {
    code: 'proofsmith',
    label: 'Proofsmith',
    description: 'Shared evidence that made the verdict obvious.'
  },
  {
    code: 'no_skip_week',
    label: 'No-Skip Week',
    description: 'Kept momentum for a full week without a skip.'
  },
  {
    code: 'tiny_step',
    label: 'Tiny Step',
    description: 'Shipped a small commitment instead of over-scoping.'
  },
  {
    code: 'follow_through',
    label: 'Follow Through',
    description: 'Closed the loop with a debrief after a verdict.'
  },
  {
    code: 'warm_start',
    label: 'Warm Start',
    description: 'Logged evidence soon after creating the commitment.'
  },
  {
    code: 'receipts_ready',
    label: 'Receipts Ready',
    description: 'Kept your proof trail tidy across commitments.'
  },
  {
    code: 'momentum_maker',
    label: 'Momentum Maker',
    description: 'Turned repeated check-ins into visible progress.'
  }
]

function mergeAchievementCatalog(serverItems: Achievement[]): Achievement[] {
  const byCode = new Map(serverItems.map((item) => [item.code, item]))
  const merged = ACHIEVEMENT_CATALOG.map((item) => {
    const serverItem = byCode.get(item.code)
    return {
      ...item,
      earned: serverItem?.earned ?? false,
      awarded_at: serverItem?.awarded_at ?? null
    }
  })
  const customItems = serverItems.filter(
    (item) => !ACHIEVEMENT_CATALOG.some((catalogItem) => catalogItem.code === item.code)
  )
  return [...merged, ...customItems]
}

// Mock fixture: earned + locked examples so the offline grid mirrors the real catalogue shape.
const MOCK_ACHIEVEMENTS: Achievement[] = ACHIEVEMENT_CATALOG.map((item) => ({
  ...item,
  earned: item.code in MOCK_EARNED,
  awarded_at: MOCK_EARNED[item.code] ?? null
}))

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kuala_Lumpur'
  })
}

function AchievementTile({ achievement }: { achievement: Achievement }) {
  const Icon = iconFor(achievement.code)

  return (
    <li className={`achievements-tile${achievement.earned ? '' : ' is-locked'}`}>
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
}

export function Achievements() {
  const [items, setItems] = useState<Achievement[] | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (MOCK_AUTH) {
      setItems(MOCK_ACHIEVEMENTS)
      return
    }
    fetchAchievements()
      .then((a) => setItems(mergeAchievementCatalog(a ?? [])))
      .catch(() => {
        // Backend unreachable: show the full locked catalogue as a safe default.
        setItems(mergeAchievementCatalog([]))
      })
  }, [])

  if (items === null) return null

  const earned = items.filter((a) => a.earned)
  const locked = items.filter((a) => !a.earned)
  // Earned first, locked after
  const ordered = [...earned, ...locked]
  const earnedCount = earned.length
  const total = items.length
  const hasOverflow = total > PREVIEW_LIMIT
  const previewItems = hasOverflow ? ordered.slice(0, PREVIEW_LIMIT) : ordered

  return (
    <Card className="achievements-section">
      <div className="achievements-header">
        <Award size={16} aria-hidden="true" className="achievements-header-icon" />
        <span className="achievements-header-label">Achievements</span>
        <Tooltip text="Badges for how you ship, not just how many wins you collect." />
        <span className="achievements-count-chip">
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
        <>
          <ul className="achievements-grid" aria-label="Achievement badges">
            {previewItems.map((achievement) => (
              <AchievementTile key={achievement.code} achievement={achievement} />
            ))}
          </ul>
          {hasOverflow && (
            <div className="achievements-see-more">
              <Button variant="secondary" className="achievements-see-more-btn" onClick={() => setModalOpen(true)}>
                See more
              </Button>
            </div>
          )}
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            label="All achievements"
            panelClassName="achievements-modal-panel"
          >
            <div className="achievements-modal-header">
              <div>
                <p className="achievements-modal-title">All achievements</p>
                <p className="achievements-modal-subtitle">
                  {earnedCount} earned, {total - earnedCount} still locked.
                </p>
              </div>
              <Button variant="secondary" className="achievements-modal-close" onClick={() => setModalOpen(false)}>
                Close
              </Button>
            </div>
            <ul className="achievements-grid achievements-modal-grid" aria-label="All achievement badges">
              {ordered.map((achievement) => (
                <AchievementTile key={achievement.code} achievement={achievement} />
              ))}
            </ul>
          </Modal>
        </>
      )}
    </Card>
  )
}
