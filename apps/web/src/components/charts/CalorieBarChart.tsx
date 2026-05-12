'use client'

// CalorieBarChart — 14-day calorie intake vs target bar chart
// Client component

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'

type TrendPoint = { date: string; value: number }

type CalorieBarChartProps = {
  data: TrendPoint[]
  targetCalories?: number | null
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

export function CalorieBarChart({ data, targetCalories }: CalorieBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Brak danych o kaloriach
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
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
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          width={42}
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
          formatter={(v: number) => [`${Math.round(v)} kcal`, 'Kalorie']}
          labelFormatter={formatDate}
        />
        {targetCalories && (
          <ReferenceLine
            y={targetCalories}
            stroke="hsl(var(--primary))"
            strokeDasharray="4 4"
            label={{
              value: `Cel: ${targetCalories}`,
              position: 'insideTopRight',
              fontSize: 10,
              fill: 'hsl(var(--primary))',
            }}
          />
        )}
        <Bar
          dataKey="value"
          fill="hsl(191, 85%, 33%)"
          opacity={0.8}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
