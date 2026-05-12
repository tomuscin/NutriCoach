// FeedInsightCard — displays an AI insight in the feed
// Shows content, confidence badge, and lifecycle actions.
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from 'lucide-react'

type Props = {
  id: string
  content: string
  confidence: number | null
  type: 'morning' | 'midday' | 'evening'
  createdAt: string
}

const TYPE_LABELS = {
  morning: { label: 'Poranny brief', emoji: '🌅' },
  midday: { label: 'Śróddzienny', emoji: '☀️' },
  evening: { label: 'Wieczorny', emoji: '🌙' },
}

export function FeedInsightCard({ id, content, confidence, type, createdAt }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [feedback, setFeedback] = useState<'POSITIVE' | 'NEGATIVE' | null>(null)
  const [feedbackSent, setFeedbackSent] = useState(false)

  const meta = TYPE_LABELS[type]
  const shortContent = content.length > 200 ? content.slice(0, 200) + '...' : content
  const hasMore = content.length > 200

  const confidenceColor =
    confidence === null ? '#94a3b8'
    : confidence >= 0.75 ? '#22c55e'
    : confidence >= 0.45 ? '#f59e0b'
    : '#ef4444'

  async function sendFeedback(f: 'POSITIVE' | 'NEGATIVE') {
    if (feedbackSent) return
    setFeedback(f)
    setFeedbackSent(true)
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId: id, feedback: f }),
      })
      // Mark as interacted
      await fetch(`/api/ai/insights/${id}/lifecycle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'interacted' }),
      })
    } catch {}
  }

  const time = new Intl.DateTimeFormat('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(createdAt))

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{meta.emoji}</span>
          <div>
            <p className="text-xs font-semibold text-foreground">{meta.label}</p>
            <p className="text-[10px] text-muted-foreground">{time}</p>
          </div>
        </div>
        {confidence !== null && (
          <div
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ color: confidenceColor, backgroundColor: `${confidenceColor}20` }}
          >
            {Math.round(confidence * 100)}%
          </div>
        )}
      </div>

      {/* Content */}
      <p className="text-sm text-foreground leading-relaxed">
        {expanded ? content : shortContent}
      </p>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Zwiń' : 'Czytaj więcej'}
        </button>
      )}

      {/* Feedback */}
      <div className="flex items-center gap-2 pt-1 border-t border-border">
        <span className="text-[10px] text-muted-foreground">Pomocny?</span>
        <button
          onClick={() => sendFeedback('POSITIVE')}
          disabled={feedbackSent}
          className={`p-1 rounded transition-colors ${
            feedback === 'POSITIVE'
              ? 'text-green-500'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => sendFeedback('NEGATIVE')}
          disabled={feedbackSent}
          className={`p-1 rounded transition-colors ${
            feedback === 'NEGATIVE'
              ? 'text-red-500'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
