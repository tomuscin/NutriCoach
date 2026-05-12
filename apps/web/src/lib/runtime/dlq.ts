// Dead Letter Queue — ETAP 6.75
// DB-backed DLQ for failed async jobs (no Redis/BullMQ in this deployment).
//
// DLQ categories:
//   sync-dlq     → failed SyncLog records
//   webhook-dlq  → failed WebhookEvent records
//   ai-dlq       → failed AIInsight generation (null content)
//   notification-dlq → failed Notification records
//
// Each failed item is:
//   - inspectable (via /dashboard/runtime)
//   - replayable (via replay-engine.ts)
//   - correlated (correlationId / parentEventId in EventJournal)

import 'server-only'
import { prisma as db } from '@/lib/db'
import { logger } from '@/lib/logger'

// ─── DLQ inspection ──────────────────────────────────────────────────────────

export async function getDLQSummary() {
  const [syncFailed, webhookFailed, notificationFailed] = await Promise.all([
    db.syncLog.count({ where: { status: 'FAILED' } }),
    db.webhookEvent.count({ where: { status: 'failed' } }),
    db.notification.count({ where: { status: 'FAILED' } }),
  ])

  return {
    sync: syncFailed,
    webhook: webhookFailed,
    notification: notificationFailed,
    total: syncFailed + webhookFailed + notificationFailed,
  }
}

export async function getSyncDLQ(limit = 20) {
  return db.syncLog.findMany({
    where: { status: 'FAILED' },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      integration: { select: { provider: true, userId: true } },
    },
  })
}

export async function getWebhookDLQ(limit = 20) {
  return db.webhookEvent.findMany({
    where: { status: 'failed' },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function getNotificationDLQ(limit = 20) {
  return db.notification.findMany({
    where: { status: 'FAILED' },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

// ─── DLQ enqueue (mark as failed, ready for retry) ───────────────────────────

export async function enqueueFailedSync(syncLogId: string, error: Error) {
  logger.warn({ syncLogId, error: error.message }, 'dlq.sync.enqueued')
  // SyncLog is already updated to FAILED by the sync engine — just log for visibility
}

// ─── DLQ recovery stats ───────────────────────────────────────────────────────

export async function getRecoveryStats(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const [recovered, totalFailed] = await Promise.all([
    db.syncLog.count({ where: { status: 'SUCCESS', finishedAt: { gte: since } } }),
    db.syncLog.count({ where: { status: 'FAILED', createdAt: { gte: since } } }),
  ])
  const rate = totalFailed > 0 ? Math.round((recovered / (recovered + totalFailed)) * 100) : 100
  return { recovered, totalFailed, successRate: rate }
}
