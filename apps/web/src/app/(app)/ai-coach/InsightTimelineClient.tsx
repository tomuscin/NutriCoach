'use client'

// InsightTimelineClient — ETAP 5.5
// Renders insight history with confidence, explainability, and feedback.
// Client component for interactive feedback and pagination.

import { useState } from 'react'
import { ConfidenceBreakdown } from '@/components/ai/ConfidenceBreakdown'
import { InsightExplanation } from '@/components/ai/InsightExplanation'
import { InsightFeedback } from '@/components/ai/InsightFeedback'
import { LowConfidenceWarning } from '@/components/ai/LowConfidenceWarning'
import { cn } from '@/lib/utils'
import { Zap, Sun, Cloud, Moon, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

type InsightItem = {
  id: string
  insightType: string
  content: string
  recommendation: string | null
  confidenceScore: number | null
  nutritionConfidence: number | null
  trainingConfidence: number | null
  recoveryConfidence: number | null
  dataCompleteness: number | null
  missingSignals: unknown
  primaryDrivers: unknown
  supportingSignals: unknown
  explanationWarnings: unknown
  feedback: string | null
  feedbackNote?: string | null
  feedbackAt?: Date | null
  promptVersion: string
  model: string
  totalTokens: number
  createdAt: Date
}

type Props = {
  initialItems: InsightItem[]
  totalPages: number
  userId: string
}

const TYPE_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  MORNING_BRIEF: { label: 'Poranne', Icon: Sun, color: 'text-amber-500' },
  MIDDAY_CHECK: { label: 'Południowe', Icon: Cloud, color: 'text-blue-500' },
  EVENING_REVIEW: { label: 'Wieczorne', Icon: Moon, color: 'text-indigo-500' },
}

function InsightCard({ item }: { item: InsightItem }) {
  const meta = TYPE_META[item.insightType] ?? { label: item.insightType, Icon: Zap, color: 'text-primary' }
  const Icon = meta.Icon

  const confidence = item.confidenceScore ?? 0
  const missing = Array.isArray(item.missingSignals) ? (item.missingSignals as string[]) : []
  const primaryDrivers = Array.isArray(item.primaryDrivers) ? (item.primaryDrivers as string[]) : []
  const supportingSignals = Array.isArray(item.supportingSignals) ? (item.supportingSignals as string[]) : []
  const warnings = Array.isArray(item.explanationWarnings) ? (item.explanationWarnings as string[]) : []
  const showLowConf = confidence < 0.75 && missing.length > 0

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4 flex-shrink-0', meta.color)} />
          <div>
            <p className="text-sm font-medium">{meta.label}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(item.createdAt)}
            </p>
          </div>
        </div>
        <ConfidenceBreakdown
          overall={confidence}
          compact
          className="w-28"
        />
      </div>

      {/* Low confidence warning */}
      {showLowConf && (
        <LowConfidenceWarning
          missingSignals={missing}
          confidence={confidence}
        />
      )}

      {/* Content */}
      <div className="space-y-2">
        <p className="text-sm text-foreground leading-relaxed">{item.content}</p>
        {item.recommendation && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
            <p className="text-xs font-medium text-primary mb-0.5">Zalecenie</p>
            <p className="text-sm text-foreground">{item.recommendation}</p>
          </div>
        )}
      </div>

      {/* Explainability */}
      {(primaryDrivers.length > 0 || supportingSignals.length > 0) && (
        <InsightExplanation
          primaryDrivers={primaryDrivers}
          supportingSignals={supportingSignals}
          warnings={warnings}
        />
      )}

      {/* Confidence breakdown (expanded) */}
      {(item.nutritionConfidence != null || item.trainingConfidence != null || item.recoveryConfidence != null) && (
        <ConfidenceBreakdown
          overall={confidence}
          nutritionConfidence={item.nutritionConfidence}
          trainingConfidence={item.trainingConfidence}
          recoveryConfidence={item.recoveryConfidence}
          dataCompleteness={item.dataCompleteness}
        />
      )}

      {/* Footer: feedback + meta */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <InsightFeedback
          insightId={item.id}
          initialFeedback={item.feedback as 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | null}
        />
        <p className="text-xs text-muted-foreground tabular-nums">
          {item.promptVersion} · {item.totalTokens}t
        </p>
      </div>
    </div>
  )
}

export function InsightTimelineClient({ initialItems, totalPages, userId }: Props) {
  const [items, setItems] = useState(initialItems)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(totalPages)
  const [loading, setLoading] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [genType, setGenType] = useState<'morning' | 'midday' | 'evening'>('morning')
  const [genError, setGenError] = useState<string | null>(null)

  const loadPage = async (p: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ai/insights?page=${p}&pageSize=15`)
      const data = await res.json()
      if (data.ok) {
        setItems(data.items)
        setTotal(data.totalPages)
        setPage(p)
      }
    } finally {
      setLoading(false)
    }
  }

  const generateInsight = async () => {
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: genType }),
      })
      const data = await res.json()
      if (!data.ok) {
        setGenError(data.error ?? 'Błąd generowania')
      } else {
        await loadPage(1)
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Generation Panel */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium mb-3">Wygeneruj nowy insight</p>
        <div className="flex flex-wrap items-center gap-2">
          {(['morning', 'midday', 'evening'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setGenType(t)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                genType === t
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
              )}
            >
              {t === 'morning' ? 'Poranny' : t === 'midday' ? 'Południowy' : 'Wieczorny'}
            </button>
          ))}
          <button
            onClick={generateInsight}
            disabled={generating}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 ml-auto"
          >
            {generating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            {generating ? 'Generuję...' : 'Generuj'}
          </button>
        </div>
        {genError && (
          <p className="mt-2 text-xs text-red-500">{genError}</p>
        )}
      </div>

      {/* Timeline */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
          Brak insightów. Wygeneruj pierwszy powyżej.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <InsightCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => loadPage(page - 1)}
            disabled={page <= 1 || loading}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground">
            {page} / {total}
          </span>
          <button
            onClick={() => loadPage(page + 1)}
            disabled={page >= total || loading}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
