import { type CSSProperties, useEffect, useState } from 'react'
import { useDemoTour } from './DemoTour'

const ROUTE_RENDER_DELAY_MS = 80
// Half the tooltip's max width (~320px) plus a margin, so the tooltip never overflows the edge.
const TOOLTIP_HALF = 176

export function Spotlight() {
  const { active, currentStep, steps, override } = useDemoTour()
  const step = active && currentStep >= 0 ? steps[currentStep] : undefined
  // A workspace override (event-based sub-tour) takes precedence over the step default.
  const effectiveTarget = override ? override.target : step?.target
  const effectiveHint = override ? override.hintText : step?.hintText
  const showNext = override?.showNext ?? false
  const onNext = override?.onNext
  const placement = override?.placement
  const [rect, setRect] = useState<DOMRect | null>(null)
  // Match the highlighted element's own corner radius so the ring hugs rounded/pill components
  // instead of drawing a boxy rectangle around them.
  const [radius, setRadius] = useState<string | null>(null)

  useEffect(() => {
    if (!active || currentStep < 0 || !effectiveTarget) {
      setRect(null)
      return
    }

    const selector = effectiveTarget
    let observed: Element | null = null
    // Follow the target's own size changes (e.g. an island expanding/collapsing) so the ring
    // and the tooltip reposition to the new shape, not just on resize/scroll.
    const ro = new ResizeObserver(() => updateRect())

    function updateRect() {
      const element = document.querySelector(selector)
      if (!element) {
        setRect(null)
        return
      }

      const nextRect = element.getBoundingClientRect()
      if (nextRect.width <= 0 || nextRect.height <= 0) {
        setRect(null)
        return
      }

      setRect(nextRect)
      setRadius(window.getComputedStyle(element).borderRadius || null)
      if (observed !== element) {
        if (observed) ro.unobserve(observed)
        ro.observe(element)
        observed = element
      }
    }

    updateRect()
    const timeoutId = window.setTimeout(updateRect, ROUTE_RENDER_DELAY_MS)
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)

    return () => {
      ro.disconnect()
      window.clearTimeout(timeoutId)
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [active, currentStep, effectiveTarget])

  if (!active) return null

  const nextButton =
    showNext && onNext ? (
      <button type="button" className="demo-spotlight-next" onClick={onNext}>
        {override?.nextLabel ?? 'Next'}
      </button>
    ) : null

  if (rect) {
    const belowTarget = rect.bottom + 96 < window.innerHeight
    const tooltipStyle: CSSProperties =
      placement === 'left'
        ? {
            top: Math.min(Math.max(rect.top + rect.height / 2, 96), window.innerHeight - 96),
            right: Math.max(window.innerWidth - rect.left + 14, 12),
            transform: 'translateY(-50%)'
          }
        : {
            top: belowTarget ? rect.bottom + 14 : Math.max(96, rect.top - 14),
            left: Math.min(Math.max(rect.left + rect.width / 2, TOOLTIP_HALF), window.innerWidth - TOOLTIP_HALF),
            transform: belowTarget ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'
          }

    return (
      <>
        <div
          className="demo-spotlight-ring"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderRadius: radius ?? undefined
          }}
          aria-hidden="true"
        />
        {effectiveHint && (
          <div
            className={`demo-spotlight-tooltip${nextButton ? ' demo-spotlight-tooltip--interactive' : ''}`}
            style={tooltipStyle}
          >
            <span>{effectiveHint}</span>
            {nextButton}
          </div>
        )}
      </>
    )
  }

  if (!effectiveHint) return null

  // No target (or not found yet): a centered hint banner under the step bar, optionally with Next.
  return (
    <div className={`demo-spotlight-fallback${nextButton ? ' demo-spotlight-fallback--interactive' : ''}`}>
      <span>{effectiveHint}</span>
      {nextButton}
    </div>
  )
}
