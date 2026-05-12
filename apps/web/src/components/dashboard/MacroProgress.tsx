// MacroProgress — protein/carbs/fat progress bars for today's log
// Server component — no 'use client'

import { cn } from '@/lib/utils'
import type { MacroSnapshot } from '@/lib/services/dashboard'

type MacroProgressProps = {
  nutrition: MacroSnapshot | null
  className?: string
}

type MacroBarProps = {
  label: string
  consumed: number
  target: number
  percent: number
  color: string
  unit?: string
}

function MacroBar({ label, consumed, target, percent, color, unit = 'g' }: MacroBarProps) {
  const clamped = Math.min(100, percent)
  const over = percent > 100

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          <span className={cn('font-semibold', over && 'text-orange-500')}>
            {Math.round(consumed)}
          </span>
          {' / '}{Math.round(target)}{unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color, over && 'opacity-70')}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

export function MacroProgress({ nutrition, className }: MacroProgressProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 space-y-4', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Makroskładniki dziś
        </span>
        {nutrition && (
          <span className="text-xs text-muted-foreground">
            {Math.round(nutrition.calories.consumed)} / {Math.round(nutrition.calories.target)} kcal
          </span>
        )}
      </div>

      {nutrition ? (
        <div className="space-y-3">
          {/* Calorie progress */}
          <MacroBar
            label="Kalorie"
            consumed={nutrition.calories.consumed}
            target={nutrition.calories.target}
            percent={nutrition.calories.percent}
            color="bg-primary"
            unit=" kcal"
          />
          {/* Protein */}
          <MacroBar
            label="Białko"
            consumed={nutrition.protein.consumed}
            target={nutrition.protein.target}
            percent={nutrition.protein.percent}
            color="bg-blue-500"
          />
          {/* Carbs */}
          <MacroBar
            label="Węglowodany"
            consumed={nutrition.carbs.consumed}
            target={nutrition.carbs.target}
            percent={nutrition.carbs.percent}
            color="bg-amber-400"
          />
          {/* Fat */}
          <MacroBar
            label="Tłuszcze"
            consumed={nutrition.fat.consumed}
            target={nutrition.fat.target}
            percent={nutrition.fat.percent}
            color="bg-rose-400"
          />
        </div>
      ) : (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Brak danych żywieniowych na dziś
        </div>
      )}
    </div>
  )
}
