// GET /api/cron/midday-insights — Vercel Cron: 12:00 Warsaw = 10:00 UTC

import { NextRequest, NextResponse } from 'next/server'
import { prisma as db } from '@/lib/db'
import { aiLogger, timer } from '@/lib/logger'
import { generateMiddayInsight } from '@/lib/ai/insight-engine'
import { hasRecentInsight } from '@/lib/ai/persistence'
import * as Sentry from '@sentry/nextjs'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const t = timer(aiLogger, 'cron:midday-insights')

  return Sentry.startSpan({ name: 'cron:midday-insights', op: 'cron' }, async () => {
    const users = await db.user.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        profile: { onboardingCompletedAt: { not: null } },
      },
      select: { id: true },
      take: 100,
    })

    const results = { generated: 0, skipped: 0, failed: 0 }

    for (const user of users) {
      try {
        const isDuplicate = await hasRecentInsight(user.id, 'MIDDAY_CHECK', 60 * 6)
        if (isDuplicate) { results.skipped++; continue }

        const result = await generateMiddayInsight(user.id, `cron-midday-${user.id}`)
        if (result.ok) {
          results.generated++
          await db.notification.create({
            data: {
              userId: user.id,
              type: 'MIDDAY_CHECK',
              status: 'SENT',
              channel: 'IN_APP',
              title: 'Sprawdzenie śróddzienne',
              body: 'Twój raport postępu z południa jest gotowy.',
              data: { insightType: 'MIDDAY_CHECK' },
              sentAt: new Date(),
            },
          })
        } else {
          results.failed++
        }
      } catch (err) {
        results.failed++
        aiLogger.warn({ userId: user.id, err }, 'cron:midday failed for user')
        Sentry.captureException(err, { tags: { cron: 'midday-insights', userId: user.id } })
      }
    }

    t.end(results)
    return NextResponse.json({ ok: true, ...results, users: users.length })
  })
}
