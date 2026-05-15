/**
 * NCIC Runtime Intent Integration
 *
 * Connects the intent classification layer to the NCIC runtime.
 *
 * Provides:
 *   - buildRuntimeContextHint(): derives RuntimeContextHint from RuntimeContextSnapshot
 *   - processConversationalTurn(): full classify → emit → react pipeline
 *
 * Flow:
 *   user message
 *     ↓ buildRuntimeContextHint(snapshot)
 *     ↓ classifyIntent({ message, runtimeContext, recentIntents })
 *     ↓ emit ConversationStartedEvent (if no active conversation)
 *     ↓ return ClassificationResult + resolved capabilities
 *
 * This is NOT an orchestrator. It's a wiring layer.
 * Actual capability fulfillment happens in the app layer (ETAP 5+).
 */

import type { RuntimeContextSnapshot } from './state'
import type { ClassificationResult, RuntimeContextHint, IntentName } from '../intents/types'
import { classifyIntent } from '../intents/classifier'
import { resolveCapabilities, requiresLlm } from '../intents/capabilities'
import type { CapabilityId } from '../intents/capabilities'

// ─── Context Hint Builder ─────────────────────────────────────────────────────

/**
 * Derive a RuntimeContextHint from the current runtime state snapshot.
 * This is the bridge between the runtime state and the intent classifier.
 */
export function buildRuntimeContextHint(
  snapshot: RuntimeContextSnapshot,
): RuntimeContextHint {
  const recentDomains: RuntimeContextHint['recentDomains'] = []

  if (snapshot.nutrition) recentDomains.push('nutrition')
  if (snapshot.training) recentDomains.push('training')
  if (snapshot.recovery) recentDomains.push('recovery')
  if (snapshot.behavioral) recentDomains.push('behavioral')
  if (snapshot.conversation?.activeConversationId) recentDomains.push('conversation')

  return {
    hasNutritionToday: snapshot.nutrition !== null,
    hasTrainingToday: snapshot.training !== null,
    recoveryStatus: snapshot.recovery?.status ?? null,
    activeConversationId: snapshot.conversation?.activeConversationId ?? null,
    recentDomains,
  }
}

// ─── Conversational Turn Result ───────────────────────────────────────────────

export interface ConversationalTurnResult {
  /** Full classification result */
  classification: ClassificationResult
  /** Resolved capability IDs for this turn */
  capabilities: CapabilityId[]
  /** Whether any resolved capability needs LLM */
  requiresLlm: boolean
  /** The runtime context snapshot used for classification */
  snapshotUsed: RuntimeContextSnapshot
}

// ─── Process Conversational Turn ─────────────────────────────────────────────

/**
 * Process a single conversational turn.
 *
 * Given a user message and the current runtime snapshot:
 *   1. Build runtime context hint from snapshot
 *   2. Classify intent (deterministic heuristics)
 *   3. Resolve capabilities from detected intents
 *   4. Return full turn result
 *
 * Pure function — no side effects, no event emission.
 * Event emission (ConversationStartedEvent etc.) is the caller's responsibility.
 *
 * @example
 * const snapshot = getRuntimeState(userId, today)
 * const turn = processConversationalTurn("Zjadłem burgera i byłem na rowerze", snapshot)
 * // turn.classification.intents → [food_log, training_reference]
 * // turn.capabilities → ['nutrition.ingest', 'training.contextualize']
 * // turn.requiresLlm → false
 */
export function processConversationalTurn(
  message: string,
  snapshot: RuntimeContextSnapshot,
  recentIntents?: IntentName[],
): ConversationalTurnResult {
  const runtimeContext = buildRuntimeContextHint(snapshot)

  const classification = classifyIntent({
    message,
    runtimeContext,
    recentIntents,
  })

  const intentNames = classification.intents.map((i) => i.name)
  const capabilities = resolveCapabilities(intentNames)
  const needsLlm = requiresLlm(capabilities)

  if (process.env.NODE_ENV !== 'production') {
    console.info(
      `[runtime-intent] userId="${snapshot.userId}" primary="${classification.primaryIntent.name}" ` +
      `capabilities=[${capabilities.join(',')}] llm=${needsLlm} multi=${classification.isMultiIntent}`,
    )
  }

  return {
    classification,
    capabilities,
    requiresLlm: needsLlm,
    snapshotUsed: snapshot,
  }
}
