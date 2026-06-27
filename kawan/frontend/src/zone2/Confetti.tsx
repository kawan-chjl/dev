// Confetti — lightweight, dependency-free celebration burst for the workspace win overlay.
// Pieces fall top-to-bottom; pointer-events:none; hidden under prefers-reduced-motion (CSS).

import { useMemo } from 'react'

const COLORS = ['#d9643a', '#f4ece1', '#e8b04b', '#7fae8f', '#c98a9b']
const PIECE_COUNT = 52

interface Piece {
  left: number
  delay: number
  duration: number
  color: string
  size: number
}

export function Confetti() {
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => {
        const color = COLORS[i % COLORS.length] ?? '#d9643a'
        return {
          left: Math.random() * 100,
          delay: Math.random() * 0.8,
          duration: 2.4 + Math.random() * 1.8,
          color,
          size: 7 + Math.random() * 7
        }
      }),
    []
  )

  return (
    <div className="ws-confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: ephemeral decorative pieces, never reordered
          key={i}
          className="ws-confetti-piece"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`
          }}
        />
      ))}
    </div>
  )
}
