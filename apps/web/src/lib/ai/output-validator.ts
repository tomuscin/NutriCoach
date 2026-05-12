// AI Output Validator — ETAP 6.75
// Strict, versioned validation of all AI-generated content.
//
// Wraps existing Zod schemas with:
//   - raw snapshot logging on failure
//   - schema version tagging
//   - structured error reporting
//   - auto-rejection of hallucinated structures
//   - Sentry capture with sanitized payload

import 'server-only'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { aiLogger } from '@/lib/logger'
import { metrics } from '@/lib/runtime/metrics'
import {
  MorningInsightSchema,
  MiddayInsightSchema,
  EveningInsightSchema,
  extractJSON,
  type MorningInsight,
  type MiddayInsight,
  type EveningInsight,
} from '@/lib/ai/schemas'

// ─── Schema versions ─────────────────────────────────────────────────────────

export const SCHEMA_VERSIONS = {
  morning: 'v1',
  midday: 'v1',
  evening: 'v1',
} as const

export type InsightType = keyof typeof SCHEMA_VERSIONS

// ─── Validation result ────────────────────────────────────────────────────────

export type AIValidationResult<T> =
  | { valid: true; data: T; schemaVersion: string }
  | { valid: false; error: AIValidationError }

export type AIValidationError = {
  code: 'EMPTY_RESPONSE' | 'JSON_PARSE_FAILED' | 'SCHEMA_INVALID' | 'HALLUCINATED_STRUCTURE' | 'TRUNCATED'
  message: string
  rawSnapshot: string  // first 500 chars of raw content (sanitized)
  zodErrors?: z.ZodError
  schemaVersion: string
}

// ─── Validators ───────────────────────────────────────────────────────────────

export function validateMorningAIOutput(
  rawContent: string,
  requestId?: string,
): AIValidationResult<MorningInsight> {
  return validateOutput(rawContent, 'morning', MorningInsightSchema, requestId)
}

export function validateMiddayAIOutput(
  rawContent: string,
  requestId?: string,
): AIValidationResult<MiddayInsight> {
  return validateOutput(rawContent, 'midday', MiddayInsightSchema, requestId)
}

export function validateEveningAIOutput(
  rawContent: string,
  requestId?: string,
): AIValidationResult<EveningInsight> {
  return validateOutput(rawContent, 'evening', EveningInsightSchema, requestId)
}

// ─── Core validation function ─────────────────────────────────────────────────

function validateOutput<T>(
  rawContent: string,
  type: InsightType,
  schema: z.ZodSchema<T>,
  requestId?: string,
): AIValidationResult<T> {
  const schemaVersion = SCHEMA_VERSIONS[type]
  const rawSnapshot = rawContent.slice(0, 500).replace(/[^\x20-\x7E\n]/g, '?')

  // 1. Empty response check
  if (!rawContent || rawContent.trim().length === 0) {
    const error = buildError('EMPTY_RESPONSE', 'AI returned empty content', rawSnapshot, schemaVersion)
    captureValidationError(error, type, requestId)
    return { valid: false, error }
  }

  // 2. Truncation detection (incomplete JSON — ends mid-string or mid-object)
  const trimmed = rawContent.trim()
  if (
    (trimmed.startsWith('{') && !trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && !trimmed.endsWith(']'))
  ) {
    const error = buildError('TRUNCATED', 'AI response appears truncated', rawSnapshot, schemaVersion)
    captureValidationError(error, type, requestId)
    return { valid: false, error }
  }

  // 3. JSON extraction
  const extracted = extractJSON(rawContent)
  if (extracted === null) {
    const error = buildError('JSON_PARSE_FAILED', 'Cannot extract JSON from AI response', rawSnapshot, schemaVersion)
    captureValidationError(error, type, requestId)
    return { valid: false, error }
  }

  // 4. Hallucination detection — must be an object, not array/primitive
  if (typeof extracted !== 'object' || Array.isArray(extracted) || extracted === null) {
    const error = buildError('HALLUCINATED_STRUCTURE', `Expected object, got ${Array.isArray(extracted) ? 'array' : typeof extracted}`, rawSnapshot, schemaVersion)
    captureValidationError(error, type, requestId)
    return { valid: false, error }
  }

  // 5. Zod schema validation
  const result = schema.safeParse(extracted)
  if (!result.success) {
    const error = buildError(
      'SCHEMA_INVALID',
      `Schema validation failed: ${result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      rawSnapshot,
      schemaVersion,
      result.error,
    )
    captureValidationError(error, type, requestId)
    return { valid: false, error }
  }

  // Valid
  aiLogger.debug({ type, schemaVersion, requestId }, 'ai.output.valid')
  return { valid: true, data: result.data, schemaVersion }
}

// ─── Error builder ────────────────────────────────────────────────────────────

function buildError(
  code: AIValidationError['code'],
  message: string,
  rawSnapshot: string,
  schemaVersion: string,
  zodErrors?: z.ZodError,
): AIValidationError {
  return { code, message, rawSnapshot, schemaVersion, zodErrors }
}

// ─── Sentry + metrics capture ──────────────────────────────────────────────────

function captureValidationError(
  error: AIValidationError,
  type: string,
  requestId?: string,
) {
  aiLogger.warn({
    code: error.code,
    type,
    requestId,
    schemaVersion: error.schemaVersion,
    message: error.message,
    rawSnapshot: error.rawSnapshot,
    zodErrors: error.zodErrors?.errors,
  }, 'ai.output.invalid')

  metrics.increment(
    error.code === 'JSON_PARSE_FAILED' || error.code === 'TRUNCATED' || error.code === 'EMPTY_RESPONSE'
      ? 'ai.malformed_json'
      : 'ai.schema_invalid',
    { type },
  )

  Sentry.withScope((scope) => {
    scope.setTag('ai.validation.code', error.code)
    scope.setTag('ai.type', type)
    scope.setTag('ai.schema_version', error.schemaVersion)
    if (requestId) scope.setTag('request_id', requestId)
    scope.setContext('ai_output', {
      code: error.code,
      rawSnapshot: error.rawSnapshot,
      zodErrors: error.zodErrors?.errors?.slice(0, 5),
    })
    Sentry.captureMessage(`AI output validation failed: ${error.code}`, 'warning')
  })
}
