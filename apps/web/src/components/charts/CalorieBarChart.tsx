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
import { useChartColors } from '@/hooks/useChartColors'

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
  const c = useChartColors()

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Brak danych o kaloriach
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }} barCategoryGap="30%">
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={c.grid}
          strokeOpacity={0.6}
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 10, fill: c.axis }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: c.axis }}
          axisLine={false}
          tickLine={false}
          width={42}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip
          contentStyle={{
            background: c.tooltip.background,
            border: `1px solid ${c.tooltip.border}`,
            borderRadius: '10px',
            padding: '8px 12px',
            fontSize: '12px',
            color: c.tooltip.text,
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }}
          labelStyle={{ color: c.axis, marginBottom: '2px' }}
          formatter={(v: number) => [`${Math.round(v)} kcal`, 'Kalorie']}
          labelFormatter={formatDate}
          cursor={{ fill: c.grid, fillOpacity: 0.3 }}
        />
        {targetCalories && (
          <ReferenceLine
            y={targetCalories}
            stroke={c.primary}
            strokeDasharray="4 4"
            label={{
              value: `Cel: ${targetCalories}`,
              position: 'insideTopRight',
              fontSize: 10,
              fill: c.primary,
            }}
          />
        )}
        <Bar
          dataKey="value"
          fill={c.primary}
          fillOpacity={0.82}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
