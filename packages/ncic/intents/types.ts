/**
 * NCIC Canonical Intent Taxonomy
 *
 * Defines what a user can intend in a conversational interaction.
 * These are the runtime's vocabulary for understanding user messages.
 *
 * Design:
 *   - 10 canonical intents — exhaustive enough for v1, narrow enough to be precise
 *   - Every user utterance maps to one or more of these
 *   - `unknown` is a valid, first-class intent (not a failure state)
 *   - Intents drive capability routing — not AI generation directly
 */

// ─── Canonical Intent Names ───────────────────────────────────────────────────

export const INTENT_NAMES = {
  FOOD_LOG: 'food_log',
  MEAL_ANALYSIS: 'meal_analysis',
  TRAINING_REFERENCE: 'training_reference',
  RECOVERY_REFLECTION: 'recovery_reflection',
  BEHAVIORAL_REFLECTION: 'behavioral_reflection',
  GOAL_UPDATE: 'goal_update',
  PROGRESS_CHECK: 'progress_check',
  COACH_QUESTION: 'coach_question',
  CASUAL_CONVERSATION: 'casual_conversation',
  UNKNOWN: 'unknown',
} as const

export type IntentName = (typeof INTENT_NAMES)[keyof typeof INTENT_NAMES]

// ─── Intent Confidence ────────────────────────────────────────────────────────

/** 0–1 float. Above 0.7 = high confidence. Below 0.3 = fallback to LLM. */
export type IntentConfidenceScore = number

export type IntentConfidenceLevel = 'high' | 'medium' | 'low'

export function confidenceLevel(score: IntentConfidenceScore): IntentConfidenceLevel {
  if (score >= 0.7) return 'high'
  if (score >= 0.4) return 'medium'
  return 'low'
}

// ─── Intent Classification Source ─────────────────────────────────────────────

export type ClassificationSource =
  | 'keyword-match'      // deterministic keyword heuristics
  | 'signal-context'     // inferred from active runtime signals
  | 'pattern-heuristic'  // structural pattern in message
  | 'llm-fallback'       // LLM used (confidence was too low)
  | 'default'            // fell through to unknown

// ─── Detected Intent ──────────────────────────────────────────────────────────

export interface DetectedIntent {
  /** Canonical intent identifier */
  name: IntentName
  /** 0–1 confidence score */
  confidence: IntentConfidenceScore
  /** Human-readable confidence tier */
  confidenceLevel: IntentConfidenceLevel
  /** How this intent was detected */
  source: ClassificationSource
  /** Keywords from the input that contributed to this match */
  matchedKeywords: string[]
  /** Runtime signals that boosted or anchored this intent */
  matchedSignals: string[]
  /** Capabilities this intent recommends routing to */
  requiresCapabilities: string[]
}

// ─── Intent Definition (static registry entry) ───────────────────────────────

export interface IntentDefinition {
  name: IntentName
  description: string
  /** Keywords that strongly suggest this intent (Polish + English) */
  keywords: string[]
  /** Runtime signals that make this intent more likely */
  contextualSignals: string[]
  /** Default capabilities associated with this intent */
  capabilities: string[]
  /** Base confidence boost from keyword match (0–1) */
  baseConfidence: IntentConfidenceScore
}

// ─── Classification Warning ───────────────────────────────────────────────────

export type ClassificationWarningType =
  | 'ambiguous_intent'
  | 'low_confidence'
  | 'conflicting_intents'
  | 'unsupported_intent'
  | 'multi_intent_detected'

export interface ClassificationWarning {
  type: ClassificationWarningType
  message: string
  affectedIntents?: IntentName[]
}

// ─── Classification Result ────────────────────────────────────────────────────

export interface ClassificationResult {
  /** All detected intents, sorted by confidence descending */
  intents: DetectedIntent[]
  /** Primary (highest confidence) intent */
  primaryIntent: DetectedIntent
  /** Whether multiple intents were detected */
  isMultiIntent: boolean
  /** Whether the system recommends LLM fallback for disambiguation */
  fallbackNeeded: boolean
  /** All capabilities suggested across all detected intents */
  suggestedCapabilities: string[]
  /** Classification warnings */
  warnings: ClassificationWarning[]
  /** ISO timestamp of classification */
  classifiedAt: string
}

// ─── Classification Input ─────────────────────────────────────────────────────

export interface ClassificationInput {
  /** Raw user message */
  message: string
  /** Optional: current runtime state snapshot (for signal-aware boosting) */
  runtimeContext?: RuntimeContextHint
  /** Optional: recent intent history for conversation continuity */
  recentIntents?: IntentName[]
}

/**
 * Minimal runtime context hint passed into the classifier.
 * Deliberately simple — we don't want the classifier to be a state machine.
 */
export interface RuntimeContextHint {
  hasNutritionToday: boolean
  hasTrainingToday: boolean
  recoveryStatus: 'optimal' | 'good' | 'moderate' | 'poor' | 'unknown' | null
  activeConversationId: string | null
  recentDomains: Array<'nutrition' | 'training' | 'recovery' | 'behavioral' | 'conversation'>
}
