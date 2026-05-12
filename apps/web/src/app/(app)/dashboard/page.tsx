// Dashboard — Daily Coaching Feed
// ETAP 6: Feed-first experience. Mobile: coaching feed. Desktop: feed + analytics.
// Server Component — all data fetched server-side.

import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { requireOnboarded } from '@/lib/auth'
import { getCoachingFeed } from '@/lib/services/coaching-feed'
import { getDashboardData } from '@/lib/services/dashboard'
import { ReadinessRing } from '@/components/feed/ReadinessRing'
import { DailyScoreCard } from '@/components/feed/DailyScoreCard'
import { FeedInsightCard } from '@/components/feed/FeedInsightCard'
import { GenerateInsightButton } from '@/components/feed/GenerateInsightButton'
import { TargetsRow } from '@/components/feed/MacroRing'
import { MacroProgress } from '@/components/dashboard/MacroProgress'
import { TrainingLoadCard } from '@/components/dashboard/TrainingLoadCard'
import { RecoveryCard } from '@/components/dashboard/RecoveryCard'
import {
  WeightChartClient,
  CalorieBarChartClient,
} from '@/components/charts/DashboardCharts'
import { Upload, BarChart2, AlertTriangle, CheckCircle2, Zap } from 'lucide-react'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await requireOnboarded()

  const [feed, analytics] = await Promise.all([
    getCoachingFeed(user.id),
    getDashboardData(user.id),
  ])

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Dzień dobry' : hour < 18 ? 'Cześć' : 'Dobry wieczór'

  const hasInsight = {
    morning: !!feed.morning.insight,
    midday: !!feed.midday.insight,
    evening: !!feed.evening.insight,
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-6">

      {/* Header */}
      <div className="flex items-start justify-between pt-2">
        <div>
          <h1 className="text-lg font-bold text-foreground">
            {greeting}{user.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('pl-PL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
        <Link
          href="/dashboard/import"
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
        >
          <Upload className="h-3.5 w-3.5" />
          Import
        </Link>
      </div>

      {/* Morning Block */}
      <section className="space-y-3">
        <SectionLabel emoji="\u{1F305}" label="Poranek" />
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-4">
            {feed.morning.readiness ? (
              <ReadinessRing
                score={feed.morning.readiness.score}
                level={feed.morning.readiness.level}
                confidence={feed.morning.readiness.confidence}
                size="md"
              />
            ) : (
              <div className="flex flex-col items-center gap-1 w-[110px]">
                <div className="w-[110px] h-[110px] rounded-full border-[9px] border-border flex items-center justify-center">
                  <span className="text-2xl font-bold text-muted-foreground">-</span>
                </div>
                <span className="text-xs text-muted-foreground">gotowość</span>
              </div>
            )}
            <div className="flex-1 space-y-2 min-w-0">
              {feed.morning.readiness ? (
                <>
                  {feed.morning.readiness.drivers.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      <span className="text-xs text-foreground">{d}</span>
                    </div>
                  ))}
                  {feed.morning.readiness.warnings.map((w, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                      <span className="text-xs text-muted-foreground">{w}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 pt-1">
                    <Zap className="h-3 w-3 text-blue-400 shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      Zalecany TSS: {feed.morning.readiness.recommendedTrainingLoad}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Brak danych do oceny gotowości. Dodaj dane snu i regeneracji.</p>
              )}
            </div>
          </div>
        </div>
        <TargetsRow
          kcal={feed.morning.targets.kcal}
          proteinG={feed.morning.targets.proteinG}
          carbsG={feed.morning.targets.carbsG}
          fatG={feed.morning.targets.fatG}
        />
        {feed.morning.insight && (
          <FeedInsightCard
            id={feed.morning.insight.id}
            content={feed.morning.insight.content}
            confidence={feed.morning.insight.confidence}
            type="morning"
            createdAt={feed.morning.insight.createdAt}
          />
        )}
      </section>

      {/* Midday Block */}
      <section className="space-y-3">
        <SectionLabel emoji="\u2600\uFE0F" label="Postęp dnia" />
        {feed.midday.adherence && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <ProgressItem label="Kalorie" consumed={feed.midday.adherence.kcalConsumed} target={feed.midday.adherence.kcalTarget} unit="kcal" percent={feed.midday.adherence.kcalPercent} color="#f59e0b" />
              <ProgressItem label="Białko" consumed={feed.midday.adherence.proteinConsumed} target={feed.midday.adherence.proteinTarget} unit="g" percent={feed.midday.adherence.proteinTarget && feed.midday.adherence.proteinTarget > 0 ? Math.round((feed.midday.adherence.proteinConsumed / feed.midday.adherence.proteinTarget) * 100) : null} color="#3b82f6" />
            </div>
            {feed.midday.adherence.workoutDone && (
              <div className="flex items-center gap-2 text-xs text-green-500"><CheckCircle2 className="h-3.5 w-3.5" />Trening zaliczony</div>
            )}
            {feed.midday.warnings.map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-amber-500"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{w}</div>
            ))}
          </div>
        )}
        {feed.midday.insight && (
          <FeedInsightCard id={feed.midday.insight.id} content={feed.midday.insight.content} confidence={feed.midday.insight.confidence} type="midday" createdAt={feed.midday.insight.createdAt} />
        )}
      </section>

      {/* Evening Block */}
      {(feed.evening.daySummary || feed.evening.insight) && (
        <section className="space-y-3">
          <SectionLabel emoji="\u{1F319}" label="Podsumowanie" />
          {feed.evening.daySummary && (
            <DailyScoreCard
              overallScore={feed.evening.daySummary.overallScore}
              performanceScore={feed.evening.daySummary.performanceScore}
              recoveryScore={feed.evening.daySummary.recoveryScore}
              consistencyScore={feed.evening.daySummary.consistencyScore}
              nutritionScore={feed.evening.daySummary.nutritionScore}
            />
          )}
          {feed.evening.adherence && (
            <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">🔥</span>
                <span className="text-sm font-medium">Seria {feed.evening.adherence.streakDays} {feed.evening.adherence.streakDays === 1 ? 'dzień' : 'dni'}</span>
              </div>
              {feed.evening.adherence.kcalAdherence !== null && (
                <span className="text-xs text-muted-foreground">Kcal: {Math.round((feed.evening.adherence.kcalAdherence ?? 0) * 100)}%</span>
              )}
            </div>
          )}
          {feed.evening.insight && (
            <FeedInsightCard id={feed.evening.insight.id} content={feed.evening.insight.content} confidence={feed.evening.insight.confidence} type="evening" createdAt={feed.evening.insight.createdAt} />
          )}
        </section>
      )}

      {/* Generate AI Insight */}
      <Suspense fallback={null}>
        <GenerateInsightButton hasInsight={hasInsight} />
      </Suspense>

      {/* Analytics Section */}
      <section className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <SectionLabel emoji="\u{1F4CA}" label="Analityka" />
          <Link href="/analytics" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <BarChart2 className="h-3.5 w-3.5" />
            Pełna analityka
          </Link>
        </div>
        <MacroProgress nutrition={analytics.todayNutrition} />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <TrainingLoadCard training={analytics.training} />
          <RecoveryCard recovery={analytics.recovery} />
        </div>
        {analytics.weightHistory30d.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Waga — 30 dni</p>
            <div className="h-[160px]"><WeightChartClient data={analytics.weightHistory30d} /></div>
          </div>
        )}
        {analytics.calorieHistory14d.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Kalorie — 14 dni</p>
            <div className="h-[140px]">
              <CalorieBarChartClient data={analytics.calorieHistory14d} targetCalories={analytics.calorieTarget ?? undefined} />
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function SectionLabel({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{emoji}</span>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</h2>
    </div>
  )
}

function ProgressItem({ label, consumed, target, unit, percent, color }: { label: string; consumed: number; target: number | null; unit: string; percent: number | null; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium">{Math.round(consumed)}{unit}{target ? ` / ${Math.round(target)}${unit}` : ''}</span>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, percent ?? 0)}%`, backgroundColor: color }} />
      </div>
      {percent !== null && <span className="text-[10px] text-muted-foreground">{percent}% celu</span>}
    </div>
  )
}
