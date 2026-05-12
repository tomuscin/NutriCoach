// POST /api/ai/coach — On-demand AI insight generation
// ETAP 5 — Deterministic AI Coaching Runtime
//
// Request body: { type: 'morning' | 'midday' | 'evening' }
// Generates insight for authenticated user, persists to DB, returns result.
// Rate-limited: one insight per type per 60 minutes.

import { NextRequest, NextResponse } from 'next/server'
import { requireOnboarded } from '@/lib/auth'
import { getRequestId } from '@/lib/correlation'
import { aiLogger } from '@/lib/logger'
import { revalidateTag } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache'
import { hasRecentInsight } from '@/lib/ai/persistence'
import {
  generateMorningInsight,
  generateMiddayInsight,
  generateEveningInsight,
} from '@/lib/ai/insight-engine'
import { z } from 'zod'

const RequestSchema = z.object({
  type: z.enum(['morning', 'midday', 'evening']),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireOnboarded()
    const requestId = await getRequestId()

    const body = await req.json().catch(() => ({}))
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Nieprawidłowy typ insightu. Oczekiwane: morning | midday | evening' },
        { status: 400 },
      )
    }

    const { type } = parsed.data
    const insightTypeMap = {
      morning: 'MORNING_BRIEF',
      midday: 'MIDDAY_CHECK',
      evening: 'EVENING_REVIEW',
    } as const

    // Deduplication — prevent generating same type within 60 minutes
    const isDuplicate = await hasRecentInsight(user.id, insightTypeMap[type], 60)
    if (isDuplicate) {
      return NextResponse.json(
        { ok: false, error: 'Insight tego typu wygenerowany w ostatniej godzinie. Spróbuj później.' },
        { status: 429 },
      )
    }

    aiLogger.info({ userId: user.id, type, requestId }, 'ai.generate.start')

    let result
    switch (type) {
      case 'morning':
        result = await generateMorningInsight(user.id, requestId ?? undefined)
        break
      case 'midday':
        result = await generateMiddayInsight(user.id, requestId ?? undefined)
        break
      case 'evening':
        result = await generateEveningInsight(user.id, requestId ?? undefined)
        break
    }

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
    }

    // Invalidate AI insights cache so dashboard refreshes
    revalidateTag(CACHE_TAGS.AI_INSIGHTS)
    revalidateTag(CACHE_TAGS.DASHBOARD)

    aiLogger.info({
      userId: user.id,
      type,
      requestId,
      latencyMs: result.latencyMs,
      persisted: result.persisted,
    }, 'ai.generate.success')

    return NextResponse.json({ ok: true, type, insight: result.insight })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Nieoczekiwany błąd'
    aiLogger.error({ error: msg }, 'ai.generate.error')
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

