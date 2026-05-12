// AI Insight Engine — ETAP 5 + ETAP 5.5
// Deterministic coaching insight generation.
// Three daily touchpoints: morning, midday, evening.
//
// ETAP 5.5 additions:
//   - Quality Engine integration (pre-generation confidence breakdown)
//   - canGenerate gate (block if data insufficient)
//   - explainability stored in persistence
//   - quality breakdown stored per insight
//   - Sentry quality spans + low-confidence breadcrumbs
//
// Flow per insight:
//   buildAIContext → computeQuality → (canGenerate gate) →
//   serializeContext → buildPrompt(+qualityReport) → callAI →
//   extractJSON → Zod parse → safety validate → persistInsight(+quality) → return

import 'server-only'
import * as Sentry from '@sentry/nextjs'
import { aiLogger, timer } from '@/lib/logger'
import { buildAIContext, serializeContext } from './context-builder'
import { buildPrompt } from './prompt-builder'
import { computeQuality, QUALITY_THRESHOLDS } from './quality-engine'
import type { AIConfidenceBreakdown } from './quality-engine'
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
  | {
      ok: true
      insight: T
      persisted: boolean
      latencyMs: number
      quality: AIConfidenceBreakdown
    }
  | { ok: false; error: string; fallback: true; quality?: AIConfidenceBreakdown }

// ─── Morning Insight ──────────────────────────────────────────────────────────

export async function generateMorningInsight(
  userId: string,
  requestId?: string,
  date: Date = new Date(),
): Promise<InsightResult<MorningInsight>> {
  const t = timer(aiLogger, 'generateMorningInsight')

  return Sentry.startSpan(
    { name: 'ai.morning_insight', op: 'ai', attributes: { userId } },
    async (span) => {
      try {
        const ctx = await buildAIContext(userId, date)
        const qualityReport = computeQuality(ctx)
        const { breakdown } = qualityReport

        span?.setAttributes({
          'ai.quality.overall': breakdown.overall,
          'ai.quality.tier': qualityReport.tier,
          'ai.quality.missing_signals': breakdown.missingSignals.length,
        })

        // Gate: insufficient data
        if (!qualityReport.canGenerate) {
          aiLogger.warn({ userId, quality: breakdown.overall, missing: breakdown.missingSignals }, 'ai.morning.insufficient_data')
          Sentry.addBreadcrumb({
            category: 'ai.quality',
            message: 'Morning insight blocked — insufficient data',
            level: 'warning',
            data: { quality: breakdown.overall, missing: breakdown.missingSignals },
          })
          return { ok: false, error: 'Za mało danych do wygenerowania insightu. Uzupełnij dane snu, wagi i żywienia.', fallback: true, quality: breakdown }
        }

        // Low confidence warning breadcrumb
        if (breakdown.overall < QUALITY_THRESHOLDS.MEDIUM) {
          Sentry.addBreadcrumb({
            category: 'ai.quality',
            message: 'Low confidence morning insight',
            level: 'info',
            data: { quality: breakdown.overall, tier: qualityReport.tier },
          })
        }

        const serialized = serializeContext(ctx)
        const { system, user, promptVersion } = buildPrompt('MORNING', ctx, serialized, qualityReport)

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
          return { ok: false, error: 'Nie udało się sparsować odpowiedzi AI', fallback: true, quality: breakdown }
        }

        const safety = validateMorningOutput(parsed)
        const finalInsight = safety.sanitized ? (safety.sanitized as MorningInsight) : parsed

        if (!safety.safe) {
          aiLogger.warn({ userId, violations: safety.violations }, 'ai.morning.safety_violation')
          Sentry.addBreadcrumb({ category: 'ai.safety', message: 'Morning insight safety clamped', level: 'warning', data: { violations: safety.violations } })
        }

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
          qualityBreakdown: breakdown,
          primaryDrivers: finalInsight.explanations?.primaryDrivers ?? [],
          supportingSignals: finalInsight.explanations?.supportingSignals ?? [],
          explanationWarnings: finalInsight.explanations?.warnings ?? [],
        }).then(() => true).catch((err) => {
          aiLogger.error({ userId, error: String(err) }, 'ai.morning.persist_failed')
          return false
        })

        const latencyMs = t.end({ userId, tokens: result.usage.totalTokens, confidence: finalInsight.confidence, quality: breakdown.overall }) ?? result.latencyMs

        return { ok: true, insight: finalInsight, persisted, latencyMs, quality: breakdown }

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
    async (span) => {
      try {
        const ctx = await buildAIContext(userId, date)
        const qualityReport = computeQuality(ctx)
        const { breakdown } = qualityReport

        span?.setAttributes({ 'ai.quality.overall': breakdown.overall, 'ai.quality.tier': qualityReport.tier })

        if (!qualityReport.canGenerate) {
          aiLogger.warn({ userId, quality: breakdown.overall }, 'ai.midday.insufficient_data')
          return { ok: false, error: 'Za mało danych do wygenerowania insightu.', fallback: true, quality: breakdown }
        }

        const serialized = serializeContext(ctx)
        const { system, user, promptVersion } = buildPrompt('MIDDAY', ctx, serialized, qualityReport)

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
          return { ok: false, error: 'Nie udało się sparsować odpowiedzi AI', fallback: true, quality: breakdown }
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
          qualityBreakdown: breakdown,
          primaryDrivers: parsed.explanations?.primaryDrivers ?? [],
          supportingSignals: parsed.explanations?.supportingSignals ?? [],
          explanationWarnings: parsed.explanations?.warnings ?? [],
        }).then(() => true).catch(() => false)

        const latencyMs = t.end({ userId, tokens: result.usage.totalTokens }) ?? result.latencyMs

        return { ok: true, insight: parsed, persisted, latencyMs, quality: breakdown }

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
    async (span) => {
      try {
        const ctx = await buildAIContext(userId, date)
        const qualityReport = computeQuality(ctx)
        const { breakdown } = qualityReport

        span?.setAttributes({ 'ai.quality.overall': breakdown.overall, 'ai.quality.tier': qualityReport.tier })

        if (!qualityReport.canGenerate) {
          aiLogger.warn({ userId, quality: breakdown.overall }, 'ai.evening.insufficient_data')
          return { ok: false, error: 'Za mało danych do wygenerowania insightu.', fallback: true, quality: breakdown }
        }

        const serialized = serializeContext(ctx)
        const { system, user, promptVersion } = buildPrompt('EVENING', ctx, serialized, qualityReport)

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
          return { ok: false, error: 'Nie udało się sparsować odpowiedzi AI', fallback: true, quality: breakdown }
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
          qualityBreakdown: breakdown,
          primaryDrivers: parsed.explanations?.primaryDrivers ?? [],
          supportingSignals: parsed.explanations?.supportingSignals ?? [],
          explanationWarnings: parsed.explanations?.warnings ?? [],
        }).then(() => true).catch(() => false)

        const latencyMs = t.end({ userId, tokens: result.usage.totalTokens }) ?? result.latencyMs

        return { ok: true, insight: parsed, persisted, latencyMs, quality: breakdown }

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        aiLogger.error({ userId, error: msg }, 'ai.evening.failed')
        Sentry.captureException(err, { tags: { operation: 'evening_insight', userId } })
        return { ok: false, error: msg, fallback: true }
      }
    },
  )
}
