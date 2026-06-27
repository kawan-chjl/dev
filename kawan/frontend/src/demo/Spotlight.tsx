import { type CSSProperties, useEffect, useState } from 'react'
import { useDemoTour } from './DemoTour'

const ROUTE_RENDER_DELAY_MS = 80

export function Spotlight() {
  const { active, currentStep, steps } = useDemoTour()
  const step = active && currentStep >= 0 ? steps[currentStep] : undefined
  const target = step?.target
  const hintText = step?.hintText
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!active || currentStep < 0 || !target) {
      setRect(null)
      return
    }

    const selector = target

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
  }, [active, currentStep, target])

  if (!active) return null

  if (rect) {
    const belowTarget = rect.bottom + 88 < window.innerHeight
    const tooltipStyle: CSSProperties = {
      top: belowTarget ? rect.bottom + 14 : Math.max(88, rect.top - 14),
      left: Math.min(Math.max(rect.left + rect.width / 2, 132), window.innerWidth - 132),
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
            height: rect.height
          }}
          aria-hidden="true"
        />
        {hintText && (
          <div className="demo-spotlight-tooltip" style={tooltipStyle}>
            {hintText}
          </div>
        )}
      </>
    )
  }

  if (!hintText) return null

  return <div className="demo-spotlight-fallback">{hintText}</div>
}
