/**
 * NCIC Intent Heuristics
 *
 * Pure, deterministic functions for keyword matching and confidence scoring.
 * No LLM. No side effects. Same input → same output.
 *
 * Heuristic pipeline:
 *   1. Normalize & tokenize message
 *   2. Match against intent keyword sets
 *   3. Apply contextual signal boosts
 *   4. Apply conversation continuity boosts
 *   5. Return scored candidates
 */

import type {
  IntentName,
  IntentConfidenceScore,
  ClassificationSource,
  RuntimeContextHint,
} from './types'
import { INTENT_NAMES } from './types'
import { INTENT_REGISTRY, INTENT_REGISTRY_ORDER } from './registry'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum score to include an intent in results */
const MIN_INCLUDE_THRESHOLD = 0.25

/** Minimum score to consider classification confident (no LLM fallback) */
const FALLBACK_THRESHOLD = 0.35

/** Signal boost applied per matching contextual signal domain */
const SIGNAL_BOOST_PER_DOMAIN = 0.08

/** Boost applied when last conversation touched same domain */
const CONTINUITY_BOOST = 0.1

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Lowercase and strip Polish diacritics for robust matching.
 * Diacritics: ą→a, ę→e, ó→o, ś→s, ł→l, ż→z, ź→z, ć→c, ń→n
 */
function normalizePl(text: string): string {
  return text
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ł/g, 'l').replace(/ż/g, 'z')
    .replace(/ź/g, 'z').replace(/ć/g, 'c').replace(/ń/g, 'n')
}

/**
 * Extract meaningful tokens from a message.
 * Splits on whitespace/punctuation, strips empties, normalizes.
 */
export function tokenize(message: string): string[] {
  return normalizePl(message)
    .split(/[\s,.:;!?()\[\]{}"'\/\\-]+/)
    .filter((t) => t.length >= 2)
}

// ─── Keyword Matching ─────────────────────────────────────────────────────────

interface KeywordMatchResult {
  matched: string[]
  /** Ratio: matched unique keywords / total keywords in set, capped at 1 */
  coverageScore: IntentConfidenceScore
}

/**
 * Find which keywords from a set appear in the tokenized message.
 * Supports both exact token match and substring-in-message match (for phrases).
 */
export function matchKeywords(
  tokens: string[],
  normalizedMessage: string,
  keywords: string[],
): KeywordMatchResult {
  const matched: string[] = []

  for (const kw of keywords) {
    const normalizedKw = normalizePl(kw)

    if (normalizedKw.includes(' ')) {
      // Phrase match: check in full normalized message
      if (normalizedMessage.includes(normalizedKw)) {
        matched.push(kw)
      }
    } else {
      // Token match: check in token set
      if (tokens.includes(normalizedKw)) {
        matched.push(kw)
      }
    }
  }

  // Coverage: each matched keyword contributes, but heavily diminishing returns
  const coverageScore = matched.length === 0
    ? 0
    : Math.min(1, 0.5 + matched.length * 0.15)

  return { matched, coverageScore }
}

// ─── Signal Boost ─────────────────────────────────────────────────────────────

/**
 * Apply runtime signal boost to a base score.
 * If user has active signals in a domain relevant to this intent, boost it.
 */
export function applySignalBoost(
  baseScore: IntentConfidenceScore,
  intentName: IntentName,
  context: RuntimeContextHint | undefined,
): IntentConfidenceScore {
  if (!context) return baseScore

  const definition = INTENT_REGISTRY[intentName]
  if (!definition || definition.contextualSignals.length === 0) return baseScore

  let boost = 0
  for (const domain of definition.contextualSignals) {
    const recentlyActive = context.recentDomains.includes(
      domain as 'nutrition' | 'training' | 'recovery' | 'behavioral' | 'conversation',
    )
    if (recentlyActive) {
      boost += SIGNAL_BOOST_PER_DOMAIN
    }
  }

  // Additional specific boosts
  if (intentName === INTENT_NAMES.RECOVERY_REFLECTION) {
    if (context.hasTrainingToday) boost += 0.05
    if (context.recoveryStatus === 'poor' || context.recoveryStatus === 'moderate') {
      boost += 0.08
    }
  }

  if (intentName === INTENT_NAMES.FOOD_LOG && context.hasNutritionToday) {
    boost += 0.05
  }

  return Math.min(1, baseScore + boost)
}

// ─── Continuity Boost ─────────────────────────────────────────────────────────

/**
 * If recent conversation touched the same intent domain, boost slightly.
 * This enables "jestem zmęczony" (I'm tired) to resolve as recovery_reflection
 * when the last message was about training.
 */
export function applyContinuityBoost(
  score: IntentConfidenceScore,
  intentName: IntentName,
  recentIntents: IntentName[] | undefined,
): IntentConfidenceScore {
  if (!recentIntents || recentIntents.length === 0) return score

  const RELATED_INTENTS: Partial<Record<IntentName, IntentName[]>> = {
    [INTENT_NAMES.RECOVERY_REFLECTION]: [INTENT_NAMES.TRAINING_REFERENCE, INTENT_NAMES.BEHAVIORAL_REFLECTION],
    [INTENT_NAMES.MEAL_ANALYSIS]: [INTENT_NAMES.FOOD_LOG],
    [INTENT_NAMES.PROGRESS_CHECK]: [INTENT_NAMES.GOAL_UPDATE, INTENT_NAMES.FOOD_LOG, INTENT_NAMES.TRAINING_REFERENCE],
    [INTENT_NAMES.BEHAVIORAL_REFLECTION]: [INTENT_NAMES.RECOVERY_REFLECTION],
  }

  const related = RELATED_INTENTS[intentName] ?? []
  const hasRelatedRecent = recentIntents.some((r) => related.includes(r))
  return hasRelatedRecent ? Math.min(1, score + CONTINUITY_BOOST) : score
}

// ─── Scored Candidate ─────────────────────────────────────────────────────────

export interface ScoredCandidate {
  name: IntentName
  score: IntentConfidenceScore
  matchedKeywords: string[]
  source: ClassificationSource
}

// ─── Score All Intents ────────────────────────────────────────────────────────

export function scoreAllIntents(
  message: string,
  context?: RuntimeContextHint,
  recentIntents?: IntentName[],
): ScoredCandidate[] {
  const normalizedMessage = normalizePl(message)
  const tokens = tokenize(message)
  const candidates: ScoredCandidate[] = []

  for (const intentName of INTENT_REGISTRY_ORDER) {
    if (intentName === INTENT_NAMES.UNKNOWN) continue

    const definition = INTENT_REGISTRY[intentName]
    const { matched, coverageScore } = matchKeywords(tokens, normalizedMessage, definition.keywords)

    // No keyword match at all → skip (signal boost alone won't surface it)
    if (matched.length === 0) continue

    // Base score from coverage
    let score = Math.min(definition.baseConfidence, coverageScore * definition.baseConfidence + 0.15)

    // Apply runtime signal boost
    score = applySignalBoost(score, intentName as IntentName, context)

    // Apply conversation continuity boost
    score = applyContinuityBoost(score, intentName as IntentName, recentIntents)

    if (score >= MIN_INCLUDE_THRESHOLD) {
      candidates.push({
        name: intentName as IntentName,
        score,
        matchedKeywords: matched,
        source: matched.length > 0 ? 'keyword-match' : 'signal-context',
      })
    }
  }

  // Sort by score descending
  return candidates.sort((a, b) => b.score - a.score)
}

// ─── Fallback Detection ───────────────────────────────────────────────────────

export function needsFallback(candidates: ScoredCandidate[]): boolean {
  if (candidates.length === 0) return true
  return candidates[0].score < FALLBACK_THRESHOLD
}
