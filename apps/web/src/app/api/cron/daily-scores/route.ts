// GET /api/cron/daily-scores — Vercel Cron: 22:00 Warsaw = 20:00 UTC
// Computes daily scores + adherence for all users (catch-up if evening cron missed)

import { NextRequest, NextResponse } from 'next/server'
import { prisma as db } from '@/lib/db'
import { aiLogger, timer } from '@/lib/logger'
import { computeAndPersistDailyScore } from '@/lib/scoring/daily-scoring'
import { computeAndPersistAdherence } from '@/lib/adherence/adherence-engine'
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

  const t = timer(aiLogger, 'cron:daily-scores')
  const today = new Date()

  return Sentry.startSpan({ name: 'cron:daily-scores', op: 'cron' }, async () => {
    const users = await db.user.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        profile: { onboardingCompletedAt: { not: null } },
      },
      select: { id: true },
      take: 100,
    })

    const results = { scores: 0, adherence: 0, failed: 0 }

    for (const user of users) {
      try {
        await computeAndPersistAdherence(user.id, today)
        results.adherence++

        await computeAndPersistDailyScore(user.id, today)
        results.scores++
      } catch (err) {
        results.failed++
        aiLogger.warn({ userId: user.id, err }, 'cron:daily-scores failed for user')
        Sentry.captureException(err, { tags: { cron: 'daily-scores', userId: user.id } })
      }
    }

    t.end(results)
    return NextResponse.json({ ok: true, ...results, users: users.length })
  })
}
