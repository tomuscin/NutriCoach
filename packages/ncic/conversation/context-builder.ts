/**
 * NCIC Conversation Context Builder
 *
 * Deterministically assembles ConversationContext from:
 *   - userId + date
 *   - ClassificationResult (from intent classifier)
 *   - RuntimeContextSnapshot (current runtime state)
 *   - optional conversation history
 *
 * NO LLM. NO IO. NO side effects.
 * Same inputs → same output, always.
 *
 * This is the bridge between runtime signals and response planning.
 */

import type { RuntimeContextSnapshot } from '../runtime/state'
import type { ClassificationResult } from '../intents/types'
import type { CapabilityId } from '../intents/capabilities'
import { CAPABILITY_REGISTRY } from '../intents/capabilities'
import type {
  ConversationContext,
  RuntimeSignalSummary,
  ResponseMode,
  ActiveDomain,
  ContinuityHint,
  RiskFlag,
} from './types'
import { INTENT_NAMES } from '../intents/types'

// ─── Public API ───────────────────────────────────────────────────────────────

export interface BuildContextInput {
  userId: string
  date: string
  message: string
  classification: ClassificationResult
  snapshot: RuntimeContextSnapshot
  /** ISO timestamp of last interaction (for continuity detection) */
  lastInteractionAt?: string | null
  /** Optional memory signals from ETAP 5.3 memory layer */
  memorySignals?: import('../memory/types').MemorySignals
}

/**
 * Assemble a ConversationContext from runtime state and classification result.
 *
 * @example
 * const ctx = buildConversationContext({
 *   userId: 'u1',
 *   date: '2026-05-14',
 *   message: 'Zjadłem burgera',
 *   classification,
 *   snapshot,
 * })
 */
export function buildConversationContext(input: BuildContextInput): ConversationContext {
  const { userId, date, classification, snapshot, lastInteractionAt, memorySignals } = input

  const signals = buildRuntimeSignalSummary(snapshot)
  const activeDomains = deriveActiveDomains(snapshot)
  const riskFlags = deriveRiskFlags(classification, signals)
  const continuityHints = buildContinuityHints(signals, lastInteractionAt)
  const responseMode = selectResponseMode(classification, signals, riskFlags)

  const capabilityIds = classification.suggestedCapabilities as CapabilityId[]
  const needsLlm = capabilityIds.some((id) => CAPABILITY_REGISTRY[id]?.requiresLlm ?? false)

  return {
    userId,
    timestamp: new Date().toISOString(),
    date,
    intent: classification.primaryIntent,
    classification,
    confidence: classification.primaryIntent.confidenceLevel,
    activeDomains,
    runtimeSnapshot: snapshot,
    runtimeSignals: signals,
    responseMode,
    suggestedCapabilities: capabilityIds,
    requiresLlm: needsLlm,
    continuityHints,
    riskFlags,
    memorySignals,
  }
}

// ─── Runtime Signal Summary ───────────────────────────────────────────────────

/**
 * Derive a compact, planner-friendly signal summary from the runtime snapshot.
 */
export function buildRuntimeSignalSummary(snapshot: RuntimeContextSnapshot): RuntimeSignalSummary {
  const n = snapshot.nutrition
  const t = snapshot.training
  const r = snapshot.recovery
  const b = snapshot.behavioral
  const c = snapshot.conversation

  // Determine nutrition completeness:
  // complete if > 500 kcal logged and remaining calories are not deeply negative
  const caloriesLogged = n?.estimatedCalories ?? null
  const caloriesRemaining = n?.remainingCalories ?? null
  const dailyTarget = n?.dailyCalorieTarget ?? null
  const nutritionComplete =
    n !== null &&
    caloriesLogged !== null &&
    caloriesLogged > 500 &&
    (dailyTarget === null || caloriesLogged >= dailyTarget * 0.8)

  return {
    // Nutrition
    hasNutritionToday: n !== null,
    caloriesLogged,
    caloriesRemaining,
    nutritionComplete,

    // Training
    hasTrainingToday: t !== null,
    trainingDurationMinutes: t?.durationMinutes ?? null,
    trainingTss: t?.tss ?? null,
    trainingZone: t?.intensityZone ?? null,

    // Recovery
    recoveryStatus: r?.status ?? null,
    recoveryScore: r?.readinessScore ?? null,
    sleepHours: r?.totalSleepMinutes != null ? Math.round((r.totalSleepMinutes / 60) * 10) / 10 : null,

    // Behavioral
    hasBehavioralData: b !== null,
    moodScore: b?.mood ?? null,
    energyScore: b?.energyLevel ?? null,
    stressScore: b?.stressLevel ?? null,

    // Conversation
    isActiveConversation: c?.activeConversationId != null,
    activeConversationId: c?.activeConversationId ?? null,
  }
}

// ─── Active Domain Derivation ─────────────────────────────────────────────────

function deriveActiveDomains(snapshot: RuntimeContextSnapshot): ActiveDomain[] {
  const domains: ActiveDomain[] = []
  if (snapshot.nutrition) domains.push('nutrition')
  if (snapshot.training) domains.push('training')
  if (snapshot.recovery) domains.push('recovery')
  if (snapshot.behavioral) domains.push('behavioral')
  if (snapshot.conversation?.activeConversationId) domains.push('conversation')
  return domains
}

// ─── Risk Flag Derivation ─────────────────────────────────────────────────────

/**
 * Derive risk flags from classification result + runtime signals.
 * These are deterministic — no probabilistic inference.
 */
export function deriveRiskFlags(
  classification: ClassificationResult,
  signals: RuntimeSignalSummary,
): RiskFlag[] {
  const flags: RiskFlag[] = []

  // Unknown intent → can't give confident response
  if (
    classification.primaryIntent.name === INTENT_NAMES.UNKNOWN ||
    classification.fallbackNeeded
  ) {
    flags.push('unknown_intent')
  }

  // Low energy: energy level <= 2 out of 5, or very poor recovery with high TSS
  if (
    (signals.energyScore !== null && signals.energyScore <= 2) ||
    (signals.recoveryStatus === 'poor' && signals.trainingTss !== null && signals.trainingTss > 80)
  ) {
    flags.push('low_energy')
  }

  // Overtraining: very high TSS (> 120) with poor recovery
  if (
    signals.trainingTss !== null &&
    signals.trainingTss > 120 &&
    (signals.recoveryStatus === 'poor' || signals.recoveryStatus === 'moderate')
  ) {
    flags.push('overtraining')
  }

  // High stress: stress level >= 4 out of 5
  if (signals.stressScore !== null && signals.stressScore >= 4) {
    flags.push('high_stress')
  }

  // Incomplete context: no runtime data, low confidence, non-casual intent
  if (
    classification.primaryIntent.confidenceLevel === 'low' &&
    classification.primaryIntent.name !== INTENT_NAMES.CASUAL_CONVERSATION &&
    classification.primaryIntent.name !== INTENT_NAMES.UNKNOWN
  ) {
    flags.push('incomplete_context')
  }

  return [...new Set(flags)] // deduplicate
}

// ─── Continuity Hints ─────────────────────────────────────────────────────────

const DAYS_GAP_THRESHOLD = 2 // days since last interaction before noting resumption

/**
 * Generate human-readable continuity hints from runtime signals.
 * These are anchors for the future memory engine — not user-facing strings.
 */
export function buildContinuityHints(
  signals: RuntimeSignalSummary,
  lastInteractionAt: string | null | undefined,
): ContinuityHint[] {
  const hints: ContinuityHint[] = []

  if (signals.hasTrainingToday) {
    const dur = signals.trainingDurationMinutes
    hints.push(dur ? `user logged training today (${dur} min)` : 'user logged training today')
  }

  if (signals.hasNutritionToday && !signals.nutritionComplete) {
    hints.push('nutrition incomplete today')
  }

  if (signals.hasNutritionToday && signals.nutritionComplete) {
    hints.push('nutrition complete today')
  }

  if (signals.recoveryStatus === 'poor') {
    hints.push('high fatigue detected')
  } else if (signals.recoveryStatus === 'optimal') {
    hints.push('recovery is optimal today')
  }

  if (signals.stressScore !== null && signals.stressScore >= 4) {
    hints.push('high stress detected')
  }

  if (signals.energyScore !== null && signals.energyScore <= 2) {
    hints.push('low energy reported')
  }

  if (lastInteractionAt) {
    const last = new Date(lastInteractionAt)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays >= DAYS_GAP_THRESHOLD) {
      hints.push(`conversation resumed after ${diffDays} day${diffDays === 1 ? '' : 's'}`)
    }
  }

  if (signals.isActiveConversation) {
    hints.push('active conversation session')
  }

  if (!signals.hasNutritionToday && !signals.hasTrainingToday) {
    hints.push('no data logged today')
  }

  return hints
}

// ─── Response Mode Selection ──────────────────────────────────────────────────

/**
 * Select the appropriate response mode from intent + runtime signals + risk flags.
 *
 * Priority order:
 *   1. Unknown intent / low confidence → clarification
 *   2. High stress / overtraining → reflective
 *   3. Intent-driven mode (see map below)
 *   4. Default: coaching
 */
export function selectResponseMode(
  classification: ClassificationResult,
  signals: RuntimeSignalSummary,
  riskFlags: RiskFlag[],
): ResponseMode {
  const intent = classification.primaryIntent.name

  // Ambiguous input always needs clarification first
  if (
    intent === INTENT_NAMES.UNKNOWN ||
    classification.fallbackNeeded ||
    classification.primaryIntent.confidenceLevel === 'low'
  ) {
    return 'clarification'
  }

  // Stress / overtraining triggers reflective mode regardless of intent
  if (riskFlags.includes('high_stress') || riskFlags.includes('overtraining')) {
    return 'reflective'
  }

  // Intent-to-mode mapping
  const intentModeMap: Partial<Record<string, ResponseMode>> = {
    food_log: signals.nutritionComplete ? 'analytical' : 'coaching',
    meal_analysis: 'analytical',
    training_reference: signals.recoveryStatus === 'poor' ? 'reflective' : 'analytical',
    recovery_reflection: 'reflective',
    behavioral_reflection: 'reflective',
    goal_update: 'coaching',
    progress_check: 'analytical',
    coach_question: 'educational',
    casual_conversation: 'motivational',
  }

  return intentModeMap[intent] ?? 'coaching'
}
