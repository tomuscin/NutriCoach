// PATCH /api/ai/insights/[id]/lifecycle — mark insight as viewed/interacted/archived
// Part of insight lifecycle tracking (ETAP 6)

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma as db } from '@/lib/db'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache'

export const dynamic = 'force-dynamic'

const Schema = z.object({
  event: z.enum(['viewed', 'interacted', 'archived']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const parsed = Schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid event' }, { status: 400 })
    }

    const { event } = parsed.data
    const now = new Date()

    const updateData: Record<string, unknown> = {}
    switch (event) {
      case 'viewed':
        updateData.viewedAt = now
        updateData.status = 'VIEWED'
        break
      case 'interacted':
        updateData.interactedAt = now
        updateData.status = 'INTERACTED'
        break
      case 'archived':
        updateData.archivedAt = now
        updateData.status = 'ARCHIVED'
        break
    }

    // Only update own insights
    const updated = await db.aIInsight.updateMany({
      where: { id, userId: user.id },
      data: updateData,
    })

    if (updated.count === 0) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
    }

    revalidateTag(CACHE_TAGS.AI_INSIGHTS)
    return NextResponse.json({ ok: true, event })
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
}
