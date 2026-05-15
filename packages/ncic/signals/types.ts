/**
 * NCIC Normalized Signal Models
 *
 * Signals are the normalized, structured representation of raw runtime events.
 * A signal is what the conversational runtime reasons about — not the raw event.
 *
 * Design principles:
 *   - deterministic-first: same input → same signal, always
 *   - lightweight: no LLM involved in normalization
 *   - testable: pure functions, no side effects
 *   - typed: strict TypeScript, no `any`
 *
 * Signal lifecycle:
 *   raw event → normalizer → NormalizedSignal → runtime state update
 */

// ─── Signal Domain ────────────────────────────────────────────────────────────

export type SignalDomain =
  | 'nutrition'
  | 'training'
  | 'recovery'
  | 'behavioral'
  | 'conversation'

// ─── Signal Confidence ────────────────────────────────────────────────────────

export type SignalConfidence = 'high' | 'medium' | 'low' | 'estimated'

// ─── Base Signal ──────────────────────────────────────────────────────────────

export interface BaseNormalizedSignal<
  TDomain extends SignalDomain,
  TData = Record<string, unknown>,
> {
  /** Source event ID this signal was derived from */
  eventId: string
  /** Signal domain */
  domain: TDomain
  /** User this signal belongs to */
  userId: string
  /** ISO date the signal applies to (YYYY-MM-DD) */
  date: string
  /** ISO timestamp of normalization */
  normalizedAt: string
  /** How confident we are in the signal values */
  confidence: SignalConfidence
  /** Where the underlying data came from */
  source: string
  /** Domain-specific signal data */
  data: TData
}

// ─── Nutrition Signal ─────────────────────────────────────────────────────────

export interface NutritionSignalData {
  estimatedCalories: number
  estimatedProteinG: number
  estimatedCarbsG: number
  estimatedFatG: number
  /** Meal count contributing to this signal snapshot */
  mealCount?: number
  /** Whether this is a partial day snapshot (more meals expected) */
  isPartialDay?: boolean
}

export type NutritionSignal = BaseNormalizedSignal<'nutrition', NutritionSignalData>

// ─── Training Signal ──────────────────────────────────────────────────────────

export interface TrainingSignalData {
  durationMinutes: number
  distanceKm?: number
  estimatedCalories?: number
  avgHeartRate?: number
  /** Training Stress Score — primary load metric */
  tss?: number
  sport?: string
  /** Intensity zone classification derived from HR/TSS */
  intensityZone?: 'z1' | 'z2' | 'z3' | 'z4' | 'z5' | 'unknown'
}

export type TrainingSignal = BaseNormalizedSignal<'training', TrainingSignalData>

// ─── Recovery Signal ──────────────────────────────────────────────────────────

export interface RecoverySignalData {
  readinessScore?: number   // 0–100
  hrvMs?: number
  sleepScore?: number       // 0–100
  totalSleepMinutes?: number
  restingHeartRate?: number
  /** Qualitative status derived from above metrics */
  status: 'optimal' | 'good' | 'moderate' | 'poor' | 'unknown'
}

export type RecoverySignal = BaseNormalizedSignal<'recovery', RecoverySignalData>

// ─── Behavioral Signal ────────────────────────────────────────────────────────

export interface BehavioralSignalData {
  mood?: number         // 1–5
  energyLevel?: number  // 1–5
  stressLevel?: number  // 1–5
  /** Derived wellbeing composite: average of available 1–5 scores (inverted stress) */
  wellbeingScore?: number
  tags?: string[]
  hasNotes: boolean
}

export type BehavioralSignal = BaseNormalizedSignal<'behavioral', BehavioralSignalData>

// ─── Conversation Signal ──────────────────────────────────────────────────────

export interface ConversationSignalData {
  conversationId: string
  sessionType: string
  channel: string
  durationSeconds?: number
  messageCount?: number
  resolvedIntent?: string
  /** Whether the session resulted in a state-changing action (logged food, etc.) */
  producedAction: boolean
}

export type ConversationSignal = BaseNormalizedSignal<'conversation', ConversationSignalData>

// ─── Union Signal Type ────────────────────────────────────────────────────────

export type NormalizedSignal =
  | NutritionSignal
  | TrainingSignal
  | RecoverySignal
  | BehavioralSignal
  | ConversationSignal
