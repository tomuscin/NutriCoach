// ReadinessRing — ETAP 6
// Circular readiness score display, mobile-first, WHOOP-inspired.

type Level = 'low' | 'moderate' | 'high'

const LEVEL_CONFIG: Record<Level, { color: string; label: string; bg: string }> = {
  high: { color: '#22c55e', label: 'Wysoka', bg: 'bg-green-500/10' },
  moderate: { color: '#f59e0b', label: 'Umiarkowana', bg: 'bg-amber-500/10' },
  low: { color: '#ef4444', label: 'Niska', bg: 'bg-red-500/10' },
}

type Props = {
  score: number
  level: Level
  confidence: number
  size?: 'sm' | 'md' | 'lg'
}

export function ReadinessRing({ score, level, confidence, size = 'md' }: Props) {
  const config = LEVEL_CONFIG[level]
  const sizeMap = { sm: 80, md: 110, lg: 140 }
  const dim = sizeMap[size]
  const strokeWidth = size === 'sm' ? 7 : 9
  const radius = (dim - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border"
          />
          {/* Progress arc */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke={config.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-bold leading-none"
            style={{ fontSize: size === 'sm' ? 20 : 28, color: config.color }}
          >
            {score}
          </span>
          {size !== 'sm' && (
            <span className="text-[10px] text-muted-foreground mt-0.5">gotowość</span>
          )}
        </div>
      </div>
      {size !== 'sm' && (
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ color: config.color, backgroundColor: `${config.color}20` }}
          >
            {config.label}
          </span>
          {confidence < 0.5 && (
            <span className="text-[10px] text-muted-foreground">~</span>
          )}
        </div>
      )}
    </div>
  )
}
