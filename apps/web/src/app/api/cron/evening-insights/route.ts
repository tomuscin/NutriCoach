// GET /api/cron/evening-insights — Vercel Cron: 21:00 Warsaw = 19:00 UTC

import { NextRequest, NextResponse } from 'next/server'
import { prisma as db } from '@/lib/db'
import { aiLogger, timer } from '@/lib/logger'
import { generateEveningInsight } from '@/lib/ai/insight-engine'
import { hasRecentInsight } from '@/lib/ai/persistence'
import { buildAndPersistRollingSummary } from '@/lib/ai/context-compression'
import { computeAndPersistDailyScore } from '@/lib/scoring/daily-scoring'
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

  const t = timer(aiLogger, 'cron:evening-insights')
  const today = new Date()

  return Sentry.startSpan({ name: 'cron:evening-insights', op: 'cron' }, async () => {
    const users = await db.user.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        profile: { onboardingCompletedAt: { not: null } },
      },
      select: { id: true },
      take: 100,
    })

    const results = { generated: 0, skipped: 0, failed: 0, summaries: 0, scores: 0 }

    for (const user of users) {
      try {
        // Evening: compute daily score + rolling summary (always)
        await computeAndPersistDailyScore(user.id, today)
        results.scores++

        const isDuplicate = await hasRecentInsight(user.id, 'EVENING_REVIEW', 60 * 6)
        if (isDuplicate) {
          results.skipped++
        } else {
          const result = await generateEveningInsight(user.id, `cron-evening-${user.id}`)
          if (result.ok) {
            results.generated++
            await db.notification.create({
              data: {
                userId: user.id,
                type: 'EVENING_REVIEW',
                status: 'SENT',
                channel: 'IN_APP',
                title: 'Podsumowanie dnia',
                body: 'Przejrzyj jak minął dzień i przygotuj się na jutro.',
                data: { insightType: 'EVENING_REVIEW' },
                sentAt: new Date(),
              },
            })
          } else {
            results.failed++
          }
        }

        // Build rolling summary after evening insight
        await buildAndPersistRollingSummary(user.id)
        results.summaries++
      } catch (err) {
        results.failed++
        aiLogger.warn({ userId: user.id, err }, 'cron:evening failed for user')
        Sentry.captureException(err, { tags: { cron: 'evening-insights', userId: user.id } })
      }
    }

    t.end(results)
    return NextResponse.json({ ok: true, ...results, users: users.length })
  })
}
