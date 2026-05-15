/**
 * NCIC Conversation Runtime Types
 *
 * Defines the data models for the conversational runtime pipeline (ETAP 5.2).
 *
 * Pipeline:
 *   message
 *     → classifyIntent()
 *     → getRuntimeState()
 *     → buildConversationContext()
 *     → planConversationalResponse()
 *     → ConversationTurnResult
 *
 * All types are pure data — no LLM, no IO, no side effects.
 * Deterministic-first. Composable. Testable.
 */

import type { ClassificationResult, DetectedIntent } from '../intents/types'
import type { CapabilityId } from '../intents/capabilities'
import type { RuntimeContextSnapshot } from '../runtime/state'
import type { MemorySignals } from '../memory/types'

// ─── Response Mode ────────────────────────────────────────────────────────────

/**
 * How the runtime should frame its response.
 *
 * Driven by intent + runtime state. NOT driven by user preference (yet).
 */
export type ResponseMode =
  | 'coaching'       // Directive: goals, plans, improvements
  | 'analytical'     // Data-driven: numbers, trends, breakdown
  | 'reflective'     // Exploratory: recovery, emotions, fatigue
  | 'educational'    // Explanatory: knowledge questions
  | 'motivational'   // Encouraging: positive reinforcement
  | 'clarification'  // Disambiguation: ask for more info

// ─── Risk Flags ───────────────────────────────────────────────────────────────

/**
 * Signals that the runtime detected something worth addressing in the response.
 * Used to shape tone, urgency, and intervention priority.
 */
export type RiskFlag =
  | 'low_energy'           // User expressed low energy / fatigue
  | 'overtraining'         // TSS spike or training load too high
  | 'incomplete_context'   // Not enough data to give confident response
  | 'high_stress'          // Behavioral signals show stress
  | 'unknown_intent'       // Could not classify with confidence

// ─── Continuity Hints ─────────────────────────────────────────────────────────

/**
 * Human-readable hints about the conversation state and user history.
 * These are future-ready anchors for the memory engine.
 *
 * Examples:
 *   "user logged training today"
 *   "nutrition incomplete today"
 *   "high fatigue detected"
 *   "conversation resumed after 3 days"
 */
export type ContinuityHint = string

// ─── Active Domain ────────────────────────────────────────────────────────────

export type ActiveDomain =
  | 'nutrition'
  | 'training'
  | 'recovery'
  | 'behavioral'
  | 'goals'
  | 'conversation'

// ─── Conversation Context ─────────────────────────────────────────────────────

/**
 * The assembled context for a single conversational turn.
 * Built deterministically from runtime state + intent classification.
 *
 * This is the single source of truth for the response planner.
 * No LLM inference happens here — only deterministic assembly.
 */
export interface ConversationContext {
  /** User identifier */
  userId: string
  /** ISO timestamp of when this context was assembled */
  timestamp: string
  /** Today's date (ISO date string) */
  date: string

  // ── Intent ──────────────────────────────────────────────────────────────────
  /** Primary classified intent */
  intent: DetectedIntent
  /** Full classification result (includes multi-intent, warnings, etc.) */
  classification: ClassificationResult
  /** Confidence tier of the primary intent */
  confidence: 'high' | 'medium' | 'low'

  // ── Runtime ─────────────────────────────────────────────────────────────────
  /** Domains with active runtime signals today */
  activeDomains: ActiveDomain[]
  /** Raw runtime snapshot used for assembly */
  runtimeSnapshot: RuntimeContextSnapshot

  // ── Runtime Signal Summary ───────────────────────────────────────────────────
  /**
   * Structured signal summary derived from runtime state.
   * Used by planner to make deterministic decisions.
   */
  runtimeSignals: RuntimeSignalSummary

  // ── Response Guidance ────────────────────────────────────────────────────────
  /** How the runtime should frame its response */
  responseMode: ResponseMode
  /** Capabilities that should be activated for this turn */
  suggestedCapabilities: CapabilityId[]
  /** Whether any capability requires LLM involvement */
  requiresLlm: boolean

  // ── Continuity & Risk ────────────────────────────────────────────────────────
  /** Human-readable continuity hints (future: feed to memory engine) */
  continuityHints: ContinuityHint[]
  /** Risk signals detected this turn */
  riskFlags: RiskFlag[]

  // ── Memory Layer (ETAP 5.3) ───────────────────────────────────────────────────
  /**
   * Memory signals from the conversation memory layer.
   * Undefined if memory layer is not wired (backward compatible).
   */
  memorySignals?: MemorySignals
}

// ─── Runtime Signal Summary ───────────────────────────────────────────────────

/**
 * Condensed, planner-friendly view of the runtime state.
 * Derived deterministically from RuntimeContextSnapshot.
 */
export interface RuntimeSignalSummary {
  // Nutrition
  hasNutritionToday: boolean
  caloriesLogged: number | null
  caloriesRemaining: number | null
  nutritionComplete: boolean

  // Training
  hasTrainingToday: boolean
  trainingDurationMinutes: number | null
  trainingTss: number | null
  trainingZone: string | null

  // Recovery
  recoveryStatus: 'optimal' | 'good' | 'moderate' | 'poor' | null
  recoveryScore: number | null
  sleepHours: number | null

  // Behavioral
  hasBehavioralData: boolean
  moodScore: number | null
  energyScore: number | null
  stressScore: number | null

  // Conversation
  isActiveConversation: boolean
  activeConversationId: string | null
}

// ─── Response Strategy ────────────────────────────────────────────────────────

export type ResponseStrategy =
  | 'ask'        // Ask a clarifying or follow-up question
  | 'coach'      // Provide directive coaching advice
  | 'summarize'  // Summarize recent data/progress
  | 'clarify'    // Ask user to clarify ambiguous input
  | 'motivate'   // Provide encouragement or positive reinforcement
  | 'educate'    // Explain a concept, answer a knowledge question

// ─── Intervention Priority ────────────────────────────────────────────────────

export type InterventionPriority = 'critical' | 'high' | 'normal' | 'low' | 'none'

// ─── Response Plan ────────────────────────────────────────────────────────────

/**
 * The output of the response planner.
 * Tells the LLM layer (or the deterministic responder) what to do next.
 *
 * No prompt templates. No generated text. Just a plan.
 * Rule-based. No LLM in the planner itself.
 */
export interface ResponsePlan {
  /** What the response should ultimately accomplish */
  primaryGoal: string

  /** The communication tone */
  tone: ResponseMode

  /** The structural approach the response should take */
  responseStrategy: ResponseStrategy

  /** Capabilities the response will invoke (in order) */
  capabilitiesToInvoke: CapabilityId[]

  /**
   * Questions to follow up with (for ask/clarify strategy).
   * Used by the LLM layer as suggestions — not hard constraints.
   */
  followUpQuestions: string[]

  /** How urgently the system should intervene vs. let user lead */
  interventionPriority: InterventionPriority

  /** Reason this plan was selected (for debug/trace) */
  planningRationale: string
}

// ─── Conversation Turn Result ─────────────────────────────────────────────────

/**
 * The full output of processConversationTurn().
 * The pipeline's final product — handed to the LLM layer or response handler.
 */
export interface ConversationTurnResult {
  /** Assembled conversation context */
  context: ConversationContext
  /** Response plan from the planner */
  plan: ResponsePlan
  /** Original user message */
  message: string
  /** ISO timestamp of processing */
  processedAt: string
}
