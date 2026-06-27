// AnalyticsPanel — bento of stat cards + recharts charts.
// Mounted above the event feed in Timeline.tsx when state === 'ready'.
// No streaks. Reduced-motion: animations disabled when prefers-reduced-motion is set.

import { useEffect, useState } from 'react'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TimelineEvent } from '../types/api'
import { Card } from '../ui/Card'
import { checkinsOverTime, evidencePassRate, verdictBreakdown, verifiedCount } from './metrics'

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

interface Props {
  events: TimelineEvent[]
}

export function AnalyticsPanel({ events }: Props) {
  const reducedMotion = useReducedMotion()

  if (events.length === 0) {
    return (
      <div className="analytics-panel">
        <Card className="analytics-empty">
          <p className="analytics-empty-text">Your analytics fill in as you check in.</p>
        </Card>
      </div>
    )
  }

  const verified = verifiedCount(events)
  const breakdown = verdictBreakdown(events)
  const overTime = checkinsOverTime(events)
  const passRate = evidencePassRate(events)

  const totalEvidence = breakdown.verified + breakdown.notSureYet + breakdown.noPass

  const pieData = [
    { name: 'Verified', value: breakdown.verified, color: 'var(--sage-deep)' },
    { name: 'Not sure yet', value: breakdown.notSureYet, color: 'var(--clay)' },
    { name: 'No pass', value: breakdown.noPass, color: 'var(--line-strong)' }
  ].filter((d) => d.value > 0)

  return (
    <div className="analytics-panel">
      {/* Stat cards */}
      <div className="analytics-stat-row">
        <Card className="analytics-stat-card">
          <span className="analytics-stat-number">{verified}</span>
          <span className="analytics-stat-label">Verified</span>
        </Card>
        <Card className="analytics-stat-card">
          <span className="analytics-stat-number">{totalEvidence}</span>
          <span className="analytics-stat-label">Check-ins</span>
        </Card>
        <Card className="analytics-stat-card">
          <span className="analytics-stat-number">{passRate !== null ? `${passRate}%` : '--'}</span>
          <span className="analytics-stat-label">Pass rate</span>
        </Card>
        <Card className="analytics-stat-card">
          <span className="analytics-stat-number">{overTime.length}</span>
          <span className="analytics-stat-label">Active days</span>
        </Card>
      </div>

      {/* Charts row */}
      <div className="analytics-charts-row">
        {/* Bar chart: check-ins over time */}
        <Card className="analytics-chart-card">
          <p className="analytics-chart-title">Check-ins over time</p>
          {overTime.length === 0 ? (
            <p className="analytics-empty-text">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={overTime} margin={{ top: 4, right: 4, bottom: 4, left: -24 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--ink-faint)', fontFamily: 'var(--font-body)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => {
                    const d = new Date(v)
                    return `${d.getDate()}/${d.getMonth() + 1}`
                  }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--ink-faint)', fontFamily: 'var(--font-body)' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-caption)',
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-body)'
                  }}
                  cursor={{ fill: 'var(--surface-sunk)' }}
                  labelFormatter={(v) =>
                    typeof v === 'string'
                      ? new Date(v).toLocaleDateString('en-MY', {
                          day: 'numeric',
                          month: 'short',
                          timeZone: 'Asia/Kuala_Lumpur'
                        })
                      : String(v)
                  }
                />
                <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} isAnimationActive={!reducedMotion} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Pie/donut chart: verdict mix */}
        <Card className="analytics-chart-card">
          <p className="analytics-chart-title">Verdict mix</p>
          {pieData.length === 0 ? (
            <p className="analytics-empty-text">No verdicts yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  dataKey="value"
                  paddingAngle={2}
                  isAnimationActive={!reducedMotion}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-caption)',
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-body)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="analytics-legend">
            {pieData.map((d) => (
              <span key={d.name} className="analytics-legend-item">
                <span className="analytics-legend-dot" style={{ background: d.color }} aria-hidden="true" />
                {d.name}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
