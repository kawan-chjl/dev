// Button primitive — design.md §7 button patterns
// primary: espresso pill (--ink fill, cream text)
// secondary: outline pill (--line border, ink text)
// accent: terracotta pill (single CTA per surface)

import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'accent' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const styles: Record<Variant, string> = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  accent: 'btn btn-accent',
  danger: 'btn btn-danger'
}

export function Button({ variant = 'primary', className = '', type = 'button', children, ...rest }: ButtonProps) {
  return (
    <button type={type} className={`${styles[variant]} ${className}`.trim()} {...rest}>
      {children}
    </button>
  )
}
