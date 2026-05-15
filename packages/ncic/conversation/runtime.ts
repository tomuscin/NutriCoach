/**
 * NCIC Conversation Runtime Pipeline
 *
 * The main orchestration entry point for a single conversational turn.
 *
 * Pipeline:
 *   message
 *     ↓ classifyIntent()           [intents layer]
 *     ↓ getRuntimeState()          [runtime layer — caller provides]
 *     ↓ buildConversationContext() [conversation layer]
 *     ↓ planConversationalResponse()
 *     ↓ ConversationTurnResult
 *
 * Design rules:
 *   - Pure orchestration — no IO, no side effects
 *   - Caller is responsible for providing runtime snapshot
 *   - Caller is responsible for emitting events (ConversationStartedEvent etc.)
 *   - Deterministic: same inputs → same outputs
 *   - LLM layer is downstream — this pipeline decides WHAT, not HOW
 *
 * This is the v1 conversational runtime. It intentionally omits:
 *   - LLM calls
 *   - Vector memory
 *   - Tool calling
 *   - Autonomous loops
 */

import { classifyIntent } from '../intents/classifier'
import type { IntentName } from '../intents/types'
import type { RuntimeContextSnapshot } from '../runtime/state'
import { buildConversationContext, type BuildContextInput } from './context-builder'
import { planConversationalResponse } from './response-planner'
import type { ConversationTurnResult, ConversationContext, ResponsePlan } from './types'

// ─── Pipeline Input ───────────────────────────────────────────────────────────

export interface ProcessConversationTurnInput {
  /** The user's message */
  message: string
  /** User identifier */
  userId: string
  /** Today's date (ISO date string, e.g. '2026-05-14') */
  date: string
  /** Current runtime context snapshot — caller provides this */
  snapshot: RuntimeContextSnapshot
  /** Intent names from recent turns (for continuity boost) */
  recentIntents?: IntentName[]
  /** ISO timestamp of last conversation interaction (for gap detection) */
  lastInteractionAt?: string | null
  /** Memory signals from the memory layer — for continuity hints in context */
  memorySignals?: import('../memory/types').MemorySignals
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────

/**
 * Process a single conversational turn through the full runtime pipeline.
 *
 * Given a user message and the current runtime state, returns a complete
 * ConversationTurnResult with context assembly and a response plan.
 *
 * @example
 * const snapshot = getRuntimeState(userId, today)
 * const result = processConversationTurn({
 *   message: 'Zjadłem burgera i byłem na rowerze',
 *   userId: 'u1',
 *   date: '2026-05-14',
 *   snapshot,
 * })
 * // result.context.responseMode → 'analytical'
 * // result.plan.responseStrategy → 'summarize'
 * // result.plan.capabilitiesToInvoke → ['nutrition.ingest', 'training.contextualize', 'conversation.respond']
 */
export function processConversationTurn(input: ProcessConversationTurnInput): ConversationTurnResult {
  const { message, userId, date, snapshot, recentIntents, lastInteractionAt, memorySignals } = input

  // Step 1: Classify intent
  const runtimeContext = {
    hasNutritionToday: snapshot.nutrition !== null,
    hasTrainingToday: snapshot.training !== null,
    recoveryStatus: snapshot.recovery?.status ?? null,
    activeConversationId: snapshot.conversation?.activeConversationId ?? null,
    recentDomains: deriveRecentDomains(snapshot),
  }

  const classification = classifyIntent({ message, runtimeContext, recentIntents })

  // Step 2: Build conversation context
  const contextInput: BuildContextInput = {
    userId,
    date,
    message,
    classification,
    snapshot,
    lastInteractionAt,
    memorySignals,
  }

  const context = buildConversationContext(contextInput)

  // Step 3: Plan response
  const plan = planConversationalResponse(context)

  if (process.env.NODE_ENV !== 'production') {
    console.info(
      `[conv-runtime] userId="${userId}" intent="${context.intent.name}" ` +
      `mode="${context.responseMode}" strategy="${plan.responseStrategy}" ` +
      `priority="${plan.interventionPriority}" ` +
      `caps=[${plan.capabilitiesToInvoke.join(',')}] ` +
      `risks=[${context.riskFlags.join(',')}]`,
    )
  }

  return {
    context,
    plan,
    message,
    processedAt: new Date().toISOString(),
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveRecentDomains(
  snapshot: RuntimeContextSnapshot,
): Array<'nutrition' | 'training' | 'recovery' | 'behavioral' | 'conversation'> {
  const domains: Array<'nutrition' | 'training' | 'recovery' | 'behavioral' | 'conversation'> = []
  if (snapshot.nutrition) domains.push('nutrition')
  if (snapshot.training) domains.push('training')
  if (snapshot.recovery) domains.push('recovery')
  if (snapshot.behavioral) domains.push('behavioral')
  if (snapshot.conversation?.activeConversationId) domains.push('conversation')
  return domains
}

// ─── Convenience Re-exports ───────────────────────────────────────────────────
// These allow consumers to import everything from the conversation layer

export type { ConversationTurnResult, ConversationContext, ResponsePlan }
