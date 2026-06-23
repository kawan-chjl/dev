// Card primitive — design.md §7: --surface, xl radius, hairline border, soft warm shadow
import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  selected?: boolean
}

export function Card({ selected = false, className = '', children, ...rest }: CardProps) {
  const cls = ['card', selected ? 'card-selected' : '', className].filter(Boolean).join(' ')
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  )
}
