// GET /api/ai/metrics — AI Runtime metrics for evaluation dashboard
// ETAP 5.5 — AI Evaluation Dashboard

import { NextRequest, NextResponse } from 'next/server'
import { requireOnboarded } from '@/lib/auth'
import { getAIMetrics } from '@/lib/ai/persistence'
import { getRegistrySnapshot } from '@/lib/ai/prompt-registry'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await requireOnboarded()

    const days = Math.min(90, Math.max(7, parseInt(req.nextUrl.searchParams.get('days') ?? '30', 10)))
    const metrics = await getAIMetrics(user.id, days)
    const registry = getRegistrySnapshot()

    return NextResponse.json({
      ok: true,
      metrics,
      promptRegistry: registry.filter((p) => p.active),
      generatedAt: new Date().toISOString(),
    })

  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Błąd serwera' }, { status: 500 })
  }
}
