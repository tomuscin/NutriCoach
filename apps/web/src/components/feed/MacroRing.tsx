// MacroRing — compact macro progress for daily feed
type Props = {
  label: string
  consumed: number
  target: number | null
  unit: string
  color: string
}

export function MacroRing({ label, consumed, target, unit, color }: Props) {
  const pct = target && target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg width={56} height={56} viewBox="0 0 56 56" className="-rotate-90">
          <circle cx={28} cy={28} r={22} fill="none" stroke="currentColor" strokeWidth={6} className="text-border" />
          <circle
            cx={28}
            cy={28}
            r={22}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * (2 * Math.PI * 22)} ${2 * Math.PI * 22}`}
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-bold">{pct}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-[11px] font-medium text-foreground">{Math.round(consumed)}{unit}</p>
      </div>
    </div>
  )
}

// TargetsRow — morning targets overview
type TargetsRowProps = {
  kcal: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
}

export function TargetsRow({ kcal, proteinG, carbsG, fatG }: TargetsRowProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-xs font-semibold text-muted-foreground mb-3">Cele na dziś</h3>
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Kcal', value: kcal, unit: '', color: '#f59e0b' },
          { label: 'Białko', value: proteinG, unit: 'g', color: '#3b82f6' },
          { label: 'Węgle', value: carbsG, unit: 'g', color: '#8b5cf6' },
          { label: 'Tłuszcz', value: fatG, unit: 'g', color: '#ef4444' },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <div
              className="text-base font-bold leading-none"
              style={{ color: item.value !== null ? item.color : undefined }}
            >
              {item.value !== null ? Math.round(item.value) : '-'}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {item.label}{item.unit && item.value !== null ? ` ${item.unit}` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
