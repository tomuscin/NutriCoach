/**
 * NCIC Intent Classifier
 *
 * The public API for intent classification.
 * Orchestrates heuristics → scoring → warning generation → result assembly.
 *
 * Strategy:
 *   1. Run deterministic keyword + signal heuristics
 *   2. If confidence is high enough → return result
 *   3. If confidence is low → flag `fallbackNeeded` (caller decides on LLM)
 *   4. Always return a result — `unknown` is valid
 *
 * classifyIntent() is pure: no side effects, no I/O, no LLM calls.
 * The caller is responsible for LLM fallback when fallbackNeeded=true.
 */

import type {
  ClassificationInput,
  ClassificationResult,
  ClassificationWarning,
  DetectedIntent,
  IntentName,
} from './types'
import {
  INTENT_NAMES,
  confidenceLevel,
} from './types'
import { INTENT_REGISTRY } from './registry'
import {
  scoreAllIntents,
  needsFallback,
  type ScoredCandidate,
} from './heuristics'

// ─── Thresholds ───────────────────────────────────────────────────────────────

/** Score gap below which two intents are considered "conflicting" */
const CONFLICT_GAP = 0.08

/** Maximum number of intents to include in multi-intent result */
const MAX_INTENTS = 4

/** Minimum score for a secondary intent to be included */
const SECONDARY_THRESHOLD = 0.35

// ─── Warning Detection ────────────────────────────────────────────────────────

function buildWarnings(
  candidates: ScoredCandidate[],
  fallbackNeeded: boolean,
): ClassificationWarning[] {
  const warnings: ClassificationWarning[] = []

  if (fallbackNeeded) {
    warnings.push({
      type: 'low_confidence',
      message: 'Deterministic classification confidence is low — LLM fallback recommended',
    })
  }

  // Multi-intent detected
  const included = candidates.filter((c, i) => i === 0 || c.score >= SECONDARY_THRESHOLD)
  if (included.length > 1) {
    warnings.push({
      type: 'multi_intent_detected',
      message: `Multiple intents detected: ${included.map((c) => c.name).join(', ')}`,
      affectedIntents: included.map((c) => c.name),
    })
  }

  // Conflicting intents: top two within conflict gap
  if (candidates.length >= 2) {
    const [first, second] = candidates
    if (first.score - second.score < CONFLICT_GAP && second.score >= SECONDARY_THRESHOLD) {
      warnings.push({
        type: 'conflicting_intents',
        message: `Intents "${first.name}" and "${second.name}" have similar confidence scores`,
        affectedIntents: [first.name, second.name],
      })
    }
  }

  // No classification at all → unsupported
  if (candidates.length === 0) {
    warnings.push({
      type: 'unsupported_intent',
      message: 'No intent could be matched from the input',
    })
  }

  return warnings
}

// ─── Candidate → DetectedIntent ───────────────────────────────────────────────

function toDetectedIntent(candidate: ScoredCandidate): DetectedIntent {
  const definition = INTENT_REGISTRY[candidate.name]
  return {
    name: candidate.name,
    confidence: candidate.score,
    confidenceLevel: confidenceLevel(candidate.score),
    source: candidate.source,
    matchedKeywords: candidate.matchedKeywords,
    matchedSignals: definition?.contextualSignals ?? [],
    requiresCapabilities: definition?.capabilities ?? ['conversation.respond'],
  }
}

// ─── Unknown Intent Factory ───────────────────────────────────────────────────

function buildUnknownIntent(): DetectedIntent {
  return {
    name: INTENT_NAMES.UNKNOWN,
    confidence: 0.1,
    confidenceLevel: 'low',
    source: 'default',
    matchedKeywords: [],
    matchedSignals: [],
    requiresCapabilities: ['conversation.respond'],
  }
}

// ─── Deduplicate Capabilities ─────────────────────────────────────────────────

function mergeCapabilities(intents: DetectedIntent[]): string[] {
  const seen = new Set<string>()
  for (const intent of intents) {
    for (const cap of intent.requiresCapabilities) {
      seen.add(cap)
    }
  }
  return Array.from(seen)
}

// ─── Main API ─────────────────────────────────────────────────────────────────

/**
 * Classify the intent(s) of a user message.
 *
 * @param input - Message + optional runtime context + recent intent history
 * @returns ClassificationResult — always returns (never throws)
 *
 * @example
 * const result = classifyIntent({ message: "Zjadłem burgera i byłem na rowerze" })
 * // result.intents → [food_log (0.78), training_reference (0.72)]
 * // result.isMultiIntent → true
 * // result.suggestedCapabilities → ['nutrition.ingest', 'training.contextualize']
 */
export function classifyIntent(input: ClassificationInput): ClassificationResult {
  const { message, runtimeContext, recentIntents } = input

  if (!message || message.trim().length === 0) {
    const unknown = buildUnknownIntent()
    return {
      intents: [unknown],
      primaryIntent: unknown,
      isMultiIntent: false,
      fallbackNeeded: true,
      suggestedCapabilities: ['conversation.respond'],
      warnings: [{ type: 'unsupported_intent', message: 'Empty message provided' }],
      classifiedAt: new Date().toISOString(),
    }
  }

  // Score all intents deterministically
  const candidates = scoreAllIntents(message, runtimeContext, recentIntents)
  const fallback = needsFallback(candidates)

  // Select intents to include
  let includedCandidates: ScoredCandidate[]
  if (candidates.length === 0) {
    includedCandidates = []
  } else {
    // Always include primary; include secondaries above threshold, up to MAX_INTENTS
    includedCandidates = candidates
      .filter((c, i) => i === 0 || c.score >= SECONDARY_THRESHOLD)
      .slice(0, MAX_INTENTS)
  }

  const detectedIntents: DetectedIntent[] = includedCandidates.map(toDetectedIntent)
  const primaryIntent = detectedIntents[0] ?? buildUnknownIntent()

  if (detectedIntents.length === 0) {
    detectedIntents.push(buildUnknownIntent())
  }

  const warnings = buildWarnings(candidates, fallback)

  const result: ClassificationResult = {
    intents: detectedIntents,
    primaryIntent,
    isMultiIntent: detectedIntents.length > 1,
    fallbackNeeded: fallback,
    suggestedCapabilities: mergeCapabilities(detectedIntents),
    warnings,
    classifiedAt: new Date().toISOString(),
  }

  // Observability log
  if (process.env.NODE_ENV !== 'production') {
    const topIntents = detectedIntents.map((i) => `${i.name}(${i.confidence.toFixed(2)})`).join(', ')
    console.info(
      `[intent] primary="${primaryIntent.name}" confidence=${primaryIntent.confidence.toFixed(2)} ` +
      `level="${primaryIntent.confidenceLevel}" intents=[${topIntents}] ` +
      `capabilities=[${result.suggestedCapabilities.join(',')}] ` +
      `fallback=${fallback} warnings=${warnings.length}`,
    )
    if (primaryIntent.matchedKeywords.length > 0) {
      console.info(`[intent] matched keywords: ${primaryIntent.matchedKeywords.slice(0, 5).join(', ')}`)
    }
  }

  return result
}
