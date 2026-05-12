// PATCH /api/notifications/read-all — mark all unread notifications as read

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PATCH(_request: Request) {
  let user: Awaited<ReturnType<typeof requireAuth>>
  try {
    user = await requireAuth()
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date(), status: 'READ' },
  })

  return NextResponse.json({ ok: true })
}
