// DailyScoreBar — compact multi-dimension score display
// Shows 4 scores as colored segments

type ScoreBarProps = {
  label: string
  score: number | null
  color: string
}

function MiniScore({ label, score, color }: ScoreBarProps) {
  const pct = score ?? 0
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] text-muted-foreground truncate">{label}</span>
        <span className="text-[11px] font-semibold" style={{ color: pct >= 70 ? color : undefined }}>
          {score !== null ? score : '-'}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

type Props = {
  performanceScore: number | null
  recoveryScore: number | null
  consistencyScore: number | null
  nutritionScore: number | null
  overallScore: number | null
}

export function DailyScoreCard({
  performanceScore,
  recoveryScore,
  consistencyScore,
  nutritionScore,
  overallScore,
}: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Wynik dnia</h3>
        <div className="flex items-center gap-1">
          <span className="text-xl font-bold text-foreground">
            {overallScore !== null ? overallScore : '-'}
          </span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MiniScore label="Wydajność" score={performanceScore} color="#3b82f6" />
        <MiniScore label="Regeneracja" score={recoveryScore} color="#22c55e" />
        <MiniScore label="Konsekwencja" score={consistencyScore} color="#8b5cf6" />
        <MiniScore label="Żywienie" score={nutritionScore} color="#f59e0b" />
      </div>
    </div>
  )
}
