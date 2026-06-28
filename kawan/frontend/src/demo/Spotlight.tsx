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
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!active || currentStep < 0 || !effectiveTarget) {
      setRect(null)
      return
    }

    const selector = effectiveTarget

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
    }

    updateRect()
    const timeoutId = window.setTimeout(updateRect, ROUTE_RENDER_DELAY_MS)
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)

    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [active, currentStep, effectiveTarget])

  if (!active) return null

  const nextButton =
    showNext && onNext ? (
      <button type="button" className="demo-spotlight-next" onClick={onNext}>
        Next
      </button>
    ) : null

  if (rect) {
    const belowTarget = rect.bottom + 96 < window.innerHeight
    const tooltipStyle: CSSProperties = {
      top: belowTarget ? rect.bottom + 14 : Math.max(96, rect.top - 14),
      left: Math.min(Math.max(rect.left + rect.width / 2, TOOLTIP_HALF), window.innerWidth - TOOLTIP_HALF),
      transform: belowTarget ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'
    }

    return (
      <>
        <div
          className="demo-spotlight-ring"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
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
