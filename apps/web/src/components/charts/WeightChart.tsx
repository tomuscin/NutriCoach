'use client'

// WeightChart — 30-day weight trend with goal line
// Client component — dynamic import from dashboard page

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'

type WeightPoint = { date: string; weightKg: number }

type WeightChartProps = {
  data: WeightPoint[]
  targetWeightKg?: number | null
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

export function WeightChart({ data, targetWeightKg }: WeightChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Brak pomiarów wagi
      </div>
    )
  }

  const values = data.map((d) => d.weightKg)
  const minVal = Math.floor(Math.min(...values) - 1)
  const maxVal = Math.ceil(Math.max(...values) + 1)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minVal, maxVal]}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          width={36}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            padding: '6px 10px',
            fontSize: '12px',
          }}
          formatter={(v: number) => [`${v.toFixed(1)} kg`, 'Waga']}
          labelFormatter={formatDate}
        />
        {targetWeightKg && (
          <ReferenceLine
            y={targetWeightKg}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="4 4"
            label={{
              value: `Cel: ${targetWeightKg} kg`,
              position: 'insideTopRight',
              fontSize: 10,
              fill: 'hsl(var(--muted-foreground))',
            }}
          />
        )}
        <Line
          type="monotone"
          dataKey="weightKg"
          stroke="hsl(191, 85%, 33%)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: 'hsl(191, 85%, 33%)' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
