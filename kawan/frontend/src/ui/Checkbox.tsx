// Checkbox — themed native checkbox wrapper.
// Replaces accent-color styling with a fully custom visual using appearance:none.
// Semantics + keyboard + a11y stay native. Uses a lucide Check SVG drawn via CSS.

import type { InputHTMLAttributes } from 'react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export function Checkbox({ label, className = '', ...props }: CheckboxProps) {
  return (
    <label className={`kawan-checkbox-label${className ? ` ${className}` : ''}`}>
      <input type="checkbox" className="kawan-checkbox" {...props} />
      <span className="kawan-checkbox-box" aria-hidden="true" />
      {label && <span className="kawan-checkbox-text">{label}</span>}
    </label>
  )
}
