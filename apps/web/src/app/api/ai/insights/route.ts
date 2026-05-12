// GET /api/ai/insights — Paginated insight history
// ETAP 5.5 — Insight Timeline System

import { NextRequest, NextResponse } from 'next/server'
import { requireOnboarded } from '@/lib/auth'
import { getInsightHistory } from '@/lib/ai/persistence'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await requireOnboarded()

    const { searchParams } = req.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const pageSize = Math.min(50, Math.max(5, parseInt(searchParams.get('pageSize') ?? '20', 10)))
    const type = searchParams.get('type') ?? undefined

    const result = await getInsightHistory(user.id, { page, pageSize, type })

    return NextResponse.json({ ok: true, ...result })

  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Błąd serwera' }, { status: 500 })
  }
}
