// ConfidenceBreakdown — ETAP 5.5
// Visual multi-dimensional confidence display.
// Shows per-dimension scores: nutrition, recovery, training.
// WHOOP/Oura-style — data-centric, minimal, premium.

import { cn } from '@/lib/utils'

type ConfidenceBreakdownProps = {
  overall: number
  nutritionConfidence?: number | null
  trainingConfidence?: number | null
  recoveryConfidence?: number | null
  dataCompleteness?: number | null
  className?: string
  compact?: boolean
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium tabular-nums">{pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-border overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function overallColor(score: number): string {
  if (score >= 0.75) return 'bg-green-500'
  if (score >= 0.45) return 'bg-yellow-500'
  return 'bg-red-400'
}

function dimensionColor(score: number): string {
  if (score >= 0.7) return 'bg-green-400'
  if (score >= 0.4) return 'bg-yellow-400'
  return 'bg-red-400'
}

function overallLabel(score: number): string {
  if (score >= 0.75) return 'Wysoka'
  if (score >= 0.45) return 'Średnia'
  return 'Niska'
}

export function ConfidenceBreakdown({
  overall,
  nutritionConfidence,
  trainingConfidence,
  recoveryConfidence,
  dataCompleteness,
  className,
  compact = false,
}: ConfidenceBreakdownProps) {
  const pct = Math.round(overall * 100)

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', overallColor(overall))} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5', className)}>
      {/* Overall */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">Pewność AI</span>
        <span className={cn('text-xs font-semibold tabular-nums', pct >= 75 ? 'text-green-600 dark:text-green-400' : pct >= 45 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500')}>
          {overallLabel(overall)} · {pct}%
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', overallColor(overall))} style={{ width: `${pct}%` }} />
      </div>

      {/* Dimensions */}
      {(nutritionConfidence != null || trainingConfidence != null || recoveryConfidence != null) && (
        <div className="space-y-2 pt-1 border-t border-border">
          {nutritionConfidence != null && (
            <Bar label="Żywienie" value={nutritionConfidence} color={dimensionColor(nutritionConfidence)} />
          )}
          {recoveryConfidence != null && (
            <Bar label="Regeneracja" value={recoveryConfidence} color={dimensionColor(recoveryConfidence)} />
          )}
          {trainingConfidence != null && (
            <Bar label="Trening" value={trainingConfidence} color={dimensionColor(trainingConfidence)} />
          )}
          {dataCompleteness != null && (
            <Bar label="Kompletność danych" value={dataCompleteness} color={dimensionColor(dataCompleteness)} />
          )}
        </div>
      )}
    </div>
  )
}
