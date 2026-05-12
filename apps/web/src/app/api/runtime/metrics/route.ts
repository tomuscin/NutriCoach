// GET /api/runtime/metrics — serves runtime dashboard data
// DEV + ADMIN only. Returns today's metrics, DLQ summary, recent journal.

import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { metrics } from '@/lib/runtime/metrics'
import { getDLQSummary, getSyncDLQ, getWebhookDLQ, getRecoveryStats } from '@/lib/runtime/dlq'
import { getRecentJournal } from '@/lib/runtime/journal'
import { prisma as db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  const user = await requireAuth()

  // Admin-only: check role
  const fullUser = await db.user.findUnique({ where: { id: user.id }, select: { role: true } })
  if (fullUser?.role !== 'ADMIN' && process.env.NODE_ENV === 'production') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [todayMetrics, dlqSummary, syncDLQ, webhookDLQ, journal, recovery, recentSyncs] =
    await Promise.all([
      metrics.readToday(),
      getDLQSummary(),
      getSyncDLQ(10),
      getWebhookDLQ(10),
      getRecentJournal(undefined, 30),
      getRecoveryStats(7),
      db.syncLog.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true, status: true, syncType: true, createdAt: true,
          recordsCreated: true, recordsUpdated: true,
          startedAt: true, finishedAt: true, errors: true,
          integration: { select: { provider: true, userId: true } },
        },
      }),
    ])

  // Compute metric totals
  const metricMap = Object.fromEntries(todayMetrics.map(m => [m.name, m.value]))

  return Response.json({
    generatedAt: new Date().toISOString(),
    metrics: metricMap,
    dlq: dlqSummary,
    recovery,
    queues: {
      syncDLQ,
      webhookDLQ,
    },
    recentSyncs,
    journal: journal.map(j => ({
      id: j.id,
      eventType: j.eventType,
      source: j.source,
      userId: j.userId,
      status: j.status,
      processingMs: j.processingMs,
      errorMessage: j.errorMessage,
      createdAt: j.createdAt,
    })),
  })
}
