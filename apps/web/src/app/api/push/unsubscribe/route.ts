// DELETE /api/push/unsubscribe — mark a push subscription as inactive
import { type NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  endpoint: z.string().url(),
})

export async function DELETE(req: NextRequest) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const userId = session.id
  const { endpoint } = parsed.data

  try {
    await prisma.pushSubscription.updateMany({
      where: { userId, endpoint },
      data: { isActive: false, revokedAt: new Date() },
    })

    logger.info({ userId }, 'push:unsubscribe')
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error({ err, userId }, 'push:unsubscribe:error')
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
