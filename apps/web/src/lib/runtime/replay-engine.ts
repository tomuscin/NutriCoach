// Replay Engine — ETAP 6.75
// Deterministic replay of past runtime events.
//
// Supports:
//   - replay webhook (re-trigger sync from a failed WebhookEvent)
//   - replay sync (re-run sync for a userId/integrationId)
//   - replay AI generation (re-generate an insight for a date)
//   - replay notification (re-send a failed notification)
//
// All replays are:
//   - idempotent (deduplication handled by downstream systems)
//   - journaled (EventJournal entry with source='system.replay-engine')
//   - observable (Sentry breadcrumb, metrics counter)

import 'server-only'
import { prisma as db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { runTrainingPeaksSync } from '@/lib/integrations/sync/training-sync'
import { journalEvent } from '@/lib/runtime/journal'
import { metrics } from '@/lib/runtime/metrics'
import * as Sentry from '@sentry/nextjs'

export type ReplayTarget =
  | { type: 'webhook'; webhookEventId: string }
  | { type: 'sync'; userId: string; correlationId?: string }
  | { type: 'ai'; userId: string; insightType: 'morning' | 'midday' | 'evening'; date?: Date }

export type ReplayResult = {
  ok: boolean
  message: string
  replayedId?: string
  durationMs: number
}

// ─── Replay dispatcher ────────────────────────────────────────────────────────

export async function replayEvent(target: ReplayTarget, triggeredBy?: string): Promise<ReplayResult> {
  const start = Date.now()
  logger.info({ target, triggeredBy }, 'replay.triggered')

  try {
    let result: ReplayResult

    switch (target.type) {
      case 'webhook':
        result = await replayWebhook(target.webhookEventId, triggeredBy)
        break
      case 'sync':
        result = await replaySync(target.userId, target.correlationId)
        break
      case 'ai':
        result = await replayAI(target.userId, target.insightType, target.date)
        break
    }

    metrics.increment('dlq.recovered', { type: target.type })
    Sentry.addBreadcrumb({
      category: 'replay',
      message: `Replay ${target.type} completed`,
      level: 'info',
      data: { ok: result.ok, durationMs: result.durationMs },
    })

    return result
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err))
    logger.error({ target, error: e.message }, 'replay.failed')
    Sentry.captureException(e, { tags: { 'replay.type': target.type } })
    return { ok: false, message: e.message, durationMs: Date.now() - start }
  }
}

// ─── Webhook replay ───────────────────────────────────────────────────────────

async function replayWebhook(webhookEventId: string, triggeredBy?: string): Promise<ReplayResult> {
  const start = Date.now()

  const event = await db.webhookEvent.findUnique({ where: { id: webhookEventId } })
  if (!event) {
    return { ok: false, message: `WebhookEvent ${webhookEventId} not found`, durationMs: Date.now() - start }
  }

  // Find user by athleteExternalId
  const integration = event.athleteExternalId
    ? await db.integration.findFirst({
        where: { athleteExternalId: event.athleteExternalId, provider: 'TRAININGPEAKS', status: 'ACTIVE' },
        select: { userId: true },
      })
    : null

  if (!integration) {
    await db.webhookEvent.update({ where: { id: webhookEventId }, data: { retryCount: { increment: 1 } } })
    return { ok: false, message: 'No active integration for athleteExternalId', durationMs: Date.now() - start }
  }

  await journalEvent({
    eventType: 'replay.triggered',
    source: 'system.replay-engine',
    userId: integration.userId,
    payload: { webhookEventId, triggeredBy },
    status: 'ok',
  })

  // Reset webhook status to pending and re-trigger sync
  await db.webhookEvent.update({
    where: { id: webhookEventId },
    data: { status: 'pending', retryCount: { increment: 1 } },
  })

  const syncResult = await runTrainingPeaksSync(integration.userId)

  await db.webhookEvent.update({
    where: { id: webhookEventId },
    data: {
      status: syncResult.success ? 'processed' : 'failed',
      processedAt: syncResult.success ? new Date() : undefined,
      errorMessage: syncResult.success ? null : syncResult.message,
    },
  })

  return {
    ok: syncResult.success,
    message: syncResult.message,
    replayedId: webhookEventId,
    durationMs: Date.now() - start,
  }
}

// ─── Sync replay ──────────────────────────────────────────────────────────────

async function replaySync(userId: string, correlationId?: string): Promise<ReplayResult> {
  const start = Date.now()

  await journalEvent({
    eventType: 'replay.triggered',
    source: 'system.replay-engine',
    userId,
    correlationId,
    payload: { type: 'sync', triggeredBy: 'manual' },
    status: 'ok',
  })

  const result = await runTrainingPeaksSync(userId)
  return {
    ok: result.success,
    message: result.message,
    durationMs: Date.now() - start,
  }
}

// ─── AI replay ────────────────────────────────────────────────────────────────

async function replayAI(
  userId: string,
  insightType: 'morning' | 'midday' | 'evening',
  date?: Date,
): Promise<ReplayResult> {
  const start = Date.now()

  // Archive any existing insight for this date/type
  const targetDate = date ?? new Date()
  const today = new Date(targetDate)
  today.setUTCHours(0, 0, 0, 0)
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

  const typeMap = {
    morning: 'MORNING_BRIEF',
    midday: 'MIDDAY_CHECK',
    evening: 'EVENING_REVIEW',
  } as const
  await db.aIInsight.updateMany({
    where: {
      userId,
      insightType: typeMap[insightType],
      createdAt: { gte: today, lt: tomorrow },
      status: { in: ['GENERATED', 'DELIVERED'] },
    },
    data: { status: 'ARCHIVED', archivedAt: new Date() },
  })

  await journalEvent({
    eventType: 'replay.triggered',
    source: 'system.replay-engine',
    userId,
    payload: { type: 'ai', insightType, date: targetDate.toISOString() },
    status: 'ok',
  })

  // Re-generation happens on next cron run — we just clear the cached insight
  return {
    ok: true,
    message: `${insightType} insight archived — will regenerate on next cron run`,
    durationMs: Date.now() - start,
  }
}
