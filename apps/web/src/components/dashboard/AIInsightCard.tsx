// AIInsightCard — latest AI coaching message preview
// Server component — no 'use client'

import { cn } from '@/lib/utils'
import { Bot, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type AIInsightCardProps = {
  insight: { summary: string; type: string; createdAt: string } | null
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

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'przed chwilą'
  if (hours < 24) return `${hours}h temu`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'wczoraj'
  return `${days}d temu`
}

export function AIInsightCard({ insight, className }: AIInsightCardProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-1.5">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            AI Coach
          </span>
        </div>
        {insight && (
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(insight.createdAt)}
          </span>
        )}
      </div>

      {insight ? (
        <div className="space-y-3">
          {insight.type && (
            <span className="inline-block text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {TYPE_LABELS[insight.type] ?? insight.type}
            </span>
          )}
          <p className="text-sm text-foreground leading-relaxed line-clamp-4">
            {insight.summary}
          </p>
          <Link
            href="/dashboard/insights"
            className="inline-flex items-center text-xs font-medium text-primary hover:underline"
          >
            Zobacz wszystkie <ChevronRight className="h-3 w-3 ml-0.5" />
          </Link>
        </div>
      ) : (
        <div className="py-4 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Brak wiadomości od AI Coacha
          </p>
          <p className="text-xs text-muted-foreground">
            Insights pojawią się po dodaniu pierwszych danych
          </p>
        </div>
      )}
    </div>
  )
}
