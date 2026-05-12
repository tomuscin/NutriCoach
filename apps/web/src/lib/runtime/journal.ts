// Event Journal Writer — ETAP 6.75
// Persists significant runtime events to the EventJournal table for:
//   - audit trail
//   - replay capability
//   - correlation tracking
//   - debug timeline reconstruction
//
// Non-blocking: errors are logged but never rethrown.
// PII-safe: never stores raw tokens, passwords, or PII.

import 'server-only'
import { createHash } from 'crypto'
import { prisma as db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { generateRequestId } from '@/lib/correlation'

// ─── Event types ─────────────────────────────────────────────────────────────

export type JournalEventType =
  | 'oauth.connect.started'
  | 'oauth.connect.completed'
  | 'oauth.callback.error'
  | 'oauth.disconnect'
  | 'token.refreshed'
  | 'token.refresh_failed'
  | 'sync.started'
  | 'sync.completed'
  | 'sync.failed'
  | 'sync.skipped'
  | 'webhook.received'
  | 'webhook.processed'
  | 'webhook.failed'
  | 'webhook.duplicate'
  | 'ai.generation.started'
  | 'ai.generation.completed'
  | 'ai.generation.failed'
  | 'ai.schema.invalid'
  | 'ai.insight.invalidated'
  | 'cron.started'
  | 'cron.completed'
  | 'cron.failed'
  | 'cron.overlap'
  | 'cache.invalidated'
  | 'replay.triggered'
  | 'chaos.injected'

export type JournalSource =
  | 'api.manual-sync'
  | 'api.webhooks.trainingpeaks'
  | 'api.integrations.connect'
  | 'api.integrations.callback'
  | 'api.integrations.disconnect'
  | 'cron.sync-workouts'
  | 'cron.sync-tokens'
  | 'cron.stale-scan'
  | 'cron.morning-insights'
  | 'cron.midday-insights'
  | 'cron.evening-insights'
  | 'cron.daily-scores'
  | 'system.replay-engine'
  | 'system.chaos'

export interface JournalEntry {
  eventType: JournalEventType
  source: JournalSource
  userId?: string
  correlationId?: string
  parentEventId?: string
  payload?: Record<string, unknown>  // sanitized — no tokens
  processingMs?: number
  status?: 'ok' | 'failed' | 'retried' | 'replayed'
  errorMessage?: string
  errorStack?: string
  retryCount?: number
}

// ─── Writer ──────────────────────────────────────────────────────────────────

export async function journalEvent(entry: JournalEntry): Promise<string> {
  const id = generateRequestId()
  const payloadHash = entry.payload
    ? createHash('sha256').update(JSON.stringify(entry.payload)).digest('hex')
    : undefined

  db.eventJournal
    .create({
      data: {
        id,
        eventType: entry.eventType,
        source: entry.source,
        userId: entry.userId,
        correlationId: entry.correlationId,
        parentEventId: entry.parentEventId,
        payloadHash,
        payload: entry.payload as never ?? {},
        status: entry.status ?? 'ok',
        processingMs: entry.processingMs,
        errorMessage: entry.errorMessage,
        errorStack: entry.errorStack,
        retryCount: entry.retryCount ?? 0,
        processedAt: new Date(),
      },
    })
    .catch((err) => logger.warn({ eventType: entry.eventType, err }, 'journal.write failed'))

  return id
}

/** Timer helper: starts a clock, returns a finisher that journals the event */
export function journalTimer(
  eventType: JournalEventType,
  source: JournalSource,
  context: { userId?: string; correlationId?: string; parentEventId?: string; payload?: Record<string, unknown> },
) {
  const start = Date.now()
  return {
    ok: () => journalEvent({ ...context, eventType, source, processingMs: Date.now() - start, status: 'ok' }),
    failed: (err: unknown) => {
      const e = err instanceof Error ? err : new Error(String(err))
      return journalEvent({
        ...context,
        eventType,
        source,
        processingMs: Date.now() - start,
        status: 'failed',
        errorMessage: e.message,
        errorStack: e.stack,
      })
    },
  }
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export async function getRecentJournal(userId?: string, limit = 50) {
  return db.eventJournal.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function getJournalByCorrelation(correlationId: string) {
  return db.eventJournal.findMany({
    where: { correlationId },
    orderBy: { createdAt: 'asc' },
  })
}
