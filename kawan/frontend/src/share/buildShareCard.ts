// buildShareCard.ts: renders a win-receipt PNG via native Canvas 2D (OQ-A9-RENDER decision).
// No new npm dependency. Same-origin art only, so canvas never taints.
// Token hex values are hardcoded from tokens.css (canvas cannot read CSS vars).

export interface ShareCardInput {
  personaName: string // e.g. "Kawan"
  portraitSrc: string // same-origin URL
  sentence: {
    action: string
    deliverable: string
    deadlineLabel: string
  }
  dateLabel: string // formatted win date, e.g. "23 Jun 2026"
}

// Card size: 1200x630 (OG / Twitter summary-large-image ratio, OQ-A9-SIZE decision).
const W = 1200
const H = 630

// Token hex values (from tokens.css -- update here if tokens change)
const COLOR_SURFACE = '#fbf4e8' // --surface
const COLOR_INK = '#3a2a1e' // --ink
const COLOR_INK_SOFT = '#6e5849' // --ink-soft
const COLOR_ACCENT = '#dd6236' // --accent
const COLOR_ACCENT_TINT = '#f8e1d2' // --accent-tint
const COLOR_SAGE_DEEP = '#7c8a5a' // --sage-deep
const COLOR_SAGE_TINT = '#e7ecda' // --sage-tint
const COLOR_LINE = '#e0d0bb' // --line

/** Load an image by URL, awaiting decode. Returns null on error so the caller can draw a fallback. */
async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/**
 * Word-wrap text to a maximum pixel width, returning an array of lines.
 * Uses measureText to break at word boundaries.
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

/**
 * Draw an initial-block fallback when the portrait image fails to load.
 * Mirrors the PersonaPicker.tsx fallback pattern (a coloured block with a glyph initial).
 */
function drawInitialFallback(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, initial: string) {
  ctx.save()
  ctx.fillStyle = COLOR_ACCENT_TINT
  ctx.beginPath()
  ctx.roundRect(x, y, size, size, 16)
  ctx.fill()

  ctx.fillStyle = COLOR_ACCENT
  ctx.font = `bold ${Math.round(size * 0.45)}px Fredoka, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initial.toUpperCase(), x + size / 2, y + size / 2)
  ctx.restore()
}

/**
 * Render a win-receipt PNG and return it as a Blob.
 * Awaits document.fonts.ready so Fredoka and Fraunces are available before drawing.
 * User-triggered only, never called on mount (TR-75).
 */
export async function renderWinCardPng(input: ShareCardInput): Promise<Blob> {
  await document.fonts.ready

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D not available')

  // Background
  ctx.fillStyle = COLOR_SURFACE
  ctx.fillRect(0, 0, W, H)

  // Subtle border
  ctx.strokeStyle = COLOR_LINE
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, W - 2, H - 2)

  // Left column: portrait
  const PORTRAIT_SIZE = 300
  const PORTRAIT_X = 80
  const PORTRAIT_Y = Math.round((H - PORTRAIT_SIZE) / 2)

  const img = await loadImage(input.portraitSrc)
  if (img) {
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(PORTRAIT_X, PORTRAIT_Y, PORTRAIT_SIZE, PORTRAIT_SIZE, 16)
    ctx.clip()
    ctx.drawImage(img, PORTRAIT_X, PORTRAIT_Y, PORTRAIT_SIZE, PORTRAIT_SIZE)
    ctx.restore()
  } else {
    drawInitialFallback(ctx, PORTRAIT_X, PORTRAIT_Y, PORTRAIT_SIZE, input.personaName.charAt(0))
  }

  // Right column: text content
  const TEXT_X = PORTRAIT_X + PORTRAIT_SIZE + 64
  const TEXT_MAX_W = W - TEXT_X - 80
  let textY = PORTRAIT_Y + 24

  // "witnessed by Kawan" wordmark at the top-right of text area
  ctx.font = `500 22px Fredoka, system-ui, sans-serif`
  ctx.fillStyle = COLOR_SAGE_DEEP
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(`witnessed by ${input.personaName}`, TEXT_X, textY)
  textY += 48

  // Commitment sentence (Fraunces, voice font)
  const sentence = `${input.sentence.action} ${input.sentence.deliverable} by ${input.sentence.deadlineLabel}`
  ctx.font = `italic 600 34px Fraunces, Georgia, serif`
  ctx.fillStyle = COLOR_INK
  const lines = wrapText(ctx, sentence, TEXT_MAX_W)
  for (const line of lines) {
    ctx.fillText(line, TEXT_X, textY)
    textY += 48
  }

  textY += 20

  // VERIFIED badge
  const BADGE_PAD_H = 20
  const BADGE_PAD_V = 10
  const BADGE_TEXT = 'VERIFIED ✓'
  ctx.font = `bold 28px Fredoka, system-ui, sans-serif`
  const badgeTextW = ctx.measureText(BADGE_TEXT).width
  const BADGE_W = badgeTextW + BADGE_PAD_H * 2
  const BADGE_H = 44

  ctx.fillStyle = COLOR_SAGE_DEEP
  ctx.beginPath()
  ctx.roundRect(TEXT_X, textY, BADGE_W, BADGE_H, 8)
  ctx.fill()

  ctx.fillStyle = COLOR_SAGE_TINT
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(BADGE_TEXT, TEXT_X + BADGE_PAD_H, textY + BADGE_H / 2 + BADGE_PAD_V / 4)
  textY += BADGE_H + 24

  // Win date
  ctx.font = `500 24px Fredoka, system-ui, sans-serif`
  ctx.fillStyle = COLOR_INK_SOFT
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(input.dateLabel, TEXT_X, textY)

  // Return the canvas as a PNG blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('canvas.toBlob returned null'))
    }, 'image/png')
  })
}
