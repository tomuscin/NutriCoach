// GET /api/cron/stale-scan
// Every 6h: scan for stale integrations and expired states, alert if needed.
// Vercel Cron: 0 */6 * * *

import * as Sentry from '@sentry/nextjs'
import { prisma as db } from '@/lib/db'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

function isAuthorized(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  const auth = new Headers(request.headers).get('authorization')
  const secret = process.env.CRON_SECRET
  return !secret || auth === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return Sentry.startSpan({ name: 'cron.stale-scan' }, async () => {
    // Clean up expired OAuth states (> 10 min old)
    const deletedStates = await db.oAuthState.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })

    // Find integrations stuck in ERROR for > 24h
    const errorThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const staleIntegrations = await db.integration.findMany({
      where: {
        status: 'ERROR',
        lastErrorAt: { lt: errorThreshold },
        errorCount: { gte: 3 },
      },
      select: { id: true, userId: true, provider: true, errorCount: true, errorMessage: true },
    })

    if (staleIntegrations.length > 0) {
      Sentry.captureMessage(
        `Stale integrations: ${staleIntegrations.length} stuck in ERROR state`,
        { level: 'warning', extra: { staleIntegrations } },
      )
    }

    // Clean up old processed webhook events (> 7 days)
    const webhookCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const deletedWebhooks = await db.webhookEvent.deleteMany({
      where: { status: 'processed', createdAt: { lt: webhookCutoff } },
    })

    const result = {
      deletedOAuthStates: deletedStates.count,
      staleIntegrations: staleIntegrations.length,
      deletedWebhookEvents: deletedWebhooks.count,
    }

    logger.info(result, 'Stale scan complete')
    return Response.json({ ok: true, ...result })
  })
}
