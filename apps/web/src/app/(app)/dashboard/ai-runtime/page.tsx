// AI Runtime Dashboard — ETAP 5.5
// Server Component — fetches aggregate AI metrics server-side.
// Shows: confidence trends, feedback rates, missing signals, prompt versions.

import type { Metadata } from 'next'
import { requireOnboarded } from '@/lib/auth'
import { getAIMetrics } from '@/lib/ai/persistence'
import { getRegistrySnapshot } from '@/lib/ai/prompt-registry'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, MessageSquare, AlertTriangle, Layers } from 'lucide-react'

export const metadata: Metadata = { title: 'AI Runtime' }
export const dynamic = 'force-dynamic'

function MetricCard({ label, value, sub, color = 'text-foreground' }: {
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export default async function AIRuntimePage() {
  const user = await requireOnboarded()
  const [metrics, registry] = await Promise.all([
    getAIMetrics(user.id, 30),
    Promise.resolve(getRegistrySnapshot()),
  ])

  const activePrompts = registry.filter((p) => p.active)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Runtime</h1>
          <p className="text-sm text-muted-foreground">Jakość i ewaluacja modelu AI (ostatnie 30 dni)</p>
        </div>
      </div>

      {!metrics ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
          Brak danych. Wygeneruj kilka insightów w AI Coach, aby zobaczyć metryki.
        </div>
      ) : (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Łącznie insightów"
              value={String(metrics.totalInsights)}
              sub={`${metrics.periodDays} dni`}
            />
            <MetricCard
              label="Średnia pewność AI"
              value={`${Math.round(metrics.avgConfidence * 100)}%`}
              sub="weighted overall"
              color={metrics.avgConfidence >= 0.75 ? 'text-green-600 dark:text-green-400' : metrics.avgConfidence >= 0.45 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500'}
            />
            <MetricCard
              label="Pozytywny feedback"
              value={`${Math.round(metrics.positiveRate * 100)}%`}
              sub={`Udział feedbacku: ${Math.round(metrics.feedbackRate * 100)}%`}
              color={metrics.positiveRate >= 0.7 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}
            />
            <MetricCard
              label="Śr. tokeny / insight"
              value={String(metrics.avgTokens)}
              sub="prompt + completion"
            />
          </div>

          {/* By type */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Rozkład typów insightów</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(metrics.byType).map(([type, count]) => {
                const labels: Record<string, string> = {
                  MORNING_BRIEF: 'Poranne',
                  MIDDAY_CHECK: 'Południowe',
                  EVENING_REVIEW: 'Wieczorne',
                }
                return (
                  <div key={type} className="rounded-lg bg-muted/40 p-3 text-center">
                    <p className="text-lg font-bold tabular-nums">{count}</p>
                    <p className="text-xs text-muted-foreground">{labels[type] ?? type}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Feedback breakdown */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Feedback od użytkownika</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-center">
                <p className="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums">
                  {Math.round(metrics.positiveRate * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">Pozytywny</p>
              </div>
              <div className="flex-1 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
                <p className="text-lg font-bold text-red-500 tabular-nums">
                  {Math.round(metrics.negativeRate * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">Negatywny</p>
              </div>
              <div className="flex-1 rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-lg font-bold tabular-nums">
                  {Math.round((1 - metrics.feedbackRate) * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">Bez reakcji</p>
              </div>
            </div>
          </div>

          {/* Top missing signals */}
          {metrics.topMissingSignals.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-medium">Najczęściej brakujące sygnały danych</p>
              </div>
              <div className="space-y-2">
                {metrics.topMissingSignals.map(({ signal, count }) => (
                  <div key={signal} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">{signal}</span>
                    <span className="text-xs tabular-nums font-medium text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                      ×{count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trending */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Aktywne wersje promptów</p>
            </div>
            <div className="space-y-2">
              {activePrompts.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <code className="text-xs bg-muted rounded px-1.5 py-0.5 font-mono">{p.id}</code>
                  <span className="text-xs text-muted-foreground">{p.description}</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400">
                    aktywny
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
