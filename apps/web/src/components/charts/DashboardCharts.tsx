'use client'

// DashboardCharts — client component wrapper for SSR-incompatible recharts
// next/dynamic with ssr: false MUST be in a Client Component

import dynamic from 'next/dynamic'
import type { WeightPoint, TrendPoint } from '@/lib/services/dashboard'

const WeightChartInner = dynamic(
  () => import('./WeightChart').then((m) => m.WeightChart),
  { ssr: false, loading: () => <div className="h-full animate-pulse bg-muted rounded-lg" /> },
)

const CalorieBarChartInner = dynamic(
  () => import('./CalorieBarChart').then((m) => m.CalorieBarChart),
  { ssr: false, loading: () => <div className="h-full animate-pulse bg-muted rounded-lg" /> },
)

export function WeightChartClient({
  data,
  targetWeightKg,
}: {
  data: WeightPoint[]
  targetWeightKg?: number | null
}) {
  return <WeightChartInner data={data} targetWeightKg={targetWeightKg} />
}

export function CalorieBarChartClient({
  data,
  targetCalories,
}: {
  data: TrendPoint[]
  targetCalories?: number | null
}) {
  return <CalorieBarChartInner data={data} targetCalories={targetCalories} />
}
