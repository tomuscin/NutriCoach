// GET /api/cron/stale-scan
// Every 6h: scan for stale integrations, expired states, retry failed webhooks, clean journal.
// Vercel Cron: 0 */6 * * *

import * as Sentry from '@sentry/nextjs'
import { prisma as db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getRetryableWebhooks } from '@/lib/runtime/webhook-deduplication'
import { runTrainingPeaksSync } from '@/lib/integrations/sync/training-sync'
import { metrics } from '@/lib/runtime/metrics'

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

    // ── Retry failed webhooks (R-09) ────────────────────────────────────────
    const retryableWebhooks = await getRetryableWebhooks()
    let webhooksRetried = 0
    let webhooksRetryFailed = 0
    for (const wh of retryableWebhooks) {
      try {
        // Find the integration by athleteExternalId
        const integration = await db.integration.findFirst({
          where: { athleteExternalId: wh.athleteExternalId ?? '', provider: 'TRAININGPEAKS' },
          select: { userId: true },
        })
        if (!integration) {
          logger.warn({ webhookId: wh.id }, 'stale-scan: no integration found for webhook retry')
          continue
        }
        await runTrainingPeaksSync(integration.userId)
        await db.webhookEvent.update({
          where: { id: wh.id },
          data: { status: 'processed', processedAt: new Date(), retryCount: { increment: 1 } },
        })
        metrics.increment('webhook.retried')
        webhooksRetried++
      } catch (err) {
        await db.webhookEvent.update({
          where: { id: wh.id },
          data: {
            retryCount: { increment: 1 },
            errorMessage: err instanceof Error ? err.message : 'retry failed',
          },
        })
        webhooksRetryFailed++
      }
    }

    // Clean up old event journal entries (> 14 days)
    const journalCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const deletedJournal = await db.eventJournal.deleteMany({
      where: { createdAt: { lt: journalCutoff } },
    })

    const result = {
      deletedOAuthStates: deletedStates.count,
      staleIntegrations: staleIntegrations.length,
      deletedWebhookEvents: deletedWebhooks.count,
      webhooksRetried,
      webhooksRetryFailed,
      deletedJournalEntries: deletedJournal.count,
    }

    logger.info(result, 'Stale scan complete')
    return Response.json({ ok: true, ...result })
  })
}
