// POST /api/ai/feedback — Submit user feedback on AI insight
// ETAP 5.5 — User Feedback System
//
// Request: { insightId: string, feedback: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL', note?: string }
// Optimistic update: client sends immediately, response confirms persistence.

import { NextRequest, NextResponse } from 'next/server'
import { requireOnboarded } from '@/lib/auth'
import { submitInsightFeedback } from '@/lib/ai/persistence'
import { revalidateTag } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache'
import { aiLogger } from '@/lib/logger'
import { z } from 'zod'

const FeedbackSchema = z.object({
  insightId: z.string().min(1).max(100),
  feedback: z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL']),
  note: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireOnboarded()

    const body = await req.json().catch(() => ({}))
    const parsed = FeedbackSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Nieprawidłowe dane. Wymagane: insightId, feedback (POSITIVE/NEGATIVE/NEUTRAL)' },
        { status: 400 },
      )
    }

    const { insightId, feedback, note } = parsed.data

    const saved = await submitInsightFeedback({
      insightId,
      userId: user.id,
      feedback,
      feedbackNote: note,
    })

    if (!saved) {
      return NextResponse.json(
        { ok: false, error: 'Insight nie znaleziony lub brak uprawnień' },
        { status: 404 },
      )
    }

    aiLogger.info({ userId: user.id, insightId, feedback }, 'ai.feedback.submitted')

    revalidateTag(CACHE_TAGS.AI_INSIGHTS)

    return NextResponse.json({ ok: true, insightId, feedback })

  } catch (err) {
    aiLogger.error({ error: String(err) }, 'ai.feedback.error')
    return NextResponse.json({ ok: false, error: 'Błąd serwera' }, { status: 500 })
  }
}
