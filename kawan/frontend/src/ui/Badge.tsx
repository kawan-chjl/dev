// Badge primitive — small inline label (e.g. TEE badge, status pill)
import type { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'sage' | 'muted'
}

export function Badge({ variant = 'default', className = '', children, ...rest }: BadgeProps) {
  const cls = ['badge', `badge-${variant}`, className].filter(Boolean).join(' ')
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  )
}
