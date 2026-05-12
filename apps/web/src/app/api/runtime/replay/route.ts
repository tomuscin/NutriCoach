// POST /api/runtime/replay — trigger a replay of a failed event
// DEV + ADMIN only.

import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { replayEvent, type ReplayTarget } from '@/lib/runtime/replay-engine'
import { prisma as db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const user = await requireAuth()

  const fullUser = await db.user.findUnique({ where: { id: user.id }, select: { role: true } })
  if (fullUser?.role !== 'ADMIN' && process.env.NODE_ENV === 'production') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: ReplayTarget
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.type || !['webhook', 'sync', 'ai'].includes(body.type)) {
    return Response.json({ error: 'Invalid replay type' }, { status: 400 })
  }

  const result = await replayEvent(body, user.id)
  return Response.json(result, { status: result.ok ? 200 : 500 })
}
