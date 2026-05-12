// GET /api/notifications — unread in-app notifications
// PATCH /api/notifications — mark as read

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import {
  getUnreadNotifications,
  getUnreadCount,
  markNotificationsRead,
} from '@/lib/notifications/notification-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireAuth()
    const [notifications, unreadCount] = await Promise.all([
      getUnreadNotifications(user.id, 20),
      getUnreadCount(user.id),
    ])
    return NextResponse.json({ ok: true, notifications, unreadCount })
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
}

const PatchSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
})

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json().catch(() => ({}))
    const parsed = PatchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
    }

    const count = await markNotificationsRead(user.id, parsed.data.ids)
    return NextResponse.json({ ok: true, marked: count })
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
}
