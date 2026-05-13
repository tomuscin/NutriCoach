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
import { useChartColors } from '@/hooks/useChartColors'

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
  const c = useChartColors()

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
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
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
          domain={[minVal, maxVal]}
          tick={{ fontSize: 10, fill: c.axis }}
          axisLine={false}
          tickLine={false}
          width={36}
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
          formatter={(v: number) => [`${(v as number).toFixed(1)} kg`, 'Waga']}
          labelFormatter={formatDate}
          cursor={{ stroke: c.grid, strokeWidth: 1 }}
        />
        {targetWeightKg && (
          <ReferenceLine
            y={targetWeightKg}
            stroke={c.reference}
            strokeDasharray="4 4"
            label={{
              value: `Cel: ${targetWeightKg} kg`,
              position: 'insideTopRight',
              fontSize: 10,
              fill: c.reference,
            }}
          />
        )}
        <Line
          type="monotone"
          dataKey="weightKg"
          stroke={c.primary}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: c.primary, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
