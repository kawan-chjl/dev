// Confetti — one-shot, dependency-free canvas burst for the workspace win overlay.
// Fires from bottom-center when mounted; pointer-events:none; independent of CSS motion prefs.

import { useEffect, useRef, useState } from 'react'

const COLORS = ['#d9643a', '#f4ece1', '#e8b04b', '#7fae8f', '#c98a9b', '#f7c9a8']
const PIECE_COUNT = 128
const DURATION_MS = 3800

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  gravity: number
  drag: number
  size: number
  length: number
  rotation: number
  spin: number
  color: string
  alpha: number
}

function createParticles(width: number, height: number): Particle[] {
  const originX = width / 2
  const originY = height + 16
  const screenScale = Math.max(0.8, Math.min(1.35, width / 1280))

  return Array.from({ length: PIECE_COUNT }, (_, i) => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.85
    const speed = (9 + Math.random() * 15) * screenScale
    const color = COLORS[i % COLORS.length] ?? COLORS[0]

    return {
      x: originX + (Math.random() - 0.5) * 24,
      y: originY + Math.random() * 18,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - Math.random() * 6,
      gravity: 0.18 + Math.random() * 0.11,
      drag: 0.986 + Math.random() * 0.007,
      size: 4 + Math.random() * 6,
      length: 8 + Math.random() * 15,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.36,
      color,
      alpha: 1
    }
  })
}

export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [active, setActive] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) {
      setActive(false)
      return undefined
    }
    const canvasEl = canvas
    const context = ctx

    let animationFrame = 0
    let start = 0
    let last = 0
    let width = 0
    let height = 0
    let particles: Particle[] = []

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvasEl.width = Math.max(1, Math.floor(width * dpr))
      canvasEl.height = Math.max(1, Math.floor(height * dpr))
      canvasEl.style.width = `${width}px`
      canvasEl.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function drawPiece(particle: Particle) {
      context.save()
      context.globalAlpha = particle.alpha
      context.translate(particle.x, particle.y)
      context.rotate(particle.rotation)
      context.fillStyle = particle.color
      context.fillRect(-particle.size / 2, -particle.length / 2, particle.size, particle.length)
      context.restore()
    }

    function animate(now: number) {
      if (start === 0) {
        start = now
        last = now
      }
      const elapsed = now - start
      const delta = Math.min(32, now - last) / 16.67
      last = now
      const fade = Math.max(0, 1 - Math.max(0, elapsed - DURATION_MS * 0.68) / (DURATION_MS * 0.32))

      context.clearRect(0, 0, width, height)
      for (const particle of particles) {
        particle.vx *= particle.drag
        particle.vy = particle.vy * particle.drag + particle.gravity * delta
        particle.x += particle.vx * delta
        particle.y += particle.vy * delta
        particle.rotation += particle.spin * delta
        particle.alpha = fade
        drawPiece(particle)
      }

      if (elapsed < DURATION_MS) {
        animationFrame = requestAnimationFrame(animate)
      } else {
        context.clearRect(0, 0, width, height)
        setActive(false)
      }
    }

    resize()
    particles = createParticles(width, height)
    window.addEventListener('resize', resize)
    animationFrame = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  if (!active) return null

  return <canvas ref={canvasRef} className="ws-confetti" aria-hidden="true" />
}
