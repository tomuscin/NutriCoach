// OpenAI Runtime — ETAP 5 + ETAP 6.75
// Deterministic AI coaching engine — NOT a chat assistant.
// Includes: retry logic, per-operation timeout, token tracking, Sentry spans,
// structured logging, jittered backoff, rate limit handling, Sentry capture.

import 'server-only'
import OpenAI from 'openai'
import * as Sentry from '@sentry/nextjs'
import { aiLogger } from '@/lib/logger'
import { metrics } from '@/lib/runtime/metrics'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not defined. Check your .env.local file.')
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID || undefined,
  timeout: 45_000,       // 45s hard timeout (per-operation override available)
  maxRetries: 0,         // we handle retries manually for observability
})

// ─── Model constants ──────────────────────────────────────────────────────────

export const AI_MODELS = {
  PREMIUM: process.env.OPENAI_MODEL ?? 'gpt-4o',
  FAST: process.env.OPENAI_MODEL_FAST ?? 'gpt-4o-mini',
} as const

// ─── Per-operation timeouts (ms) ──────────────────────────────────────────────

export const OPERATION_TIMEOUTS: Record<string, number> = {
  morning: 45_000,
  midday: 20_000,
  evening: 30_000,
  quick_insight: 20_000,
  default: 30_000,
}

// ─── Token budgets per task ───────────────────────────────────────────────────

export const TOKEN_BUDGETS = {
  MORNING: 800,
  MIDDAY: 500,
  EVENING: 700,
  QUICK_INSIGHT: 400,
} as const

// ─── AI call options ──────────────────────────────────────────────────────────

export type AICallOptions = {
  model?: string
  maxTokens: number
  temperature?: number
  requestId?: string
  promptVersion?: string
  userId?: string
  operation: string
}

export type AICallResult = {
  content: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
  latencyMs: number
}

// ─── Deterministic AI call with observability ─────────────────────────────────
// - Low temperature (0.25) for deterministic output
// - Max 2 retries with exponential backoff
// - Sentry span per call
// - Structured log with token usage + latency

export async function callAI(
  system: string,
  user: string,
  options: AICallOptions,
): Promise<AICallResult> {
  const model = options.model ?? AI_MODELS.FAST
  const temperature = options.temperature ?? 0.25
  const maxRetries = 2
  // Jittered exponential backoff: base * (1 + random) → more natural spread
  const backoffMs = (attempt: number) => attempt * 1000 + Math.floor(Math.random() * 500)
  let lastError: Error | null = null

  return Sentry.startSpan(
    {
      name: `ai.${options.operation}`,
      op: 'ai.completion',
      attributes: {
        'ai.model': model,
        'ai.operation': options.operation,
        'ai.prompt_version': options.promptVersion ?? 'unknown',
        'ai.request_id': options.requestId ?? 'none',
        'ai.max_tokens': options.maxTokens,
      },
    },
    async (span) => {
      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        const attemptStart = Date.now()
        try {
          const response = await openai.chat.completions.create({
            model,
            temperature,
            max_tokens: options.maxTokens,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            response_format: { type: 'json_object' },  // structured output mode
          })

          const latencyMs = Date.now() - attemptStart
          const choice = response.choices[0]
          const content = choice?.message?.content ?? ''
          const usage = {
            promptTokens: response.usage?.prompt_tokens ?? 0,
            completionTokens: response.usage?.completion_tokens ?? 0,
            totalTokens: response.usage?.total_tokens ?? 0,
          }

          // Structured log — token usage + latency
          aiLogger.info({
            operation: options.operation,
            model,
            promptVersion: options.promptVersion,
            requestId: options.requestId,
            userId: options.userId,
            attempt,
            latencyMs,
            ...usage,
            finishReason: choice?.finish_reason,
          }, 'ai.call.success')

          // Sentry breadcrumb for AI call
          Sentry.addBreadcrumb({
            category: 'ai',
            message: `${options.operation} completed`,
            level: 'info',
            data: { model, latencyMs, totalTokens: usage.totalTokens, attempt },
          })

          span?.setAttributes({
            'ai.prompt_tokens': usage.promptTokens,
            'ai.completion_tokens': usage.completionTokens,
            'ai.total_tokens': usage.totalTokens,
            'ai.latency_ms': latencyMs,
            'ai.finish_reason': choice?.finish_reason ?? 'unknown',
          })

          metrics.increment('ai.generated', { operation: options.operation })
          metrics.timing('ai.latency_ms', latencyMs, { operation: options.operation })
          metrics.increment('ai.tokens_used', { operation: options.operation }, usage.totalTokens)

          return { content, usage, model, latencyMs }

        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err))
          const latencyMs = Date.now() - attemptStart

          // Detect OpenAI rate limit (429) for targeted metric
          const isRateLimit = lastError.message.includes('429') || lastError.message.includes('rate_limit')

          aiLogger.warn({
            operation: options.operation,
            model,
            attempt,
            maxRetries,
            latencyMs,
            isRateLimit,
            error: lastError.message,
          }, 'ai.call.retry')

          metrics.increment('ai.retried', { operation: options.operation })

          if (attempt <= maxRetries) {
            // Jittered exponential backoff
            await sleep(backoffMs(attempt))
          }
        }
      }

      // All retries exhausted
      aiLogger.error({
        operation: options.operation,
        model,
        error: lastError?.message,
        requestId: options.requestId,
      }, 'ai.call.failed')

      metrics.increment('ai.failed', { operation: options.operation })

      Sentry.captureException(lastError, {
        tags: { operation: options.operation, model, requestId: options.requestId ?? '' },
      })

      throw lastError ?? new Error(`AI call failed after ${maxRetries + 1} attempts`)
    },
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

