// Dashboard Page — ETAP 4: Data Display Runtime Layer
// Server Component — all data fetched server-side
// Charts loaded client-side via dynamic import (SSR-safe)

import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { requireOnboarded } from '@/lib/auth'
import { getDashboardData } from '@/lib/services/dashboard'
import { StatCard } from '@/components/dashboard/StatCard'
import { MacroProgress } from '@/components/dashboard/MacroProgress'
import { TrainingLoadCard } from '@/components/dashboard/TrainingLoadCard'
import { RecoveryCard } from '@/components/dashboard/RecoveryCard'
import { AIInsightCard } from '@/components/dashboard/AIInsightCard'
import {
  StatsSectionSkeleton,
  NutritionSectionSkeleton,
  WeightSectionSkeleton,
  TrainingSectionSkeleton,
} from '@/components/dashboard/skeletons'
import {
  WeightChartClient,
  CalorieBarChartClient,
} from '@/components/charts/DashboardCharts'
import { Scale, Flame, Beef, Target, Upload, RefreshCw } from 'lucide-react'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const user = await requireOnboarded()
  const data = await getDashboardData(user.id)

  const weightTrendDirection =
    data.weightTrend7d === null
      ? 'neutral'
      : data.weightTrend7d < 0
      ? 'down'
      : data.weightTrend7d > 0
      ? 'up'
      : 'neutral'

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            Dzień dobry{user.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString('pl-PL', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <Link
          href="/dashboard/import"
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
        >
          <Upload className="h-3.5 w-3.5" />
          Importuj Excel
        </Link>
      </div>

      {/* ── Top Stats Row ────────────────────────────────────────────────── */}
      <Suspense fallback={<StatsSectionSkeleton />}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Waga"
            value={data.currentWeightKg !== null ? data.currentWeightKg.toFixed(1) : null}
            unit="kg"
            trend={
              data.weightTrend7d !== null
                ? {
                    value: data.weightTrend7d,
                    direction: weightTrendDirection,
                    label: '7d',
                    positive: 'down',
                  }
                : undefined
            }
            icon={<Scale className="h-4 w-4" />}
          />
          <StatCard
            label="Kalorie dziś"
            value={
              data.todayNutrition
                ? Math.round(data.todayNutrition.calories.consumed)
                : null
            }
            unit="kcal"
            subLabel={
              data.calorieTarget
                ? `cel: ${Math.round(data.calorieTarget)} kcal`
                : undefined
            }
            icon={<Flame className="h-4 w-4" />}
          />
          <StatCard
            label="Białko dziś"
            value={
              data.todayNutrition
                ? Math.round(data.todayNutrition.protein.consumed)
                : null
            }
            unit="g"
            subLabel={
              data.todayNutrition
                ? `${Math.round(data.todayNutrition.protein.percent)}% celu`
                : undefined
            }
            icon={<Beef className="h-4 w-4" />}
          />
          <StatCard
            label="Streak"
            value={data.streakDays > 0 ? data.streakDays : null}
            unit={data.streakDays === 1 ? 'dzień' : 'dni'}
            subLabel={
              data.complianceRate7d !== null
                ? `${data.complianceRate7d}% compliance 7d`
                : undefined
            }
            icon={<Target className="h-4 w-4" />}
          />
        </div>
      </Suspense>

      {/* ── Nutrition + Calories Chart ───────────────────────────────────── */}
      <section>
        <SectionTitle>Odżywianie</SectionTitle>
        <Suspense fallback={<NutritionSectionSkeleton />}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <MacroProgress nutrition={data.todayNutrition} />
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Kalorie — 14 dni
                </span>
                {data.avgCalories7d && (
                  <span className="text-xs text-muted-foreground">
                    śr. 7d: {data.avgCalories7d} kcal
                  </span>
                )}
              </div>
              <div className="h-[160px]">
                <CalorieBarChartClient
                  data={data.calorieHistory14d}
                  targetCalories={data.calorieTarget ?? undefined}
                />
              </div>
            </div>
          </div>
        </Suspense>
      </section>

      {/* ── Weight Chart ─────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Waga — 30 dni</SectionTitle>
        <Suspense fallback={<WeightSectionSkeleton />}>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="h-[180px] sm:h-[220px]">
              <WeightChartClient data={data.weightHistory30d} />
            </div>
          </div>
        </Suspense>
      </section>

      {/* ── Training + Recovery ──────────────────────────────────────────── */}
      <section>
        <SectionTitle>Trening i regeneracja</SectionTitle>
        <Suspense fallback={<TrainingSectionSkeleton />}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TrainingLoadCard training={data.training} />
            <RecoveryCard recovery={data.recovery} />
          </div>
        </Suspense>
      </section>

      {/* ── AI Coach ─────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>AI Coach</SectionTitle>
        <AIInsightCard insight={data.lastInsight} />
      </section>

      {/* ── Footer meta ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
        <span>
          Dane z:{' '}
          {new Date(data.queriedAt).toLocaleTimeString('pl-PL', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Odśwież
        </Link>
      </div>
    </div>
  )
}

// ─── Section title ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
      {children}
    </h2>
  )
}
