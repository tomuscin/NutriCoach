// RecoveryCard — HRV, sleep, resting HR, readiness score
// Server component — no 'use client'

import { cn } from '@/lib/utils'
import type { RecoverySnapshot } from '@/lib/services/dashboard'
import { Moon, Heart, Activity, Zap } from 'lucide-react'

type RecoveryCardProps = {
  recovery: RecoverySnapshot
  className?: string
}

function formatSleep(minutes: number | null): string {
  if (minutes === null) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function getReadinessColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground'
  if (score >= 80) return 'text-emerald-500'
  if (score >= 60) return 'text-amber-500'
  return 'text-red-500'
}

type MetricRowProps = {
  icon: React.ReactNode
  label: string
  value: string
  subValue?: string
}

function MetricRow({ icon, label, value, subValue }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-right">
        <span className="text-sm font-semibold text-foreground">{value}</span>
        {subValue && (
          <span className="text-xs text-muted-foreground ml-1.5">{subValue}</span>
        )}
      </div>
    </div>
  )
}

export function RecoveryCard({ recovery, className }: RecoveryCardProps) {
  const noData =
    recovery.latestHRV === null &&
    recovery.latestSleepTotalMinutes === null &&
    recovery.latestRestingHR === null

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Regeneracja
        </span>
        {recovery.latestReadinessScore !== null && (
          <span className={cn(
            'text-lg font-bold',
            getReadinessColor(recovery.latestReadinessScore),
          )}>
            {Math.round(recovery.latestReadinessScore)}
            <span className="text-xs font-normal text-muted-foreground">/100</span>
          </span>
        )}
      </div>

      {noData ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Brak danych regeneracji
        </div>
      ) : (
        <div>
          <MetricRow
            icon={<Moon className="h-3.5 w-3.5" />}
            label="Sen"
            value={formatSleep(recovery.latestSleepTotalMinutes)}
            subValue={recovery.avgSleep7d ? `śr. ${formatSleep(recovery.avgSleep7d)}/7d` : undefined}
          />
          <MetricRow
            icon={<Zap className="h-3.5 w-3.5" />}
            label="HRV"
            value={recovery.latestHRV !== null ? `${Math.round(recovery.latestHRV)} ms` : '—'}
            subValue={recovery.avgHRV7d ? `śr. ${Math.round(recovery.avgHRV7d)} ms/7d` : undefined}
          />
          <MetricRow
            icon={<Heart className="h-3.5 w-3.5" />}
            label="Tętno spoczynkowe"
            value={recovery.latestRestingHR !== null ? `${Math.round(recovery.latestRestingHR)} bpm` : '—'}
          />
          {recovery.latestReadinessScore !== null && (
            <MetricRow
              icon={<Activity className="h-3.5 w-3.5" />}
              label="Gotowość"
              value={`${Math.round(recovery.latestReadinessScore)}%`}
            />
          )}
        </div>
      )}
    </div>
  )
}
