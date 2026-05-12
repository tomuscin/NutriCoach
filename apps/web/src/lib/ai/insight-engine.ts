// AI Insight Engine — ETAP 5
// Deterministic coaching insight generation.
// Three daily touchpoints: morning, midday, evening.
//
// Flow per insight:
//   buildAIContext → serializeContext → buildPrompt → callAI → extractJSON
//   → Zod parse → safety validate → persist → return

import 'server-only'
import * as Sentry from '@sentry/nextjs'
import { aiLogger, timer } from '@/lib/logger'
import { buildAIContext, serializeContext } from './context-builder'
import { buildPrompt } from './prompt-builder'
import { callAI, AI_MODELS, TOKEN_BUDGETS } from '@/lib/openai'
import {
  parseMorningInsight,
  parseMiddayInsight,
  parseEveningInsight,
  extractJSON,
  type MorningInsight,
  type MiddayInsight,
  type EveningInsight,
} from './schemas'
import {
  validateMorningOutput,
  validateMiddayOutput,
  validateEveningOutput,
} from './safety'
import { persistInsight } from './persistence'

// ─── Result types ─────────────────────────────────────────────────────────────

export type InsightResult<T> =
  | { ok: true; insight: T; persisted: boolean; latencyMs: number }
  | { ok: false; error: string; fallback: true }

// ─── Morning Insight ──────────────────────────────────────────────────────────

export async function generateMorningInsight(
  userId: string,
  requestId?: string,
  date: Date = new Date(),
): Promise<InsightResult<MorningInsight>> {
  const t = timer(aiLogger, 'generateMorningInsight')

  return Sentry.startSpan(
    { name: 'ai.morning_insight', op: 'ai', attributes: { userId } },
    async () => {
      try {
        const ctx = await buildAIContext(userId, date)
        const serialized = serializeContext(ctx)
        const { system, user, promptVersion } = buildPrompt('MORNING', ctx, serialized)

        const result = await callAI(system, user, {
          model: AI_MODELS.FAST,
          maxTokens: TOKEN_BUDGETS.MORNING,
          operation: 'morning_insight',
          requestId,
          promptVersion,
          userId,
        })

        const raw = extractJSON(result.content)
        const parsed = parseMorningInsight(raw)

        if (!parsed) {
          aiLogger.warn({ userId, raw: result.content.slice(0, 200) }, 'ai.morning.parse_failed')
          return { ok: false, error: 'Nie udało się sparsować odpowiedzi AI', fallback: true }
        }

        const safety = validateMorningOutput(parsed)
        const finalInsight = safety.sanitized ? (safety.sanitized as MorningInsight) : parsed

        if (!safety.safe) {
          aiLogger.warn({ userId, violations: safety.violations }, 'ai.morning.safety_violation')
          Sentry.addBreadcrumb({
            category: 'ai.safety',
            message: 'Morning insight safety clamped',
            level: 'warning',
            data: { violations: safety.violations },
          })
        }

        // Persist to DB
        const persisted = await persistInsight({
          userId,
          insightType: 'MORNING_BRIEF',
          deliveryMoment: 'MORNING',
          content: finalInsight.summary,
          recommendation: finalInsight.movement,
          promptVersion,
          model: AI_MODELS.FAST,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
          contextSnapshot: ctx,
          confidenceScore: finalInsight.confidence,
        }).then(() => true).catch((err) => {
          aiLogger.error({ userId, error: String(err) }, 'ai.morning.persist_failed')
          return false
        })

        const latencyMs = t.end({ userId, tokens: result.usage.totalTokens, confidence: finalInsight.confidence })

        return { ok: true, insight: finalInsight, persisted, latencyMs: latencyMs ?? result.latencyMs }

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        aiLogger.error({ userId, error: msg }, 'ai.morning.failed')
        Sentry.captureException(err, { tags: { operation: 'morning_insight', userId } })
        return { ok: false, error: msg, fallback: true }
      }
    },
  )
}

// ─── Midday Insight ───────────────────────────────────────────────────────────

export async function generateMiddayInsight(
  userId: string,
  requestId?: string,
  date: Date = new Date(),
): Promise<InsightResult<MiddayInsight>> {
  const t = timer(aiLogger, 'generateMiddayInsight')

  return Sentry.startSpan(
    { name: 'ai.midday_insight', op: 'ai', attributes: { userId } },
    async () => {
      try {
        const ctx = await buildAIContext(userId, date)
        const serialized = serializeContext(ctx)
        const { system, user, promptVersion } = buildPrompt('MIDDAY', ctx, serialized)

        const result = await callAI(system, user, {
          model: AI_MODELS.FAST,
          maxTokens: TOKEN_BUDGETS.MIDDAY,
          operation: 'midday_insight',
          requestId,
          promptVersion,
          userId,
        })

        const raw = extractJSON(result.content)
        const parsed = parseMiddayInsight(raw)

        if (!parsed) {
          aiLogger.warn({ userId, raw: result.content.slice(0, 200) }, 'ai.midday.parse_failed')
          return { ok: false, error: 'Nie udało się sparsować odpowiedzi AI', fallback: true }
        }

        const safety = validateMiddayOutput(parsed)
        if (!safety.safe) {
          aiLogger.warn({ userId, violations: safety.violations }, 'ai.midday.safety_violation')
        }

        const persisted = await persistInsight({
          userId,
          insightType: 'MIDDAY_CHECK',
          deliveryMoment: 'MIDDAY',
          content: parsed.summary,
          recommendation: parsed.tip,
          promptVersion,
          model: AI_MODELS.FAST,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
          contextSnapshot: ctx,
          confidenceScore: parsed.confidence,
        }).then(() => true).catch(() => false)

        const latencyMs = t.end({ userId, tokens: result.usage.totalTokens })

        return { ok: true, insight: parsed, persisted, latencyMs: latencyMs ?? result.latencyMs }

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        aiLogger.error({ userId, error: msg }, 'ai.midday.failed')
        Sentry.captureException(err, { tags: { operation: 'midday_insight', userId } })
        return { ok: false, error: msg, fallback: true }
      }
    },
  )
}

// ─── Evening Insight ──────────────────────────────────────────────────────────

export async function generateEveningInsight(
  userId: string,
  requestId?: string,
  date: Date = new Date(),
): Promise<InsightResult<EveningInsight>> {
  const t = timer(aiLogger, 'generateEveningInsight')

  return Sentry.startSpan(
    { name: 'ai.evening_insight', op: 'ai', attributes: { userId } },
    async () => {
      try {
        const ctx = await buildAIContext(userId, date)
        const serialized = serializeContext(ctx)
        const { system, user, promptVersion } = buildPrompt('EVENING', ctx, serialized)

        const result = await callAI(system, user, {
          model: AI_MODELS.FAST,
          maxTokens: TOKEN_BUDGETS.EVENING,
          operation: 'evening_insight',
          requestId,
          promptVersion,
          userId,
        })

        const raw = extractJSON(result.content)
        const parsed = parseEveningInsight(raw)

        if (!parsed) {
          aiLogger.warn({ userId, raw: result.content.slice(0, 200) }, 'ai.evening.parse_failed')
          return { ok: false, error: 'Nie udało się sparsować odpowiedzi AI', fallback: true }
        }

        const safety = validateEveningOutput(parsed)
        if (!safety.safe) {
          aiLogger.warn({ userId, violations: safety.violations }, 'ai.evening.safety_violation')
        }

        const persisted = await persistInsight({
          userId,
          insightType: 'EVENING_REVIEW',
          deliveryMoment: 'EVENING',
          content: parsed.summary,
          recommendation: parsed.tomorrowFocus,
          promptVersion,
          model: AI_MODELS.FAST,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
          contextSnapshot: ctx,
          confidenceScore: parsed.confidence,
        }).then(() => true).catch(() => false)

        const latencyMs = t.end({ userId, tokens: result.usage.totalTokens })

        return { ok: true, insight: parsed, persisted, latencyMs: latencyMs ?? result.latencyMs }

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        aiLogger.error({ userId, error: msg }, 'ai.evening.failed')
        Sentry.captureException(err, { tags: { operation: 'evening_insight', userId } })
        return { ok: false, error: msg, fallback: true }
      }
    },
  )
}
