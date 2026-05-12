// Runtime Metrics Registry — ETAP 6.75
// Lightweight counter/gauge system backed by RuntimeMetric DB table.
// Fire-and-forget — never throws, never blocks the caller.
//
// Usage:
//   import { metrics } from '@/lib/runtime/metrics'
//   metrics.increment('sync.success', { provider: 'TRAININGPEAKS' })
//   metrics.gauge('ai.latency_ms', 423, { operation: 'morning' })

import 'server-only'
import { prisma as db } from '@/lib/db'
import { logger } from '@/lib/logger'

// ─── Metric names (typed registry) ──────────────────────────────────────────

export type MetricName =
  // Sync
  | 'sync.success'
  | 'sync.failed'
  | 'sync.workouts_created'
  | 'sync.workouts_updated'
  | 'sync.token_refreshed'
  | 'sync.token_refresh_failed'
  // Webhooks
  | 'webhook.received'
  | 'webhook.processed'
  | 'webhook.failed'
  | 'webhook.duplicate'
  | 'webhook.replay_blocked'
  | 'webhook.retried'
  // AI
  | 'ai.generated'
  | 'ai.failed'
  | 'ai.malformed_json'
  | 'ai.schema_invalid'
  | 'ai.low_confidence'
  | 'ai.retried'
  | 'ai.latency_ms'
  | 'ai.insight_invalidated'
  | 'ai.tokens_used'
  // Queue / Cron
  | 'cron.ran'
  | 'cron.failed'
  | 'cron.duration_ms'
  | 'cron.overlap'
  // Cache
  | 'cache.invalidated'
  | 'cache.corruption'
  // OAuth
  | 'oauth.connect'
  | 'oauth.disconnect'
  | 'oauth.callback_error'
  // DLQ
  | 'dlq.sync_enqueued'
  | 'dlq.webhook_enqueued'
  | 'dlq.ai_enqueued'
  | 'dlq.recovered'

type Labels = Record<string, string | number>

// ─── Metric writer ───────────────────────────────────────────────────────────

class MetricsRegistry {
  /**
   * Increment a counter metric by `delta` (default 1).
   * Non-blocking — errors logged but never rethrown.
   */
  increment(name: MetricName, labels?: Labels, delta = 1): void {
    const date = dayStart()
    db.runtimeMetric
      .upsert({
        where: { metric_name_date: { name, date } },
        update: { value: { increment: delta }, labels: labels as never },
        create: { name, value: delta, labels: labels as never ?? {}, date },
      })
      .catch((err) => logger.warn({ name, err }, 'metrics.increment failed'))
  }

  /**
   * Set a gauge metric (absolute value).
   */
  gauge(name: MetricName, value: number, labels?: Labels): void {
    const date = dayStart()
    db.runtimeMetric
      .upsert({
        where: { metric_name_date: { name, date } },
        update: { value, labels: labels as never },
        create: { name, value, labels: labels as never ?? {}, date },
      })
      .catch((err) => logger.warn({ name, err }, 'metrics.gauge failed'))
  }

  /**
   * Record a timing metric (adds to daily sum, useful for averages).
   */
  timing(name: MetricName, ms: number, labels?: Labels): void {
    this.increment(name, labels, ms)
  }

  /**
   * Read metrics for the last N days. Returns sorted by date desc.
   */
  async read(names: MetricName[], days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return db.runtimeMetric.findMany({
      where: { name: { in: names }, date: { gte: since } },
      orderBy: [{ name: 'asc' }, { date: 'desc' }],
    })
  }

  /**
   * Read today's metrics for the runtime dashboard.
   */
  async readToday() {
    return db.runtimeMetric.findMany({
      where: { date: dayStart() },
      orderBy: { name: 'asc' },
    })
  }
}

function dayStart(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export const metrics = new MetricsRegistry()
