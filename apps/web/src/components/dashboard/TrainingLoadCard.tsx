// TrainingLoadCard — CTL/ATL/TSB display with status indicator
// Server component — no 'use client'

import { cn } from '@/lib/utils'
import type { TrainingSnapshot } from '@/lib/services/dashboard'
import { Activity, Dumbbell } from 'lucide-react'

type TrainingLoadCardProps = {
  training: TrainingSnapshot
  className?: string
}

function LoadPill({ label, value, color, description }: {
  label: string
  value: number | null
  color: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className={cn('text-xl font-bold', value === null && 'text-muted-foreground')}>
        {value !== null ? Math.round(value) : '—'}
      </span>
      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', color)}>
        {description}
      </span>
    </div>
  )
}

function getTSBStatus(tsb: number | null): { label: string; color: string } {
  if (tsb === null) return { label: 'brak', color: 'bg-muted text-muted-foreground' }
  if (tsb > 10) return { label: 'Wypoczęty', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' }
  if (tsb >= -10) return { label: 'Optymalny', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' }
  if (tsb >= -30) return { label: 'Zmęczony', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' }
  return { label: 'Przeciążony', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' }
}

export function TrainingLoadCard({ training, className }: TrainingLoadCardProps) {
  const tsbStatus = getTSBStatus(training.tsb)
  const noData = training.ctl === null && training.atl === null

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Obciążenie treningowe
        </span>
        <Activity className="h-4 w-4 text-muted-foreground opacity-60" />
      </div>

      {noData ? (
        <div className="py-4 text-center text-sm text-muted-foreground">
          Brak danych z TrainingPeaks
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            <LoadPill
              label="CTL (Fitness)"
              value={training.ctl}
              color="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
              description="Forma długa"
            />
            <div className="w-px bg-border" />
            <LoadPill
              label="ATL (Fatigue)"
              value={training.atl}
              color="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400"
              description="Zmęczenie"
            />
            <div className="w-px bg-border" />
            <LoadPill
              label="TSB (Form)"
              value={training.tsb}
              color={tsbStatus.color}
              description={tsbStatus.label}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
            <span className="flex items-center gap-1">
              <Dumbbell className="h-3 w-3" />
              {training.workoutsLast7d} treningów / 7d
            </span>
            <span>TSS 7d: {training.totalTssLast7d}</span>
          </div>
        </>
      )}
    </div>
  )
}
