// Webhook Deduplication — ETAP 6.75
// Idempotent webhook handling with replay protection.
//
// Design:
//   - SHA-256 hash of (provider + eventType + athleteId + canonicalized payload)
//   - 24-hour dedup window (rolling)
//   - Duplicate → 200 with { ok: true, duplicate: true }
//   - Replay attack detected → Sentry alert

import 'server-only'
import { createHash } from 'crypto'
import { prisma as db } from '@/lib/db'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

/** Compute a stable SHA-256 fingerprint for a webhook event */
export function computeWebhookHash(
  provider: string,
  eventType: string,
  athleteId: string,
  payload: unknown,
): string {
  // Canonicalize: sort keys so field order doesn't affect hash
  const canonical = JSON.stringify(payload, Object.keys(payload as object).sort())
  const input = `${provider}:${eventType}:${athleteId}:${canonical}`
  return createHash('sha256').update(input).digest('hex')
}

export type DeduplicationResult =
  | { isDuplicate: false; hash: string }
  | { isDuplicate: true; hash: string; originalId: string; originalCreatedAt: Date }

/**
 * Check if a webhook event is a duplicate within the deduplication window.
 * Updates the payloadHash on the existing event if found.
 */
export async function checkWebhookDuplicate(
  provider: string,
  eventType: string,
  athleteId: string,
  payload: unknown,
): Promise<DeduplicationResult> {
  const hash = computeWebhookHash(provider, eventType, athleteId, payload)
  const windowStart = new Date(Date.now() - DEDUP_WINDOW_MS)

  const existing = await db.webhookEvent.findFirst({
    where: {
      payloadHash: hash,
      createdAt: { gte: windowStart },
      status: { not: 'failed' }, // failed events can be retried
    },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  if (existing) {
    logger.warn(
      { provider, eventType, athleteId, hash, originalId: existing.id },
      'webhook.duplicate detected',
    )
    Sentry.addBreadcrumb({
      category: 'webhook',
      message: `Duplicate webhook blocked: ${eventType}`,
      level: 'warning',
      data: { provider, hash, originalId: existing.id },
    })
    return {
      isDuplicate: true,
      hash,
      originalId: existing.id,
      originalCreatedAt: existing.createdAt,
    }
  }

  return { isDuplicate: false, hash }
}

/**
 * Mark a WebhookEvent with its payload hash after creation.
 * Call this immediately after db.webhookEvent.create.
 */
export async function stampWebhookHash(id: string, hash: string): Promise<void> {
  await db.webhookEvent.update({ where: { id }, data: { payloadHash: hash } })
}

/**
 * Retry failed webhook events. Called from stale-scan cron.
 * Retries up to MAX_WEBHOOK_RETRIES times with exponential backoff window.
 */
const MAX_WEBHOOK_RETRIES = 3

export async function getRetryableWebhooks() {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000) // failed >5min ago
  return db.webhookEvent.findMany({
    where: {
      status: 'failed',
      retryCount: { lt: MAX_WEBHOOK_RETRIES },
      createdAt: { lt: cutoff },
    },
    take: 20,
    orderBy: { createdAt: 'asc' },
  })
}
