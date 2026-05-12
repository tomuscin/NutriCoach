// GET /api/cron/morning-insights — Vercel Cron: 06:30 Warsaw = 04:30 UTC
// Generates MORNING_BRIEF for all active users.
// Protected by CRON_SECRET env var (set in Vercel dashboard).

import { NextRequest, NextResponse } from 'next/server'
import { prisma as db } from '@/lib/db'
import { aiLogger, timer } from '@/lib/logger'
import {
  generateMorningInsight,
} from '@/lib/ai/insight-engine'
import { hasRecentInsight } from '@/lib/ai/persistence'
import { computeAndPersistReadiness } from '@/lib/readiness/readiness-engine'
import { computeAndPersistAdherence } from '@/lib/adherence/adherence-engine'
import * as Sentry from '@sentry/nextjs'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true  // dev — no secret configured
  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const t = timer(aiLogger, 'cron:morning-insights')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Sentry.startSpan(
    { name: 'cron:morning-insights', op: 'cron' },
    async () => {
      // Get all active onboarded users
      const users = await db.user.findMany({
        where: {
          status: 'ACTIVE',
          deletedAt: null,
          profile: { onboardingCompletedAt: { not: null } },
        },
        select: { id: true },
        take: 100,  // batch limit per cron run
      })

      const results = { generated: 0, skipped: 0, failed: 0 }

      for (const user of users) {
        try {
          // Compute readiness + adherence first (feeds into AI context)
          await computeAndPersistAdherence(user.id, today)
          await computeAndPersistReadiness(user.id, today)

          // Skip if already generated this morning
          const isDuplicate = await hasRecentInsight(user.id, 'MORNING_BRIEF', 60 * 8)
          if (isDuplicate) { results.skipped++; continue }

          const result = await generateMorningInsight(user.id, `cron-morning-${user.id}`)
          if (result.ok) {
            results.generated++
            // Create delivery notification
            await db.notification.create({
              data: {
                userId: user.id,
                type: 'MORNING_BRIEF',
                status: 'SENT',
                channel: 'IN_APP',
                title: 'Poranek z AI Coach',
                body: 'Twój poranny brief jest gotowy. Sprawdź swój plan na dziś.',
                data: { insightType: 'MORNING_BRIEF' },
                sentAt: new Date(),
              },
            })
          } else {
            results.failed++
          }
        } catch (err) {
          results.failed++
          aiLogger.warn({ userId: user.id, err }, 'cron:morning failed for user')
          Sentry.captureException(err, { tags: { cron: 'morning-insights', userId: user.id } })
        }
      }

      t.end(results)
      aiLogger.info({ results, userCount: users.length }, 'cron:morning-insights complete')

      return NextResponse.json({ ok: true, ...results, users: users.length })
    }
  )
}
