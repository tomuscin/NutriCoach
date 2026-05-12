'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'

type InsightType = 'morning' | 'midday' | 'evening'

type Props = {
  hasInsight: Record<InsightType, boolean>
}

const TYPE_LABELS: Record<InsightType, string> = {
  morning: 'Poranny brief',
  midday: 'Sprawdzenie śróddzienne',
  evening: 'Podsumowanie wieczorne',
}

export function GenerateInsightButton({ hasInsight }: Props) {
  const [generating, setGenerating] = useState<InsightType | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Determine which insight is most relevant for current time
  const now = new Date().getHours()
  const suggestedType: InsightType =
    now < 10 ? 'morning' : now < 16 ? 'midday' : 'evening'

  const missingType = (['morning', 'midday', 'evening'] as InsightType[])
    .find(t => !hasInsight[t] && (
      t === 'morning' ? now >= 5 :
      t === 'midday' ? now >= 10 :
      now >= 18
    ))

  const typeToGenerate = missingType ?? suggestedType

  async function generate(type: InsightType) {
    setGenerating(type)
    setError(null)
    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const data = await res.json()
      if (data.ok) {
        window.location.reload()
      } else {
        setError(data.error ?? 'Błąd generowania')
      }
    } catch {
      setError('Błąd połączenia')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => generate(typeToGenerate)}
        disabled={generating !== null}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
      >
        {generating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {generating ? 'Generuję...' : `Generuj: ${TYPE_LABELS[typeToGenerate]}`}
      </button>
      {error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}
    </div>
  )
}
