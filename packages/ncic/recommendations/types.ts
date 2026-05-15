/**
 * NCIC Recommendation Types — ETAP 5.4
 *
 * Canonical model for the Recommendation & Intervention Runtime.
 *
 * Separation of concerns:
 *   - Recommendation Engine: generates possible recommendations from signals
 *   - Intervention Runtime: decides WHAT to show, WHEN, HOW (uses these types)
 *
 * No LLM involved in scoring or ranking. Deterministic-first.
 */

import type { IntentName } from '../intents/types'
import type { EpisodicEventType } from '../memory/types'

// ─── Priority ─────────────────────────────────────────────────────────────────

/**
 * Recommendation urgency tier.
 * Runtime uses this to decide interruption level and display mode.
 */
export type RecommendationPriority =
  | 'critical'   // Safety concern — always display (overtraining + poor recovery)
  | 'high'       // Important behavioral nudge — display proactively
  | 'medium'     // Helpful context — display if not fatiguing user
  | 'low'        // Background enrichment — show on dashboard only
  | 'silent'     // Available but suppressed — exists for analytics only

// ─── Domain ───────────────────────────────────────────────────────────────────

export type RecommendationDomain =
  | 'nutrition'
  | 'training'
  | 'recovery'
  | 'behavioral'
  | 'coaching'
  | 'system'

// ─── Recommendation Type ─────────────────────────────────────────────────────

/**
 * 22 canonical recommendation types.
 * Each maps to exactly one rule in the engine.
 */
export type RecommendationTypeName =
  | 'low_protein_intake'
  | 'calorie_deficit_too_high'
  | 'missed_meals'
  | 'inconsistent_logging'
  | 'hydration_missing'
  | 'poor_recovery_warning'
  | 'overtraining_alert'
  | 'high_training_load_notice'
  | 'training_streak_positive'
  | 'workout_consistency_high'
  | 'low_sleep_warning'
  | 'high_stress_hard_training'
  | 'high_atl_warning'
  | 'behavioral_fatigue'
  | 'energy_low_warning'
  | 'long_inactivity_nudge'
  | 'recovery_improving_positive'
  | 'positive_momentum_streak'
  | 'calorie_deficit_streak_notice'
  | 'nutrition_goal_met_positive'
  | 'unresolved_topic_followup'
  | 'first_session_welcome'

// ─── Canonical Recommendation ─────────────────────────────────────────────────

/**
 * A single generated recommendation from the engine.
 * Immutable after generation. The intervention runtime uses this to build
 * RuntimeIntervention objects.
 */
export interface CanonicalRecommendation {
  /** Unique ID for this recommendation instance */
  id: string
  /** Recommendation type — one per rule */
  type: RecommendationTypeName
  /** Priority tier — set by the rule, may be boosted by context */
  priority: RecommendationPriority
  /** Domain this recommendation belongs to */
  domain: RecommendationDomain
  /** Short title for display */
  title: string
  /** Explanation of why this recommendation is being surfaced */
  explanation: string
  /** Concrete action the user can take */
  suggestedAction: string
  /**
   * 0–1 confidence score for this recommendation.
   * Higher = signal evidence is stronger.
   */
  confidence: number
  /** Urgency score 0–1. Drives timing in intervention runtime. */
  urgency: number
  /**
   * Expected impact score 0–1.
   * Represents how much acting on this improves outcomes.
   */
  impact: number
  /** ISO timestamp of generation */
  generatedAt: string
  /**
   * ISO timestamp of expiry.
   * After this point the recommendation should not be surfaced.
   */
  expiresAt: string
  /**
   * Signal keys that contributed to this recommendation.
   * Enables explanation and debugging.
   */
  sourceSignals: string[]
  /** Intent this recommendation relates to (if any) */
  relatedIntent: IntentName | null
  /** Episodic event types that contributed to this recommendation */
  relatedMemory: EpisodicEventType[]
  /**
   * Composite score: urgency * confidence * impact (0–1).
   * Used by intervention runtime for ranking.
   */
  score: number
}

// ─── Engine Input ─────────────────────────────────────────────────────────────

/**
 * Input to the recommendation engine.
 * Everything the engine needs to evaluate all rules deterministically.
 */
export interface RecommendationEngineInput {
  userId: string
  date: string
  runtimeState: import('../runtime/state').RuntimeContextSnapshot
  /** Current user's daily targets (optional — rules degrade gracefully without) */
  targets?: UserTargets
  /** Memory signals from the memory layer */
  memory: import('../memory/types').MemorySignals | null
  /** Currently classified intent (from ongoing conversation) */
  currentIntent: IntentName | null
  /** Recent episodic events for cooldown checks */
  recentEvents: import('../memory/types').EpisodicEvent[]
}

export interface UserTargets {
  dailyCalorieTarget?: number
  dailyProteinTargetG?: number
  dailyTrainingMinutes?: number
}

// ─── Recommendation Rule ─────────────────────────────────────────────────────

/**
 * Internal rule definition. Not exported from index — engine-internal only.
 * Each rule is a pure function: given input, returns a recommendation or null.
 */
export interface RecommendationRule {
  /** Must match a RecommendationTypeName */
  type: RecommendationTypeName
  /** Human-readable description of what the rule detects */
  description: string
  /** Cooldown in hours — suppressed if same type was generated within this window */
  cooldownHours: number
  /** Evaluate the rule. Returns recommendation data or null if condition not met. */
  evaluate(input: RecommendationEngineInput): RecommendationRuleResult | null
}

/**
 * The raw output of a rule's evaluate() function.
 * The engine wraps this into a CanonicalRecommendation.
 */
export interface RecommendationRuleResult {
  priority: RecommendationPriority
  domain: RecommendationDomain
  title: string
  explanation: string
  suggestedAction: string
  confidence: number
  urgency: number
  impact: number
  expiresInHours: number
  sourceSignals: string[]
  relatedIntent: IntentName | null
  relatedMemory: EpisodicEventType[]
}
