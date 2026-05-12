'use client'

// SparklineChart — minimal inline SVG line chart for trend visualization
// Client component — uses recharts with no SSR

import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  YAxis,
} from 'recharts'

type DataPoint = { date: string; value: number }

type SparklineProps = {
  data: DataPoint[]
  color?: string
  height?: number
  showTooltip?: boolean
  unit?: string
}

export function Sparkline({
  data,
  color = 'hsl(191, 85%, 33%)',
  height = 40,
  showTooltip = false,
  unit = '',
}: SparklineProps) {
  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-xs text-muted-foreground"
        style={{ height }}
      >
        za mało danych
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <YAxis domain={['auto', 'auto']} hide />
        {showTooltip && (
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11px',
            }}
            formatter={(v: number) => [`${v}${unit}`, '']}
            labelFormatter={(label) => label}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={showTooltip ? { r: 3, fill: color } : false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
