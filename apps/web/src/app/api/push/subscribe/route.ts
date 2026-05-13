// POST /api/push/subscribe — save a browser PushSubscription to DB
import { type NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { trackEvent } from '@/lib/analytics/events'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const subscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  deviceLabel: z.string().max(100).optional(),
})

export async function POST(req: NextRequest) {
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

  const parsed = subscriptionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const { subscription, deviceLabel } = parsed.data
  const userId = session.id

  try {
    // Upsert — if same endpoint already exists, update it
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint } as never, // endpoint is unique
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        deviceLabel: deviceLabel ?? null,
        isActive: true,
      },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        isActive: true,
        revokedAt: null,
        lastUsedAt: new Date(),
        deviceLabel: deviceLabel ?? undefined,
      },
    })

    // Ensure pushNotifications preference is enabled
    await prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, pushNotifications: true },
      update: { pushNotifications: true },
    })

    logger.info({ userId }, 'push:subscribe')
    trackEvent({ userId, event: 'push.subscribed', ip: req.headers.get('x-forwarded-for') ?? undefined })
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error({ err, userId }, 'push:subscribe:error')
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
