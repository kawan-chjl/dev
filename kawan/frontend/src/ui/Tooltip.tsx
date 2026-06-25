// Tooltip — info icon (lucide Info) + hover/focus popover.
// Accessible: role="tooltip", aria-describedby linking trigger to content.
// Keyboard: Escape dismisses when focused. Hover or focus shows the popover.
// Positioned above the trigger by default. Pure CSS, no external deps.

import { Info } from 'lucide-react'
import { useId, useState } from 'react'

interface TooltipProps {
  text: string
  size?: number
}

export function Tooltip({ text, size = 14 }: TooltipProps) {
  const id = useId()
  const [visible, setVisible] = useState(false)

  return (
    <span className="kawan-tooltip-wrap">
      <button
        type="button"
        className="kawan-tooltip-trigger"
        aria-label="More information"
        aria-describedby={visible ? id : undefined}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setVisible(false)
        }}
        tabIndex={0}
      >
        <Info size={size} aria-hidden="true" />
      </button>
      {visible && (
        <span id={id} role="tooltip" className="kawan-tooltip-popover">
          {text}
        </span>
      )}
    </span>
  )
}
