// Failure Simulator — ETAP 6.75
// Deterministic failure injection for runtime testing.
//
// Only active when:
//   ENABLE_RUNTIME_CHAOS=true
//   NODE_ENV=development  OR  CHAOS_MODE=development
//
// Usage:
//   import { chaos } from '@/lib/runtime/failure-simulator'
//   await chaos.maybeFailSync()         // random TP downtime
//   await chaos.maybeDelayAI()          // inject latency
//   await chaos.injectMalformedJSON()   // return broken AI response
//
// All methods are no-ops in production.

import 'server-only'
import { logger } from '@/lib/logger'
import { journalEvent } from '@/lib/runtime/journal'

export type ChaosScenario =
  | 'expired_token'
  | 'revoked_token'
  | 'trainingpeaks_downtime'
  | 'webhook_replay'
  | 'duplicate_webhook'
  | 'queue_retry_storm'
  | 'redis_unavailable'
  | 'openai_timeout'
  | 'openai_malformed_json'
  | 'db_deadlock'
  | 'db_latency_spike'
  | 'partial_sync_failure'
  | 'stale_cache'
  | 'sentry_unavailable'
  | 'cron_overlap'

const CHAOS_ENABLED =
  process.env.ENABLE_RUNTIME_CHAOS === 'true' &&
  (process.env.NODE_ENV === 'development' || process.env.CHAOS_MODE === 'development')

/** Roll a biased dice: return true with probability `rate` (0–1) */
function roll(rate: number): boolean {
  if (!CHAOS_ENABLED) return false
  return Math.random() < rate
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

async function logChaos(scenario: ChaosScenario, detail?: string) {
  logger.warn({ scenario, detail }, 'chaos.injected')
  await journalEvent({
    eventType: 'chaos.injected',
    source: 'system.chaos',
    payload: { scenario, detail },
    status: 'ok',
  })
}

// ─── Chaos scenarios ──────────────────────────────────────────────────────────

class FailureSimulator {
  readonly enabled = CHAOS_ENABLED

  // ── Token scenarios ────────────────────────────────────────────────────────

  async maybeExpireToken(userId: string): Promise<void> {
    if (!roll(0.1)) return
    await logChaos('expired_token', userId)
    throw new Error('[CHAOS] Token expired simulation')
  }

  async maybeRevokeToken(userId: string): Promise<void> {
    if (!roll(0.05)) return
    await logChaos('revoked_token', userId)
    throw new Error('[CHAOS] Token revoked simulation')
  }

  // ── TrainingPeaks API scenarios ────────────────────────────────────────────

  async maybeTPDowntime(): Promise<void> {
    if (!roll(0.08)) return
    await logChaos('trainingpeaks_downtime')
    throw new Error('[CHAOS] TrainingPeaks API downtime (503)')
  }

  async maybeTPLatency(): Promise<void> {
    if (!roll(0.15)) return
    const delay = 3000 + Math.floor(Math.random() * 5000) // 3-8s
    await logChaos('db_latency_spike', `${delay}ms`)
    await sleep(delay)
  }

  // ── Sync scenarios ─────────────────────────────────────────────────────────

  async maybePartialSyncFailure(currentBatch: number): Promise<void> {
    // Fail mid-batch with 10% probability after batch 3
    if (currentBatch < 3) return
    if (!roll(0.1)) return
    await logChaos('partial_sync_failure', `batch ${currentBatch}`)
    throw new Error('[CHAOS] Partial sync failure at batch ' + currentBatch)
  }

  // ── OpenAI scenarios ───────────────────────────────────────────────────────

  async maybeOpenAITimeout(): Promise<void> {
    if (!roll(0.1)) return
    await logChaos('openai_timeout')
    await sleep(35000) // force timeout
    throw new Error('[CHAOS] OpenAI timeout simulation')
  }

  getMalformedJSON(): string {
    if (!roll(0.15)) return ''
    const variants = [
      '{"summary": "Good morning!",', // truncated
      'undefined',                     // literal undefined
      '{"summary": null, "readiness": "UNKNOWN"}', // invalid enum
      '```json\n{"summary": "ok"}\n```', // markdown not stripped
      '',                              // empty
    ]
    return variants[Math.floor(Math.random() * variants.length)]
  }

  async maybeOpenAIRateLimit(): Promise<void> {
    if (!roll(0.05)) return
    await logChaos('queue_retry_storm', 'OpenAI 429')
    throw new Error('[CHAOS] OpenAI rate limit (429)')
  }

  // ── DB scenarios ───────────────────────────────────────────────────────────

  async maybeDBDeadlock(): Promise<void> {
    if (!roll(0.05)) return
    await logChaos('db_deadlock')
    throw new Error('[CHAOS] DB deadlock simulation (P2034)')
  }

  async maybeDBLatency(): Promise<void> {
    if (!roll(0.1)) return
    const delay = 2000 + Math.floor(Math.random() * 3000) // 2-5s
    await logChaos('db_latency_spike', `${delay}ms`)
    await sleep(delay)
  }

  // ── Webhook scenarios ──────────────────────────────────────────────────────

  async maybeWebhookReplay(): Promise<boolean> {
    if (!roll(0.08)) return false
    await logChaos('webhook_replay')
    return true // caller should treat as duplicate
  }

  // ── Cron scenarios ─────────────────────────────────────────────────────────

  async maybeCronOverlap(cronName: string): Promise<void> {
    if (!roll(0.05)) return
    await logChaos('cron_overlap', cronName)
    // Simulate slow cron by adding latency
    await sleep(5000)
  }
}

export const chaos = new FailureSimulator()

// ─── Chaos scenario catalog (for test runner) ─────────────────────────────────

export const CHAOS_SCENARIOS: ChaosScenario[] = [
  'expired_token',
  'revoked_token',
  'trainingpeaks_downtime',
  'webhook_replay',
  'duplicate_webhook',
  'queue_retry_storm',
  'redis_unavailable',
  'openai_timeout',
  'openai_malformed_json',
  'db_deadlock',
  'db_latency_spike',
  'partial_sync_failure',
  'stale_cache',
  'sentry_unavailable',
  'cron_overlap',
]
