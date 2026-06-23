// Chip / badge primitive — design.md §5 rounded-square chips
import type { HTMLAttributes } from 'react'

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'pass' | 'fail' | 'unclear' | 'accent' | 'sage'
}

export function Chip({ variant = 'default', className = '', children, ...rest }: ChipProps) {
  const cls = ['chip', `chip-${variant}`, className].filter(Boolean).join(' ')
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  )
}
