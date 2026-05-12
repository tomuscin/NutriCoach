// InsightFeedback — ETAP 5.5 User Feedback Component
// Thumbs up / thumbs down with optional note.
// Optimistic updates — immediately reflects state, confirms with server.

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ThumbsUp, ThumbsDown } from 'lucide-react'

type InsightFeedbackProps = {
  insightId: string
  initialFeedback?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | null
  className?: string
}

export function InsightFeedback({ insightId, initialFeedback, className }: InsightFeedbackProps) {
  const [feedback, setFeedback] = useState<'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | null>(
    initialFeedback ?? null,
  )
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [submitted, setSubmitted] = useState(!!initialFeedback)

  const submit = async (value: 'POSITIVE' | 'NEGATIVE') => {
    // Optimistic update
    const prev = feedback
    setFeedback(value)
    setLoading(true)

    try {
      const res = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId, feedback: value, note: note || undefined }),
      })
      if (!res.ok) {
        setFeedback(prev)  // rollback
        return
      }
      setSubmitted(true)
      if (value === 'NEGATIVE' && !submitted) setShowNote(true)
    } catch {
      setFeedback(prev)
    } finally {
      setLoading(false)
    }
  }

  if (submitted && feedback && !showNote) {
    return (
      <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
        {feedback === 'POSITIVE' ? (
          <ThumbsUp className="h-3 w-3 text-green-500" />
        ) : (
          <ThumbsDown className="h-3 w-3 text-red-400" />
        )}
        <span>{feedback === 'POSITIVE' ? 'Trafne' : 'Zgłoszono'}</span>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Trafne zalecenie?</span>
        <button
          onClick={() => submit('POSITIVE')}
          disabled={loading}
          className={cn(
            'rounded p-1 transition-colors disabled:opacity-50',
            feedback === 'POSITIVE'
              ? 'text-green-500 bg-green-500/10'
              : 'text-muted-foreground hover:text-green-500 hover:bg-green-500/10',
          )}
          title="Trafne"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => submit('NEGATIVE')}
          disabled={loading}
          className={cn(
            'rounded p-1 transition-colors disabled:opacity-50',
            feedback === 'NEGATIVE'
              ? 'text-red-400 bg-red-400/10'
              : 'text-muted-foreground hover:text-red-400 hover:bg-red-400/10',
          )}
          title="Nietrafne"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {showNote && (
        <div className="flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Co było nie tak? (opcjonalne)"
            maxLength={300}
            className="flex-1 text-xs bg-muted rounded px-2 py-1 border border-border outline-none focus:border-primary"
          />
          <button
            onClick={async () => {
              if (note.trim()) await submit('NEGATIVE')
              setShowNote(false)
            }}
            className="text-xs font-medium text-primary hover:underline flex-shrink-0"
          >
            Wyślij
          </button>
          <button
            onClick={() => setShowNote(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Pomiń
          </button>
        </div>
      )}
    </div>
  )
}
