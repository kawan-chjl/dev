// Pill — tracked-out status label / balance pill (design-system.md §6)
import type { HTMLAttributes } from 'react'

interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'sage'
}

export function Pill({ variant = 'default', className = '', children, ...rest }: PillProps) {
  const cls = ['pill', `pill-${variant}`, className].filter(Boolean).join(' ')
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  )
}
