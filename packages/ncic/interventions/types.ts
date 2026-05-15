/**
 * NCIC Intervention Types — ETAP 5.4
 *
 * Types for the Intervention Runtime layer.
 * Separate from Recommendation types — the intervention runtime CONSUMES
 * recommendations and decides what to surface, when, and how.
 */

import type { CanonicalRecommendation, RecommendationPriority } from '../recommendations/types'

// ─── Display Mode ─────────────────────────────────────────────────────────────

/**
 * How an intervention should be presented to the user.
 *
 * - inline:         Embedded naturally in the conversation response
 * - proactive:      Surfaced before the user asks — coach-initiated
 * - silent:         Available but not shown (logged for analytics/personalization)
 * - dashboard-only: Shown in dashboard summary, not in chat
 */
export type DisplayMode = 'inline' | 'proactive' | 'silent' | 'dashboard-only'

// ─── Interruption Level ───────────────────────────────────────────────────────

/**
 * How disruptive is this intervention to the user's current flow.
 *
 * - none:     Not shown at all in this session
 * - passive:  Available if user navigates to it
 * - soft:     Shown at a natural break point
 * - assertive: Shown prominently (high priority recommendations)
 * - urgent:   Shown immediately, overrides current flow
 */
export type InterruptionLevel = 'none' | 'passive' | 'soft' | 'assertive' | 'urgent'

// ─── Intervention Timing ─────────────────────────────────────────────────────

/**
 * When the intervention should be delivered relative to the current moment.
 */
export type InterventionTiming =
  | 'now'           // Surface immediately
  | 'end-of-turn'   // At the end of the current conversation turn
  | 'next-session'  // At the start of the next conversation
  | 'deferred'      // Within the next N hours
  | 'never'         // Suppressed — do not surface

// ─── Runtime Intervention ─────────────────────────────────────────────────────

/**
 * The output of the Intervention Runtime.
 * One RuntimeIntervention per selected recommendation.
 *
 * The intervention runtime generates a RANKED LIST of these.
 * Only interventions with shouldDisplayNow=true should be shown.
 */
export interface RuntimeIntervention {
  /** Source recommendation */
  recommendation: CanonicalRecommendation
  /** Final priority (may be boosted from recommendation.priority) */
  priority: RecommendationPriority
  /** How to display this intervention */
  displayMode: DisplayMode
  /** When to surface this intervention */
  timing: InterventionTiming
  /** How disruptive this is to the current user experience */
  interruptionLevel: InterruptionLevel
  /** Human-readable reasoning for why this was selected */
  reasoning: string
  /** Whether to display this in the current turn */
  shouldDisplayNow: boolean
  /** Rank within the current output set (1 = highest priority) */
  rank: number
}

// ─── Intervention Context ─────────────────────────────────────────────────────

/**
 * Context the intervention runtime needs to make decisions.
 * Provided by the caller (conversation turn processor, proactive scheduler, etc.)
 */
export interface InterventionContext {
  userId: string
  /** ISO date */
  date: string
  /**
   * Maximum number of interventions to surface in this turn.
   * Anti-annoyance: never show more than this many.
   */
  maxInterventions?: number
  /**
   * Whether this is a proactive check (no user message) or
   * a reactive turn (user sent a message).
   */
  mode: 'reactive' | 'proactive'
  /**
   * If reactive: the intent of the current user message.
   * Used to de-prioritise interventions unrelated to current context.
   */
  currentIntent?: import('../intents/types').IntentName | null
  /** Anti-annoyance state for this user */
  annoyanceState: import('./anti-annoyance').AntiAnnoyanceState
}

// ─── Intervention Runtime Output ──────────────────────────────────────────────

export interface InterventionRuntimeOutput {
  /** All interventions that were considered (visible + suppressed) */
  allInterventions: RuntimeIntervention[]
  /** Interventions to surface now (shouldDisplayNow=true) */
  activeInterventions: RuntimeIntervention[]
  /** Interventions that were suppressed and why */
  suppressedCount: number
  /** Whether the anti-annoyance system reduced the output */
  annoyanceFiltered: boolean
  /** ISO timestamp */
  processedAt: string
}
