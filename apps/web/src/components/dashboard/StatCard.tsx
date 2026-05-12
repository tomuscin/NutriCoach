// StatCard — generic metric card with optional trend indicator
// Server component — no 'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type TrendDirection = 'up' | 'down' | 'neutral'

type TrendConfig = {
  value: number | null    // absolute delta
  direction: TrendDirection
  label?: string          // e.g. "vs 7d avg"
  positive?: TrendDirection  // which direction is "good" (for color)
}

type StatCardProps = {
  label: string
  value: string | number | null
  unit?: string
  subLabel?: string
  trend?: TrendConfig
  icon?: React.ReactNode
  className?: string
  emptyState?: string
}

export function StatCard({
  label,
  value,
  unit,
  subLabel,
  trend,
  icon,
  className,
  emptyState = '—',
}: StatCardProps) {
  const hasValue = value !== null && value !== undefined

  return (
    <div className={cn(
      'rounded-xl border border-border bg-card p-4 flex flex-col gap-2',
      className,
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        {icon && (
          <span className="text-muted-foreground opacity-60">{icon}</span>
        )}
      </div>

      <div className="flex items-end gap-1.5">
        <span className={cn(
          'text-2xl font-bold leading-none',
          !hasValue && 'text-muted-foreground',
        )}>
          {hasValue ? value : emptyState}
        </span>
        {hasValue && unit && (
          <span className="text-sm text-muted-foreground mb-0.5">{unit}</span>
        )}
      </div>

      {(subLabel || trend) && (
        <div className="flex items-center gap-2 mt-auto">
          {trend && trend.value !== null && (
            <TrendBadge trend={trend} />
          )}
          {subLabel && (
            <span className="text-xs text-muted-foreground">{subLabel}</span>
          )}
        </div>
      )}
    </div>
  )
}

function TrendBadge({ trend }: { trend: TrendConfig }) {
  const positive = trend.positive ?? 'up'
  const isGood = trend.direction === positive
  const isNeutral = trend.direction === 'neutral'

  const Icon = trend.direction === 'up'
    ? TrendingUp
    : trend.direction === 'down'
    ? TrendingDown
    : Minus

  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-xs font-medium',
      isNeutral && 'text-muted-foreground',
      !isNeutral && isGood && 'text-emerald-500',
      !isNeutral && !isGood && 'text-red-500',
    )}>
      <Icon className="h-3 w-3" />
      {trend.value !== null && (
        <span>
          {trend.value > 0 ? '+' : ''}{typeof trend.value === 'number'
            ? trend.value.toFixed(1)
            : trend.value}
        </span>
      )}
      {trend.label && (
        <span className="text-muted-foreground font-normal ml-0.5">
          {trend.label}
        </span>
      )}
    </span>
  )
}
