// AIInsightCard — ETAP 5: AI Coaching insight widget
// Shows latest insight with confidence indicator, type label, and generate button.
// 'use client' — uses state for on-demand generation trigger.

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Bot, ChevronRight, RefreshCw, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type AIInsightCardProps = {
  insight: {
    summary: string
    type: string
    createdAt: string
    confidenceScore?: number | null
  } | null
  className?: string
}

const TYPE_LABELS: Record<string, string> = {
  MORNING_BRIEF: 'Poranny brief',
  MIDDAY_CHECK: 'Sprawdzenie południe',
  EVENING_REVIEW: 'Wieczorny przegląd',
  GOAL_UPDATE: 'Aktualizacja celu',
  RECOVERY_ALERT: 'Alert regeneracji',
  NUTRITION_ALERT: 'Alert żywienia',
  PERFORMANCE_UPDATE: 'Aktualizacja wyników',
  WEEKLY_SUMMARY: 'Podsumowanie tygodnia',
  MILESTONE: 'Milestone',
}

// Map type to morning/midday/evening for generation
const TYPE_TO_MOMENT: Record<string, 'morning' | 'midday' | 'evening'> = {
  MORNING_BRIEF: 'morning',
  MIDDAY_CHECK: 'midday',
  EVENING_REVIEW: 'evening',
}

function getInsightMoment(): 'morning' | 'midday' | 'evening' {
  const hour = new Date().getHours()
  if (hour < 11) return 'morning'
  if (hour < 17) return 'midday'
  return 'evening'
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'przed chwilą'
  if (hours < 24) return `${hours}h temu`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'wczoraj'
  return `${days}d temu`
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = pct >= 70 ? 'bg-green-500' : pct >= 45 ? 'bg-yellow-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{pct}% pewność</span>
    </div>
  )
}

export function AIInsightCard({ insight, className }: AIInsightCardProps) {
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const router = useRouter()

  const handleGenerate = async () => {
    setGenerating(true)
    setGenError(null)
    try {
      const moment = insight?.type
        ? (TYPE_TO_MOMENT[insight.type] ?? getInsightMoment())
        : getInsightMoment()

      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: moment }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setGenError(data.error ?? 'Błąd generowania')
      } else {
        router.refresh()
      }
    } catch {
      setGenError('Błąd sieci')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-1.5">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            AI Coach
          </span>
        </div>
        <div className="flex items-center gap-2">
          {insight && (
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(insight.createdAt)}
            </span>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            title="Generuj nowy insight"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', generating && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {genError && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
          <p className="text-xs text-destructive">{genError}</p>
        </div>
      )}

      {/* Generating state */}
      {generating && (
        <div className="py-4 text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
          <p className="text-xs text-muted-foreground">AI analizuje Twoje dane...</p>
        </div>
      )}

      {/* Insight content */}
      {!generating && insight && (
        <div className="space-y-2">
          {insight.type && (
            <span className="inline-block text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {TYPE_LABELS[insight.type] ?? insight.type}
            </span>
          )}
          <p className="text-sm text-foreground leading-relaxed line-clamp-4">
            {insight.summary}
          </p>
          {insight.confidenceScore != null && (
            <ConfidenceBar score={insight.confidenceScore} />
          )}
          <Link
            href="/ai-coach"
            className="inline-flex items-center text-xs font-medium text-primary hover:underline mt-1"
          >
            AI Coach <ChevronRight className="h-3 w-3 ml-0.5" />
          </Link>
        </div>
      )}

      {/* Empty state */}
      {!generating && !insight && (
        <div className="py-4 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Brak wiadomości od AI Coacha
          </p>
          <p className="text-xs text-muted-foreground">
            Dodaj dane (waga, żywienie, regeneracja), a AI wygeneruje spersonalizowany insight.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
          >
            <RefreshCw className="h-3 w-3" />
            Generuj teraz
          </button>
        </div>
      )}
    </div>
  )
}

