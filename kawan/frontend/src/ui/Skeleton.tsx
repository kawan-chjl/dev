import type { CSSProperties } from 'react'

type SkeletonVariant = 'text' | 'block' | 'circle'

interface SkeletonProps {
  width?: number | string
  height?: number | string
  radius?: number | string
  variant?: SkeletonVariant
  count?: number
  className?: string
}

function toCssSize(value: number | string | undefined): string | undefined {
  if (value === undefined) return undefined
  return typeof value === 'number' ? `${value}px` : value
}

function SkeletonLine({ width, height, radius, variant, className }: Omit<SkeletonProps, 'count'>) {
  const style: CSSProperties = {
    width: toCssSize(width),
    height: toCssSize(height),
    borderRadius: toCssSize(radius)
  }
  const cls = ['skeleton', `skeleton-${variant}`, className].filter(Boolean).join(' ')

  return <span className={cls} style={style} aria-hidden="true" />
}

export function Skeleton({
  width = '100%',
  height,
  radius,
  variant = 'block',
  count = 1,
  className = ''
}: SkeletonProps) {
  const resolvedHeight = height ?? (variant === 'text' ? '1em' : undefined)
  const resolvedRadius = radius ?? (variant === 'circle' ? '50%' : undefined)

  if (count <= 1) {
    return (
      <SkeletonLine
        width={width}
        height={resolvedHeight}
        radius={resolvedRadius}
        variant={variant}
        className={className}
      />
    )
  }

  return (
    <span className="skeleton-stack" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonLine
          // biome-ignore lint/suspicious/noArrayIndexKey: repeated decorative skeleton lines are static
          key={index}
          width={index === count - 1 && width === '100%' ? '72%' : width}
          height={resolvedHeight}
          radius={resolvedRadius}
          variant={variant}
          className={className}
        />
      ))}
    </span>
  )
}
